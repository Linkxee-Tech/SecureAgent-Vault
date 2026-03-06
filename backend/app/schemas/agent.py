import re
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

# Common scope patterns (can be extended)
VALID_SCOPE_PATTERN = re.compile(r"^[a-zA-Z][a-zA-Z0-9_:]*$")


class AgentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    allowed_scopes: list[str] = Field(default_factory=list)

    @field_validator("allowed_scopes", mode="before")
    @classmethod
    def validate_scopes(cls, v: list[str]) -> list[str]:
        if not v:
            return []
        for scope in v:
            if not isinstance(scope, str):
                raise ValueError(f"Invalid scope: {scope} must be a string")
            if not VALID_SCOPE_PATTERN.match(scope):
                raise ValueError(
                    f"Invalid scope '{scope}': must start with letter and contain only "
                    "letters, numbers, underscores, or colons"
                )
        return v


class AgentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    allowed_scopes: list[str] | None = None
    is_active: bool | None = None


class AgentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    allowed_scopes: list[str]
    is_active: bool
    created_at: datetime


class AgentCreateResponse(AgentOut):
    secret: str


class AgentSecretRotateResponse(BaseModel):
    agent_id: UUID
    secret: str


class AgentSecretStore(BaseModel):
    name: str = Field(default="default", min_length=1, max_length=100)
    api_key: str = Field(min_length=1)


class SecretStoreResponse(BaseModel):
    status: str
    name: str


class TokenRequest(BaseModel):
    requested_scopes: list[str] | None = None
    agent_secret: str | None = None


class TokenResponse(BaseModel):
    token: str
    expires_in: int


class RevokeResponse(BaseModel):
    agent_id: UUID
    revoked_jti_count: int


class AgentSecretOut(BaseModel):
    name: str
    created_at: datetime
