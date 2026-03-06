from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import Agent
from app.models.agent_secret import AgentSecret
from app.services.crypto import decrypt_api_key


async def get_agent_secret(
    db: AsyncSession,
    *,
    agent_id: UUID,
    name: str,
) -> AgentSecret | None:
    result = await db.execute(
        select(AgentSecret).where(
            AgentSecret.agent_id == agent_id,
            AgentSecret.name == name,
        )
    )
    return result.scalar_one_or_none()


async def get_agent_api_key(
    db: AsyncSession,
    *,
    agent_id: UUID,
    name: str,
) -> str | None:
    secret = await get_agent_secret(db, agent_id=agent_id, name=name)
    if secret is None:
        if name != "default":
            return None
        legacy = await db.scalar(
            select(Agent.encrypted_key).where(Agent.id == agent_id)
        )
        if not legacy:
            return None
        return decrypt_api_key(legacy)
    return decrypt_api_key(secret.encrypted_key)
