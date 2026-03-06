import asyncio
import base64
import json
import os
import unittest
import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import patch

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
from fastapi.testclient import TestClient
from jwt.algorithms import RSAAlgorithm

# Ensure deterministic test settings regardless of local .env placeholders.
os.environ["JWT_SECRET_KEY"] = "unit-test-jwt-secret"
os.environ["ENCRYPTION_KEY"] = base64.b64encode(b"a" * 32).decode("ascii")
os.environ["AUTH0_DOMAIN"] = "local.auth0.test"
os.environ["AUTH0_AUDIENCE"] = "https://secureagentvault/api"
os.environ["AUTH0_ALGORITHMS"] = "RS256"
os.environ["DEV_BYPASS_AUTH"] = "false"
os.environ["WEATHER_PROVIDER"] = "demo"
os.environ["WEATHER_API_KEY_NAME"] = "weatherapi"

from app.api.deps import get_redis
from app.api.routes import agents as agents_routes
from app.api.routes import audit as audit_routes
from app.core.config import _parse_list_like, get_settings
from app.core.security import (
    create_vault_token,
    decode_vault_token,
    ensure_vault_scope,
    extract_bearer_token,
    generate_agent_secret,
    hash_secret,
    verify_secret,
)
from app.main import app
from app.models.agent import Agent
from app.models.agent_secret import AgentSecret
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.agent import AgentCreate, AgentSecretStore, AgentUpdate, TokenRequest
from app.services.audit import _build_chain_hash
from app.services.auth0 import Auth0Validator
from app.services.crypto import decrypt_api_key, encrypt_api_key
from app.services.revocation import blacklist_token, enforce_agent_rate_limit, is_token_blacklisted
from app.services.tokens import remaining_ttl_from_timestamp

import app.api.deps as deps


get_settings.cache_clear()


class FakeScalarResult:
    def __init__(self, *, scalar=None, scalars_list=None, rows=None):
        self._scalar = scalar
        self._scalars_list = scalars_list or []
        self._rows = rows or []

    def scalar_one_or_none(self):
        return self._scalar

    def scalars(self):
        return SimpleNamespace(all=lambda: self._scalars_list)

    def all(self):
        return self._rows


class FakeDB:
    def __init__(self, execute_results=None):
        self.execute_results = list(execute_results or [])
        self.added = []
        self.deleted = []
        self.commits = 0

    async def execute(self, _query):
        if self.execute_results:
            return self.execute_results.pop(0)
        return FakeScalarResult()

    def add(self, obj):
        if getattr(obj, "id", None) is None:
            try:
                obj.id = uuid.uuid4()
            except Exception:
                pass
        if getattr(obj, "created_at", None) is None:
            try:
                obj.created_at = datetime.now(timezone.utc)
            except Exception:
                pass
        if hasattr(obj, "is_active") and getattr(obj, "is_active") is None:
            obj.is_active = True
        if hasattr(obj, "allowed_scopes") and getattr(obj, "allowed_scopes") is None:
            obj.allowed_scopes = []
        self.added.append(obj)

    async def commit(self):
        self.commits += 1

    async def refresh(self, _obj):
        return None

    async def delete(self, obj):
        self.deleted.append(obj)


class BrokenDB:
    async def execute(self, _query):
        raise RuntimeError("db down")


class FakeRedis:
    def __init__(self):
        self.store = {}
        self.counters = {}

    async def setex(self, key, ttl, value):
        self.store[key] = (value, ttl)

    async def exists(self, key):
        return 1 if key in self.store else 0

    async def incr(self, key):
        self.counters[key] = self.counters.get(key, 0) + 1
        return self.counters[key]

    async def expire(self, _key, _ttl):
        return True


class PublicRouteTests(unittest.TestCase):
    def test_health_and_public_config(self):
        with TestClient(app) as client:
            root = client.get("/")
            self.assertEqual(root.status_code, 200)
            self.assertIn("docs", root.json())

            compat_health = client.get("/health")
            self.assertEqual(compat_health.status_code, 200)
            self.assertEqual(compat_health.json(), {"status": "ok"})

            health = client.get("/api/v1/health")
            self.assertEqual(health.status_code, 200)
            self.assertEqual(health.json(), {"status": "ok"})

            config = client.get("/api/v1/config/public")
            self.assertEqual(config.status_code, 200)
            payload = config.json()
            self.assertIn("auth0_domain", payload)
            self.assertIn("auth0_client_id", payload)
            self.assertIn("auth0_audience", payload)
            self.assertIn("configured", payload)

    def test_protected_routes_require_tokens(self):
        with TestClient(app) as client:
            agents = client.get("/api/v1/agents")
            audit = client.get("/api/v1/audit")
            tools = client.get("/api/v1/tools/weather")

        self.assertEqual(agents.status_code, 401)
        self.assertEqual(audit.status_code, 401)
        self.assertEqual(tools.status_code, 401)


