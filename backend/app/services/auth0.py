import asyncio
import json
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
import jwt
from fastapi import HTTPException, status
from jwt.algorithms import RSAAlgorithm

from app.core.config import get_settings


class Auth0Validator:
    def __init__(self) -> None:
        self._settings = get_settings()
        self._jwks_by_kid: dict[str, dict[str, Any]] = {}
        self._loaded_at: datetime | None = None
        self._cache_ttl = timedelta(minutes=15)
        self._lock = asyncio.Lock()

    async def _load_jwks(self, force: bool = False) -> None:
        now = datetime.now(timezone.utc)
        if (
            not force
            and self._loaded_at is not None
            and (now - self._loaded_at) < self._cache_ttl
            and self._jwks_by_kid
        ):
            return

        async with self._lock:
            now = datetime.now(timezone.utc)
            if (
                not force
                and self._loaded_at is not None
                and (now - self._loaded_at) < self._cache_ttl
                and self._jwks_by_kid
            ):
                return

            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.get(self._settings.auth0_jwks_url)
                    response.raise_for_status()
                    keys = response.json().get("keys", [])
            except Exception as exc:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Unable to load Auth0 JWKS.",
                ) from exc

            self._jwks_by_kid = {
                key["kid"]: key for key in keys if isinstance(key, dict) and "kid" in key
            }
            self._loaded_at = now

    async def validate_access_token(self, token: str) -> dict[str, Any]:
        try:
            header = jwt.get_unverified_header(token)
        except jwt.InvalidTokenError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid access token header.",
            ) from exc

        kid = header.get("kid")
        if not kid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Access token missing key id.",
            )

        await self._load_jwks()
        jwk = self._jwks_by_kid.get(kid)
        if jwk is None:
            await self._load_jwks(force=True)
            jwk = self._jwks_by_kid.get(kid)
        if jwk is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unable to resolve signing key.",
            )

        public_key = RSAAlgorithm.from_jwk(json.dumps(jwk))
        import logging
        logger = logging.getLogger(__name__)
        try:
            payload = jwt.decode(
                token,
                public_key,
                algorithms=self._settings.auth0_algorithms_list,
                audience=self._settings.auth0_audience,
                issuer=self._settings.auth0_issuer,
            )
        except jwt.InvalidTokenError as exc:
            logger.error(f"JWT Validation failed: {exc}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Auth0 access token.",
            ) from exc
        return payload


_auth0_validator: Auth0Validator | None = None


def get_auth0_validator() -> Auth0Validator:
    global _auth0_validator
    if _auth0_validator is None:
        _auth0_validator = Auth0Validator()
    return _auth0_validator
