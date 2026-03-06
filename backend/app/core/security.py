import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import jwt
from fastapi import HTTPException, status

from app.core.config import get_settings


def generate_agent_secret() -> str:
    return secrets.token_urlsafe(32)


def _secret_for_hashing(plain_secret: str) -> bytes:
    # Pre-hash to keep bcrypt input fixed-size and avoid 72-byte password limits.
    return hashlib.sha256(plain_secret.encode("utf-8")).digest()


def hash_secret(plain_secret: str) -> str:
    secret_bytes = _secret_for_hashing(plain_secret)
    return bcrypt.hashpw(secret_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_secret(plain_secret: str, secret_hash: str) -> bool:
    normalized_secret = _secret_for_hashing(plain_secret)
    hash_bytes = secret_hash.encode("utf-8")
    try:
        # Preferred path for newly created hashes.
        if bcrypt.checkpw(normalized_secret, hash_bytes):
            return True
        # Backward-compat path for legacy rows hashed from raw secret bytes.
        return bcrypt.checkpw(plain_secret.encode("utf-8"), hash_bytes)
    except Exception:
        return False


def create_vault_token(*, agent_id: str, user_id: str, scopes: list[str]) -> tuple[str, str, int]:
    settings = get_settings()
    if not settings.jwt_secret_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JWT_SECRET_KEY is not configured.",
        )

    now = datetime.now(timezone.utc)
    expires_in = settings.token_expire_seconds
    expires_at = now + timedelta(seconds=expires_in)
    token_id = secrets.token_urlsafe(24)

    payload: dict[str, Any] = {
        "agent_id": agent_id,
        "user_id": user_id,
        "scopes": scopes,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
        "iss": "secureagentvault",
        "jti": token_id,
    }
    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return token, token_id, expires_in


def decode_vault_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    try:
        return jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            issuer="secureagentvault",
        )
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Vault token has expired.",
        ) from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid vault token.",
        ) from exc


def ensure_vault_scope(payload: dict[str, Any], required_scope: str) -> None:
    scopes = payload.get("scopes") or []
    if required_scope not in scopes:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Missing required vault scope: {required_scope}",
        )


def extract_bearer_token(header_value: str | None) -> str | None:
    if not header_value:
        return None
    prefix = "bearer "
    if header_value.lower().startswith(prefix):
        token = header_value[len(prefix) :].strip()
        return token or None
    return None