class SecurityAndHelpersTests(unittest.TestCase):
    def test_hash_and_verify_secret(self):
        secret = generate_agent_secret()
        hashed = hash_secret(secret)
        self.assertTrue(verify_secret(secret, hashed))
        self.assertFalse(verify_secret("wrong-secret", hashed))

    def test_vault_token_and_scope_enforcement(self):
        token, _, _ = create_vault_token(
            agent_id=str(uuid.uuid4()),
            user_id=str(uuid.uuid4()),
            scopes=["read:weather"],
        )
        payload = decode_vault_token(token)
        self.assertIn("read:weather", payload.get("scopes", []))

        ensure_vault_scope(payload, "read:weather")
        with self.assertRaises(HTTPException) as missing_scope:
            ensure_vault_scope(payload, "admin")
        self.assertEqual(missing_scope.exception.status_code, 403)

    def test_extract_bearer_token(self):
        self.assertEqual(extract_bearer_token("Bearer abc123"), "abc123")
        self.assertEqual(extract_bearer_token("bearer xyz"), "xyz")
        self.assertIsNone(extract_bearer_token("Token abc123"))
        self.assertIsNone(extract_bearer_token(None))

    def test_parse_list_like(self):
        self.assertEqual(_parse_list_like("a,b,c"), ["a", "b", "c"])
        self.assertEqual(_parse_list_like('["x", "y"]'), ["x", "y"])
        self.assertEqual(_parse_list_like(""), [])

    def test_remaining_ttl_from_timestamp(self):
        issued_recently = datetime.now(timezone.utc) - timedelta(seconds=10)
        ttl = remaining_ttl_from_timestamp(issued_recently, 120)
        self.assertGreater(ttl, 0)
        self.assertLessEqual(ttl, 120)

    def test_audit_chain_hash_changes(self):
        now = datetime.now(timezone.utc)
        h1 = _build_chain_hash(
            None,
            agent_id=None,
            user_id=uuid.uuid4(),
            action="token_issued",
            scopes=["read:weather"],
            token_id="token-1",
            timestamp=now,
        )
        h2 = _build_chain_hash(
            h1,
            agent_id=None,
            user_id=uuid.uuid4(),
            action="revoked",
            scopes=[],
            token_id=None,
            timestamp=now,
        )
        self.assertNotEqual(h1, h2)


class CryptoTests(unittest.TestCase):
    def test_encrypt_and_decrypt_api_key(self):
        ciphertext = encrypt_api_key("my-api-key")
        plaintext = decrypt_api_key(ciphertext)
        self.assertEqual(plaintext, "my-api-key")


class RevocationTests(unittest.IsolatedAsyncioTestCase):
    async def test_blacklist_and_rate_limit(self):
        redis = FakeRedis()
        await blacklist_token(redis, "token-123", 30)
        self.assertTrue(await is_token_blacklisted(redis, "token-123"))

        await enforce_agent_rate_limit(redis, "agent-a", 1, 60)
        with self.assertRaises(HTTPException) as limited:
            await enforce_agent_rate_limit(redis, "agent-a", 1, 60)
        self.assertEqual(limited.exception.status_code, 429)


class Auth0ValidatorTests(unittest.IsolatedAsyncioTestCase):
    async def test_validates_token_with_local_jwk(self):
        private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        public_key = private_key.public_key()
        kid = "kid-local-1"
        jwk = json.loads(RSAAlgorithm.to_jwk(public_key))
        jwk["kid"] = kid

        settings = get_settings()
        payload = {
            "sub": "auth0|user123",
            "aud": settings.auth0_audience,
            "iss": settings.auth0_issuer,
            "exp": int((datetime.now(timezone.utc) + timedelta(minutes=5)).timestamp()),
            "scope": "read:agents write:agents",
        }
        token = jwt.encode(payload, private_key, algorithm="RS256", headers={"kid": kid})

        validator = Auth0Validator()
        validator._jwks_by_kid = {kid: jwk}
        validator._loaded_at = datetime.now(timezone.utc)
        validated = await validator.validate_access_token(token)

        self.assertEqual(validated["sub"], "auth0|user123")


