from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_vault_scope
from app.core.config import get_settings
from app.schemas.tool import WeatherResponse
from app.services.secrets import get_agent_api_key

router = APIRouter(prefix="/tools", tags=["tools"])
settings = get_settings()


async def _fetch_weatherapi(api_key: str, city: str) -> WeatherResponse:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://api.weatherapi.com/v1/current.json",
                params={"key": api_key, "q": city},
            )
        response.raise_for_status()
        payload = response.json()
        current = payload.get("current", {})
        location = payload.get("location", {})
        temperature = int(round(current.get("temp_c", 0)))
        conditions = current.get("condition", {}).get("text", "unknown")
        city_name = location.get("name") or city
        return WeatherResponse(
            city=city_name,
            temperature=temperature,
            conditions=conditions,
        )
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Weather provider error.",
        ) from exc
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Weather provider unavailable.",
        ) from exc


@router.get("/weather", response_model=WeatherResponse)
async def weather_tool(
    city: str = Query(default="Paris", min_length=1),
    payload: dict = Depends(require_vault_scope("read:weather")),
    db: AsyncSession = Depends(get_db),
) -> WeatherResponse:
    provider = settings.weather_provider.strip().lower()
    if provider == "demo":
        return WeatherResponse(city=city, temperature=22, conditions="sunny")

    agent_id = payload.get("agent_id")
    if not agent_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Vault token missing agent_id.",
        )
    try:
        agent_uuid = UUID(agent_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Vault token has invalid agent_id.",
        ) from exc

    secret_name = settings.weather_api_key_name.strip()
    if not secret_name:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="WEATHER_API_KEY_NAME is not configured.",
        )

    api_key = await get_agent_api_key(
        db,
        agent_id=agent_uuid,
        name=secret_name,
    )
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing stored API key '{secret_name}' for agent.",
        )

    if provider == "weatherapi":
        return await _fetch_weatherapi(api_key, city)

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"Unsupported weather provider: {settings.weather_provider}",
    )
