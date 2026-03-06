from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class AuditLogOut(BaseModel):
    id: UUID
    agent_id: UUID | None
    agent_name: str | None = None
    action: str
    scopes: list[str]
    token_id: str | None = None
    timestamp: datetime
    ip_address: str | None = None
    previous_hash: str | None = None
    hash: str | None = None
