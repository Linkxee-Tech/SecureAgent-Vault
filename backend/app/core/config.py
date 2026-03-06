import json
from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _parse_list_like(value: str | list[str] | tuple[str, ...] | set[str] | None) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        raw = value.strip()
        if not raw:
            return []
        if raw.startswith("["):
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, list):
                    return [str(item).strip() for item in parsed if str(item).strip()]
            except json.JSONDecodeError:
                pass
        return [part.strip() for part in raw.split(",") if part.strip()]
    return [str(item).strip() for item in value if str(item).strip()]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    project_name: str = "SecureAgent Vault"
    api_v1_prefix: str = "/api/v1"

    auth0_domain: str = "your-tenant.auth0.com"
    auth0_client_id: str = ""
    auth0_client_secret: str = ""
    auth0_audience: str = "https://secureagentvault/api"
    auth0_algorithms: str = "RS256"

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/vault"
    redis_url: str = "redis://localhost:6379/0"

    encryption_key: str = ""
    jwt_secret_key: str = ""
    jwt_algorithm: str = "HS256"  # Recommend RS256 for production with separate signing/verification keys
    token_expire_seconds: int = 120
    rate_limit_requests_per_minute: int = 10
    dev_bypass_auth: bool = False
    allow_dev_bypass: bool = False

    cors_origins: str = "http://localhost:3000"
    weather_provider: str = "demo"
    weather_api_key_name: str = "weatherapi"

    @property
    def auth0_issuer(self) -> str:
        return f"https://{self.auth0_domain}/"

    @property
    def auth0_jwks_url(self) -> str:
        return f"{self.auth0_issuer}.well-known/jwks.json"

    @field_validator("token_expire_seconds")
    @classmethod
    def _positive_ttl(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("token_expire_seconds must be greater than zero")
        return value

    @property
    def auth0_algorithms_list(self) -> list[str]:
        parsed = _parse_list_like(self.auth0_algorithms)
        return parsed or ["RS256"]

    @property
    def cors_origins_list(self) -> list[str]:
        return _parse_list_like(self.cors_origins)


@lru_cache
def get_settings() -> Settings:
    return Settings()
