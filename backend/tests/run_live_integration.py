import asyncio
import os
import sys
from typing import Any
from pathlib import Path

import httpx
from redis.asyncio import Redis
from sqlalchemy import text

# Allow direct execution from backend/tests.
sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.core.config import get_settings
from app.db.session import engine


def _is_placeholder(value: str | None) -> bool:
    if value is None:
        return True
    normalized = value.strip().lower()
    if not normalized:
        return True
    placeholders = {
        "your-tenant.auth0.com",
        "your_client_id",
        "your_client_secret",
        "https://secureagentvault/api",
        "replace_with_base64_key",
        "replace_with_base64_or_raw_key",
        "replace_with_strong_random_value",
    }
    return normalized in placeholders


def _required_env_failures(settings) -> list[str]:
    failures: list[str] = []
    checks = {
        "AUTH0_DOMAIN": settings.auth0_domain,
        "AUTH0_CLIENT_ID": settings.auth0_client_id,
        "AUTH0_CLIENT_SECRET": settings.auth0_client_secret,
        "ENCRYPTION_KEY": settings.encryption_key,
        "JWT_SECRET_KEY": settings.jwt_secret_key,
    }
    for key, value in checks.items():
        if _is_placeholder(value):
            failures.append(key)
    if not settings.auth0_audience or not settings.auth0_audience.strip():
        failures.append("AUTH0_AUDIENCE")
    return failures


async def _check_db() -> tuple[bool, str]:
    try:
        async with engine.begin() as conn:
            await conn.execute(text("select 1"))
        return True, "ok"
    except Exception as exc:
        return False, f"{type(exc).__name__}: {exc}"


async def _check_redis(settings) -> tuple[bool, str]:
    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    try:
        await redis.ping()
        return True, "ok"
    except Exception as exc:
        return False, f"{type(exc).__name__}: {exc}"
    finally:
        if hasattr(redis, "aclose"):
            await redis.aclose()
        else:
            await redis.close()


async def _check_backend(api_base: str) -> tuple[bool, str]:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{api_base}/health")
        if response.status_code != 200:
            return False, f"status_{response.status_code}"
        return True, "ok"
    except Exception as exc:
        return False, f"{type(exc).__name__}: {exc}"


