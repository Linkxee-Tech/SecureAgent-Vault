from fastapi import APIRouter

from app.core.config import get_settings
from app.schemas.config import PublicConfigResponse

router = APIRouter(prefix="/config", tags=["config"])
settings = get_settings()


def _looks_placeholder(value: str | None) -> bool:
    if value is None:
        return True
    normalized = value.strip().lower()
    if not normalized:
        return True
    placeholders = {
        "your-tenant.auth0.com",
        "your_client_id",
        "your_auth0_client_id",
        "your_client_secret",
    }
    return normalized in placeholders


@router.get("/public", response_model=PublicConfigResponse)
async def get_public_config() -> PublicConfigResponse:
    domain = settings.auth0_domain
    client_id = settings.auth0_client_id
    audience = settings.auth0_audience
    configured = settings.dev_bypass_auth or not (
        _looks_placeholder(domain)
        or _looks_placeholder(client_id)
        or _looks_placeholder(audience)
    )
    return PublicConfigResponse(
        auth0_domain=domain,
        auth0_client_id=client_id,
        auth0_audience=audience,
        auth0_scope="read:agents write:agents read:audit admin",
        configured=configured,
        dev_bypass_auth=settings.dev_bypass_auth,
    )
