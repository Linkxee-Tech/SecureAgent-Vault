from datetime import datetime, timezone
from uuid import UUID

from app.core.security import create_vault_token


def create_agent_access_token(
    *,
    agent_id: UUID,
    user_id: UUID,
    scopes: list[str],
) -> tuple[str, str, int]:
    return create_vault_token(
        agent_id=str(agent_id),
        user_id=str(user_id),
        scopes=scopes,
    )


def remaining_ttl_from_timestamp(issued_at: datetime, ttl_seconds: int) -> int:
    if issued_at.tzinfo is None:
        issued_at = issued_at.replace(tzinfo=timezone.utc)
    expires_at = int(issued_at.timestamp()) + ttl_seconds
    current_time = int(datetime.now(timezone.utc).timestamp())
    return max(0, expires_at - current_time)
