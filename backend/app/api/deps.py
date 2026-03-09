from collections.abc import AsyncGenerator, Callable
from typing import Any

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import decode_vault_token, ensure_vault_scope
from app.db.session import get_db_session
from app.models.user import User
from app.services.auth0 import get_auth0_validator
from app.services.revocation import is_token_blacklisted
import warnings

auth0_bearer = HTTPBearer(auto_error=False)
vault_bearer = HTTPBearer(auto_error=False)
settings = get_settings()

LEGACY_SCOPE_ALIASES: dict[str, set[str]] = {
    "write:agents": {"read:agents", "create:agents", "update:agents", "delete:agents"},
}

CUSTOM_SCOPE_SUFFIXES = (
    "/permissions",
    ":permissions",
    "_permissions",
    "/scope",
    ":scope",
    "_scope",
    "/scopes",
    ":scopes",
    "_scopes",
)

SCOPE_CLAIM_KEYS = {"permissions", "scope", "scopes", "scp"}


def _coerce_scopes(value: Any) -> set[str]:
    if isinstance(value, str):
        normalized = value.replace(",", " ")
        return {part for part in normalized.split() if part}
    if isinstance(value, (list, tuple, set)):
        combined: set[str] = set()
        for item in value:
            if isinstance(item, str):
                combined.update(_coerce_scopes(item))
        return combined
    return set()


def _extract_custom_scope_claims(payload: dict[str, Any]) -> set[str]:
    return _extract_scope_claims(payload)


def _extract_scope_claims(payload: Any) -> set[str]:
    discovered: set[str] = set()
    if isinstance(payload, dict):
        for key, value in payload.items():
            key_lower = str(key).lower()
            if key_lower in SCOPE_CLAIM_KEYS or key_lower.endswith(CUSTOM_SCOPE_SUFFIXES):
                discovered.update(_coerce_scopes(value))
            if isinstance(value, (dict, list, tuple, set)):
                discovered.update(_extract_scope_claims(value))
    elif isinstance(payload, (list, tuple, set)):
        for item in payload:
            if isinstance(item, (dict, list, tuple, set)):
                discovered.update(_extract_scope_claims(item))
    return discovered


def _warn_dev_bypass() -> None:
    """Warn if dev auth bypass is enabled."""
    if settings.dev_bypass_auth and not settings.allow_dev_bypass:
        warnings.warn(
            "WARNING: DEV_BYPASS_AUTH is enabled but ALLOW_DEV_BYPASS is not set to True - "
            "dev bypass is blocked. Set ALLOW_DEV_BYPASS=true to enable it.",
            UserWarning,
            stacklevel=2,
        )
    elif settings.dev_bypass_auth and settings.allow_dev_bypass:
        warnings.warn(
            "WARNING: DEV_BYPASS_AUTH is enabled - authentication is disabled! "
            "This should never be enabled in production.",
            UserWarning,
            stacklevel=2,
        )


_warn_dev_bypass()


def _dev_bypass_payload() -> dict[str, Any]:
    return {
        "sub": "dev|local-user",
        "email": "local-dev@example.com",
        "scope": "read:agents create:agents update:agents delete:agents rotate:secret revoke:agent read:audit admin",
        "permissions": [
            "read:agents",
            "create:agents",
            "update:agents",
            "delete:agents",
            "rotate:secret",
            "revoke:agent",
            "read:audit",
            "admin"
        ],
    }


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_db_session():
        yield session


async def get_redis(request: Request) -> Redis:
    redis: Redis | None = getattr(request.app.state, "redis", None)
    if redis is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Redis is not available.",
        )
    return redis


async def get_auth0_payload(
    credentials: HTTPAuthorizationCredentials | None = Depends(auth0_bearer),
) -> dict[str, Any]:
    if settings.dev_bypass_auth and settings.allow_dev_bypass:
        return _dev_bypass_payload()
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token.",
        )
    validator = get_auth0_validator()
    return await validator.validate_access_token(credentials.credentials)


def extract_auth0_scopes(payload: dict[str, Any]) -> set[str]:
    granted = _extract_custom_scope_claims(payload)
    expanded = set(granted)
    for legacy_scope, aliases in LEGACY_SCOPE_ALIASES.items():
        if legacy_scope in granted:
            expanded.update(aliases)
    return expanded


def can_view_global(payload: dict[str, Any]) -> bool:
    """
    Returns True if the user should bypass ownership filters for reading (e.g., Admin or Auditor).
    Based on the RBAC plan, Auditors have `read:audit` and `read:agents`, but lack `request:token`.
    Admins have scopes starting with `admin:`.
    """
    scopes = extract_auth0_scopes(payload)
    if any(s.startswith("admin:") for s in scopes):
        return True
    # Auditor persona: has read:audit but lacks request:token (which agent managers/standard users have)
    if "read:audit" in scopes and "request:token" not in scopes:
        return True
    return False


async def get_current_user(
    payload: dict[str, Any] = Depends(get_auth0_payload),
    db: AsyncSession = Depends(get_db),
) -> User:
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing the subject claim.",
        )

    try:
        result = await db.execute(select(User).where(User.auth0_id == sub))
        user = result.scalar_one_or_none()
        if user:
            return user

        user = User(
            auth0_id=sub,
            email=payload.get("email"),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user
    except (SQLAlchemyError, Exception) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is unavailable. Check DATABASE_URL and PostgreSQL credentials.",
        ) from exc


def require_auth0_scopes(required_scopes: set[str]) -> Callable[[dict[str, Any]], dict[str, Any]]:
    async def _inner(
        payload: dict[str, Any] = Depends(get_auth0_payload),
    ) -> dict[str, Any]:
        granted = extract_auth0_scopes(payload)
        audience = payload.get("aud", "")
        
        # If the token is for the Management API, Auth0 strips custom scopes.
        # We allow it to pass for development convenience.
        is_management_api = isinstance(audience, str) and audience.endswith("api/v2/")
        is_management_api_in_list = isinstance(audience, list) and any(a.endswith("api/v2/") for a in audience)
        
        if "admin" in granted or any(s.startswith("admin:") for s in granted):
            return payload

        if not required_scopes.issubset(granted):
            if is_management_api or is_management_api_in_list:
                import logging
                logging.getLogger(__name__).warning("Bypassing custom scope check due to Management API audience.")
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Missing required scopes: {sorted(required_scopes)}",
                )
        return payload

    return _inner


async def get_vault_payload(
    credentials: HTTPAuthorizationCredentials | None = Depends(vault_bearer),
    redis: Redis = Depends(get_redis),
) -> dict[str, Any]:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing vault bearer token.",
        )

    payload = decode_vault_token(credentials.credentials)
    token_id = payload.get("jti")
    if token_id and await is_token_blacklisted(redis, token_id):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token was revoked.",
        )
    return payload


def require_vault_scope(scope: str) -> Callable[[dict[str, Any]], dict[str, Any]]:
    async def _inner(
        payload: dict[str, Any] = Depends(get_vault_payload),
    ) -> dict[str, Any]:
        ensure_vault_scope(payload, scope)
        return payload

    return _inner
