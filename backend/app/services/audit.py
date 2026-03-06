import hashlib
from datetime import datetime, timezone
from typing import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


def _build_chain_hash(
    previous_hash: str | None,
    *,
    agent_id: UUID | None,
    user_id: UUID,
    action: str,
    scopes: Sequence[str],
    token_id: str | None,
    timestamp: datetime,
) -> str:
    parts = [
        previous_hash or "",
        str(agent_id) if agent_id else "",
        str(user_id),
        action,
        ",".join(scopes),
        token_id or "",
        timestamp.isoformat(),
    ]
    material = "|".join(parts)
    return hashlib.sha256(material.encode("utf-8")).hexdigest()


async def create_audit_log(
    *,
    db: AsyncSession,
    user_id: UUID,
    action: str,
    scopes: list[str],
    agent_id: UUID | None = None,
    token_id: str | None = None,
    ip_address: str | None = None,
) -> AuditLog:
    previous_hash = await db.scalar(
        select(AuditLog.hash)
        .order_by(AuditLog.timestamp.desc(), AuditLog.id.desc())
        .limit(1)
    )

    now = datetime.now(timezone.utc)
    chain_hash = _build_chain_hash(
        previous_hash,
        agent_id=agent_id,
        user_id=user_id,
        action=action,
        scopes=scopes,
        token_id=token_id,
        timestamp=now,
    )
    record = AuditLog(
        agent_id=agent_id,
        user_id=user_id,
        action=action,
        scopes=scopes,
        token_id=token_id,
        timestamp=now,
        ip_address=ip_address,
        previous_hash=previous_hash,
        hash=chain_hash,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record