class DependencyTests(unittest.IsolatedAsyncioTestCase):
    async def test_extract_auth0_scopes_combines_permissions_and_scope(self):
        merged = deps._extract_auth0_scopes(
            {"permissions": ["read:agents"], "scope": "write:agents"}
        )
        self.assertEqual(merged, {"read:agents", "write:agents"})

    async def test_require_auth0_scopes_guard(self):
        guard_ok = deps.require_auth0_scopes({"read:agents"})
        await guard_ok(payload={"scope": "read:agents write:agents"})

        guard_fail = deps.require_auth0_scopes({"admin"})
        with self.assertRaises(HTTPException) as denied:
            await guard_fail(payload={"scope": "read:agents"})
        self.assertEqual(denied.exception.status_code, 403)

    async def test_get_current_user_auto_provisions(self):
        db = FakeDB([FakeScalarResult(scalar=None)])
        user = await deps.get_current_user(
            payload={"sub": "auth0|new-user", "email": "new@example.com"},
            db=db,
        )
        self.assertEqual(user.auth0_id, "auth0|new-user")
        self.assertEqual(len(db.added), 1)

    async def test_get_current_user_maps_db_failure_to_503(self):
        with self.assertRaises(HTTPException) as failure:
            await deps.get_current_user(
                payload={"sub": "auth0|new-user", "email": "new@example.com"},
                db=BrokenDB(),
            )
        self.assertEqual(failure.exception.status_code, 503)


class ToolsRouteTests(unittest.TestCase):
    def test_weather_route_scope_enforced(self):
        async def override_redis():
            return FakeRedis()

        app.dependency_overrides[get_redis] = override_redis
        try:
            token_ok, _, _ = create_vault_token(
                agent_id=str(uuid.uuid4()),
                user_id=str(uuid.uuid4()),
                scopes=["read:weather"],
            )
            token_bad, _, _ = create_vault_token(
                agent_id=str(uuid.uuid4()),
                user_id=str(uuid.uuid4()),
                scopes=["write:weather"],
            )

            with TestClient(app) as client:
                allowed = client.get(
                    "/api/v1/tools/weather",
                    headers={"Authorization": f"Bearer {token_ok}"},
                )
                denied = client.get(
                    "/api/v1/tools/weather",
                    headers={"Authorization": f"Bearer {token_bad}"},
                )

            self.assertEqual(allowed.status_code, 200)
            self.assertEqual(denied.status_code, 403)
        finally:
            app.dependency_overrides.pop(get_redis, None)