async def _fetch_auth0_token(settings) -> str:
    token_url = f"https://{settings.auth0_domain}/oauth/token"
    payload = {
        "grant_type": "client_credentials",
        "client_id": settings.auth0_client_id,
        "client_secret": settings.auth0_client_secret,
        "audience": settings.auth0_audience,
        "scope": "read:agents write:agents read:audit admin",
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(token_url, json=payload)
    if response.status_code != 200:
        raise RuntimeError(f"Auth0 token request failed: {response.status_code} {response.text}")
    token = response.json().get("access_token")
    if not token:
        raise RuntimeError("Auth0 token response missing access_token")
    return token


async def _api(
    client: httpx.AsyncClient,
    method: str,
    url: str,
    *,
    bearer: str | None = None,
    body: dict[str, Any] | None = None,
) -> tuple[int, Any]:
    headers = {"Accept": "application/json"}
    if bearer:
        headers["Authorization"] = f"Bearer {bearer}"

    response = await client.request(method, url, headers=headers, json=body)
    if response.status_code == 204:
        return response.status_code, None
    try:
        payload = response.json()
    except Exception:
        payload = response.text
    return response.status_code, payload


async def run_live_integration() -> int:
    settings = get_settings()
    api_base = os.getenv("LIVE_API_BASE_URL", "http://localhost:8000/api/v1")

    print("== Live Integration Preflight ==")
    missing = _required_env_failures(settings)
    if missing:
        print(f"FAIL missing/non-real env: {', '.join(missing)}")
        return 1

    db_ok, db_msg = await _check_db()
    print(f"DB: {'ok' if db_ok else 'fail'} ({db_msg})")
    if not db_ok:
        return 1

    redis_ok, redis_msg = await _check_redis(settings)
    print(f"REDIS: {'ok' if redis_ok else 'fail'} ({redis_msg})")
    if not redis_ok:
        return 1

    backend_ok, backend_msg = await _check_backend(api_base)
    print(f"BACKEND: {'ok' if backend_ok else 'fail'} ({backend_msg})")
    if not backend_ok:
        return 1

    print("== Acquiring Auth0 Access Token ==")
    try:
        auth0_token = await _fetch_auth0_token(settings)
    except Exception as exc:
        print(f"FAIL auth0_token: {exc}")
        return 1

    print("== Running Live API Flow ==")
    agent_id: str | None = None
    vault_token: str | None = None
    user_headers_token = auth0_token

    async with httpx.AsyncClient(timeout=30.0) as client:
        status, payload = await _api(client, "GET", f"{api_base}/health")
        if status != 200:
            print(f"FAIL /health => {status} {payload}")
            return 1

        status, payload = await _api(client, "GET", f"{api_base}/config/public")
        if status != 200:
            print(f"FAIL /config/public => {status} {payload}")
            return 1

        status, payload = await _api(client, "GET", f"{api_base}/agents", bearer=user_headers_token)
        if status != 200:
            print(f"FAIL list_agents => {status} {payload}")
            return 1

        status, payload = await _api(
            client,
            "POST",
            f"{api_base}/agents",
            bearer=user_headers_token,
            body={"name": "LiveIntegrationAgent", "allowed_scopes": ["read:weather"]},
        )
        if status != 201:
            print(f"FAIL create_agent => {status} {payload}")
            return 1
        agent_id = payload["id"]
        agent_secret = payload["secret"]

        status, payload = await _api(
            client,
            "PATCH",
            f"{api_base}/agents/{agent_id}",
            bearer=user_headers_token,
            body={"name": "LiveIntegrationAgentV2", "allowed_scopes": ["read:weather"]},
        )
        if status != 200:
            print(f"FAIL update_agent => {status} {payload}")
            return 1

        status, payload = await _api(
            client,
            "POST",
            f"{api_base}/agents/{agent_id}/rotate-secret",
            bearer=user_headers_token,
        )
        if status != 200:
            print(f"FAIL rotate_secret => {status} {payload}")
            return 1
        agent_secret = payload["secret"]

        status, payload = await _api(
            client,
            "POST",
            f"{api_base}/agents/{agent_id}/secret",
            bearer=user_headers_token,
            body={"api_key": "live-integration-api-key"},
        )
        if status != 200:
            print(f"FAIL store_encrypted_key => {status} {payload}")
            return 1

        status, payload = await _api(
            client,
            "POST",
            f"{api_base}/agents/{agent_id}/request-token",
            body={"agent_secret": agent_secret, "requested_scopes": ["read:weather"]},
        )
        if status != 200:
            print(f"FAIL request_agent_token => {status} {payload}")
            return 1
        vault_token = payload["token"]

        status, payload = await _api(
            client,
            "GET",
            f"{api_base}/tools/weather",
            bearer=vault_token,
        )
        if status != 200:
            print(f"FAIL weather_tool => {status} {payload}")
            return 1

        status, payload = await _api(client, "GET", f"{api_base}/audit?limit=100&offset=0", bearer=user_headers_token)
        if status != 200:
            print(f"FAIL list_audit => {status} {payload}")
            return 1

        status, payload = await _api(
            client,
            "POST",
            f"{api_base}/agents/{agent_id}/revoke",
            bearer=user_headers_token,
        )
        if status != 200:
            print(f"FAIL revoke_tokens => {status} {payload}")
            return 1

        status, _payload = await _api(
            client,
            "DELETE",
            f"{api_base}/agents/{agent_id}",
            bearer=user_headers_token,
        )
        if status != 204:
            print(f"FAIL delete_agent => {status} {_payload}")
            return 1

    print("PASS live integration flow completed")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(run_live_integration()))
