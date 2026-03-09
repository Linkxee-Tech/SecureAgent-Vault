from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, require_auth0_scopes, get_auth0_payload, can_view_global
from app.models.agent import Agent
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.audit import AuditLogOut

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get(
    "",
    response_model=list[AuditLogOut],
    dependencies=[Depends(require_auth0_scopes({"read:audit"}))],
)
async def get_audit_logs(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    auth0_payload: dict = Depends(get_auth0_payload),
    db: AsyncSession = Depends(get_db),
) -> list[AuditLogOut]:
    query = select(AuditLog, Agent.name).join(Agent, Agent.id == AuditLog.agent_id, isouter=True)
    if not can_view_global(auth0_payload):
        query = query.where(User.id == current_user.id).join(User, User.id == AuditLog.user_id)
        
    result = await db.execute(
        query.order_by(AuditLog.timestamp.desc())
        .limit(limit)
        .offset(offset)
    )

    rows = []
    for audit_log, agent_name in result.all():
        rows.append(
            AuditLogOut(
                id=audit_log.id,
                agent_id=audit_log.agent_id,
                agent_name=agent_name,
                action=audit_log.action,
                scopes=audit_log.scopes or [],
                token_id=audit_log.token_id,
                timestamp=audit_log.timestamp,
                ip_address=str(audit_log.ip_address) if audit_log.ip_address else None,
                previous_hash=audit_log.previous_hash,
                hash=audit_log.hash,
            )
        )
    return rows