class AgentRouteLogicTests(unittest.IsolatedAsyncioTestCase):
    async def test_agent_lifecycle_and_token_issuance(self):
        user = User(auth0_id="auth0|owner", email="owner@example.com")
        user.id = uuid.uuid4()

        target_agent = Agent(
            name="Target",
            user_id=user.id,
            allowed_scopes=["read:weather"],
            secret_hash="hashed::seed",
            is_active=True,
        )
        target_agent.id = uuid.uuid4()

        async def fake_get_owned_agent(_db, _user_id, _agent_id):
            return target_agent

        async def fake_blacklist_recent(**_kwargs):
            return 2

        async def fake_audit_log(**_kwargs):
            return None

        with patch.object(agents_routes, "hash_secret", side_effect=lambda s: f"hashed::{s}"), patch.object(
            agents_routes,
            "verify_secret",
            side_effect=lambda plain, hashed: hashed == f"hashed::{plain}",
        ), patch.object(
            agents_routes,
            "_get_owned_agent",
            side_effect=fake_get_owned_agent,
        ), patch.object(
            agents_routes,
            "_blacklist_recent_agent_tokens",
            side_effect=fake_blacklist_recent,
        ), patch.object(
            agents_routes,
            "create_audit_log",
            side_effect=fake_audit_log,
        ):
            created = await agents_routes.create_agent(
                payload=AgentCreate(name="WeatherBot", allowed_scopes=["read:weather"]),
                current_user=user,
                db=FakeDB(),
            )
            self.assertEqual(created.name, "WeatherBot")
            self.assertTrue(created.secret)

            listed_agent = Agent(
                name="Listed",
                user_id=user.id,
                allowed_scopes=["read:weather"],
                secret_hash="hashed::listed",
                is_active=True,
            )
            listed_agent.id = uuid.uuid4()
            listed_agent.created_at = datetime.now(timezone.utc)
            listed = await agents_routes.list_agents(
                current_user=user,
                db=FakeDB([FakeScalarResult(scalars_list=[listed_agent])]),
            )
            self.assertEqual(len(listed), 1)
            self.assertEqual(listed[0].name, "Listed")

            updated = await agents_routes.update_agent(
                agent_id=target_agent.id,
                payload=AgentUpdate(
                    name="UpdatedBot",
                    allowed_scopes=["read:weather", "write:calendar"],
                    is_active=False,
                ),
                current_user=user,
                db=FakeDB(),
            )
            self.assertEqual(updated.name, "UpdatedBot")
            self.assertFalse(updated.is_active)

            rotated = await agents_routes.rotate_agent_secret(
                agent_id=target_agent.id,
                current_user=user,
                db=FakeDB(),
            )
            self.assertEqual(rotated.agent_id, target_agent.id)
            self.assertTrue(rotated.secret)

            stored = await agents_routes.store_agent_secret(
                agent_id=target_agent.id,
                payload=AgentSecretStore(api_key="secret-key"),
                current_user=user,
                db=FakeDB(),
            )
            self.assertEqual(stored.status, "stored")

            target_agent.is_active = True
            target_agent.secret_hash = "hashed::known-secret"
            target_agent.allowed_scopes = ["read:weather", "write:calendar"]

            token_response = await agents_routes.request_agent_token(
                agent_id=target_agent.id,
                request=SimpleNamespace(client=SimpleNamespace(host="127.0.0.1")),
                payload=TokenRequest(
                    requested_scopes=["read:weather"],
                    agent_secret="known-secret",
                ),
                authorization=None,
                db=FakeDB([FakeScalarResult(scalar=target_agent)]),
                redis=FakeRedis(),
            )
            decoded = decode_vault_token(token_response.token)
            self.assertIn("read:weather", decoded.get("scopes", []))

            with self.assertRaises(HTTPException) as disallowed_scopes:
                await agents_routes.request_agent_token(
                    agent_id=target_agent.id,
                    request=SimpleNamespace(client=SimpleNamespace(host="127.0.0.1")),
                    payload=TokenRequest(
                        requested_scopes=["admin"],
                        agent_secret="known-secret",
                    ),
                    authorization=None,
                    db=FakeDB([FakeScalarResult(scalar=target_agent)]),
                    redis=FakeRedis(),
                )
            self.assertEqual(disallowed_scopes.exception.status_code, 403)

            revoke_result = await agents_routes.revoke_agent_tokens(
                agent_id=target_agent.id,
                request=SimpleNamespace(client=SimpleNamespace(host="127.0.0.1")),
                current_user=user,
                db=FakeDB(),
                redis=FakeRedis(),
            )
            self.assertEqual(revoke_result.revoked_jti_count, 2)
            self.assertFalse(target_agent.is_active)

            delete_result = await agents_routes.delete_agent(
                agent_id=target_agent.id,
                request=SimpleNamespace(client=SimpleNamespace(host="127.0.0.1")),
                current_user=user,
                db=FakeDB(),
                redis=FakeRedis(),
            )
            self.assertEqual(delete_result.status_code, 204)

    async def test_blacklist_recent_agent_tokens_helper(self):
        now = datetime.now(timezone.utc)
        logs = [
            SimpleNamespace(token_id="recent-token", timestamp=now),
            SimpleNamespace(token_id="old-token", timestamp=now - timedelta(days=1)),
            SimpleNamespace(token_id=None, timestamp=now),
        ]
        db = FakeDB([FakeScalarResult(scalars_list=logs)])
        redis = FakeRedis()
        count = await agents_routes._blacklist_recent_agent_tokens(
            db=db,
            redis=redis,
            agent_id=uuid.uuid4(),
        )
        self.assertEqual(count, 1)

    async def test_list_agent_secrets_returns_names(self):
        user = User(auth0_id="auth0|owner", email="owner@example.com")
        user.id = uuid.uuid4()
        agent = Agent(
            name="SecretBot",
            user_id=user.id,
            allowed_scopes=["read:weather"],
            secret_hash="hashed::seed",
            is_active=True,
        )
        agent.id = uuid.uuid4()

        async def fake_get_owned_agent(_db, _user_id, _agent_id):
            return agent

        secret = AgentSecret(agent_id=agent.id, name="weatherapi", encrypted_key=b"cipher")
        secret.created_at = datetime.now(timezone.utc)

        with patch.object(agents_routes, "_get_owned_agent", side_effect=fake_get_owned_agent):
            result = await agents_routes.list_agent_secrets(
                agent_id=agent.id,
                current_user=user,
                db=FakeDB([FakeScalarResult(scalars_list=[secret])]),
            )
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].name, "weatherapi")


class AuditRouteLogicTests(unittest.IsolatedAsyncioTestCase):
    async def test_audit_query_formatting(self):
        user = User(auth0_id="auth0|audit-user", email="audit@example.com")
        user.id = uuid.uuid4()

        entry = AuditLog(
            agent_id=uuid.uuid4(),
            user_id=user.id,
            action="token_issued",
            scopes=["read:weather"],
            token_id="token-1",
            timestamp=datetime.now(timezone.utc),
            ip_address="127.0.0.1",
            previous_hash="hash-0",
            hash="hash-1",
        )
        entry.id = uuid.uuid4()

        rows = await audit_routes.get_audit_logs(
            limit=50,
            offset=0,
            current_user=user,
            db=FakeDB([FakeScalarResult(rows=[(entry, "WeatherBot")])]),
        )
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].agent_name, "WeatherBot")
        self.assertEqual(rows[0].action, "token_issued")


if __name__ == "__main__":
    unittest.main(verbosity=2)
