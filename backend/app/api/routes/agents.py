from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Body, Depends, Header, HTTPException, Request, Response, status
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, get_redis, require_auth0_scopes, get_auth0_payload, can_view_global
from app.core.config import get_settings
from app.core.security import extract_bearer_token, generate_agent_secret, hash_secret, verify_secret
from app.models.agent import Agent
from app.models.agent_secret import AgentSecret
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.agent import (
    AgentCreate,
    AgentCreateResponse,
    AgentOut,
    AgentSecretRotateResponse,
    AgentSecretStore,
    AgentSecretOut,
    AgentUpdate,
    RevokeResponse,
    SecretStoreResponse,
    TokenRequest,
    TokenResponse,
)
from app.services.audit import create_audit_log
from app.services.crypto import encrypt_api_key
from app.services.revocation import blacklist_token, enforce_agent_rate_limit
from app.services.tokens import create_agent_access_token, remaining_ttl_from_timestamp

router = APIRouter(prefix="/agents", tags=["agents"])
settings = get_settings()


async def _get_owned_agent(db: AsyncSession, payload: dict[str, Any], agent_id: UUID) -> Agent:
    if can_view_global(payload):
        result = await db.execute(select(Agent).where(Agent.id == agent_id))
    else:
        sub = payload.get("sub")
        result = await db.execute(
            select(Agent)
            .join(User, User.id == Agent.user_id)
            .where(Agent.id == agent_id, User.auth0_id == sub)
        )
    agent = result.scalar_one_or_none()
    if agent is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found.")
    return agent


async def _blacklist_recent_agent_tokens(
    *,
    db: AsyncSession,
    redis: Redis,
    agent_id: UUID,
) -> int:
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=settings.token_expire_seconds)
    issued_logs = await db.execute(
        select(AuditLog).where(
            AuditLog.agent_id == agent_id,
            AuditLog.action == "token_issued",
            AuditLog.timestamp >= cutoff,
            AuditLog.token_id.is_not(None),
        )
    )

    revoked_count = 0
    for log in issued_logs.scalars().all():
        if not log.token_id:
            continue
        ttl = remaining_ttl_from_timestamp(log.timestamp, settings.token_expire_seconds)
        if ttl <= 0:
            continue
        await blacklist_token(redis, log.token_id, ttl)
        revoked_count += 1
    return revoked_count


@router.post(
    "",
    response_model=AgentCreateResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_auth0_scopes({"create:agents"}))],
)
async def create_agent(
    payload: AgentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AgentCreateResponse:
    plain_secret = generate_agent_secret()
    agent = Agent(
        name=payload.name,
        user_id=current_user.id,
        allowed_scopes=payload.allowed_scopes,
        secret_hash=hash_secret(plain_secret),
    )
    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    return AgentCreateResponse(
        id=agent.id,
        name=agent.name,
        allowed_scopes=agent.allowed_scopes,
        is_active=agent.is_active,
        created_at=agent.created_at,
        secret=plain_secret,
    )


@router.get(
    "",
    response_model=list[AgentOut],
    dependencies=[Depends(require_auth0_scopes({"read:agents"}))],
)
async def list_agents(
    payload: dict[str, Any] = Depends(get_auth0_payload),
    db: AsyncSession = Depends(get_db),
) -> list[AgentOut]:
    if can_view_global(payload):
        result = await db.execute(select(Agent).order_by(Agent.created_at.desc()))
    else:
        result = await db.execute(
            select(Agent)
            .where(Agent.user_id == current_user.id)
            .order_by(Agent.created_at.desc())
        )
    return list(result.scalars().all())


@router.patch(
    "/{agent_id}",
    response_model=AgentOut,
    dependencies=[Depends(require_auth0_scopes({"update:agents"}))],
)
async def update_agent(
    agent_id: UUID,
    payload: AgentUpdate,
    payload: dict[str, Any] = Depends(get_auth0_payload),
    db: AsyncSession = Depends(get_db),
) -> AgentOut:
    agent = await _get_owned_agent(db, payload, agent_id)

    if payload.name is not None:
        agent.name = payload.name
    if payload.allowed_scopes is not None:
        agent.allowed_scopes = payload.allowed_scopes
    if payload.is_active is not None:
        agent.is_active = payload.is_active

    await db.commit()
    await db.refresh(agent)
    return agent


@router.delete(
    "/{agent_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    dependencies=[Depends(require_auth0_scopes({"delete:agents"}))],
)
async def delete_agent(
    agent_id: UUID,
    request: Request,
    payload: dict[str, Any] = Depends(get_auth0_payload),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> Response:
    agent = await _get_owned_agent(db, payload, agent_id)
    await _blacklist_recent_agent_tokens(
        db=db,
        redis=redis,
        agent_id=agent.id,
    )
    source_ip = request.client.host if request.client else None
    await create_audit_log(
        db=db,
        agent_id=agent.id,
        user_id=agent.user_id,
        action="revoked",
        scopes=[],
        token_id=None,
        ip_address=source_ip,
    )
    await db.delete(agent)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{agent_id}/rotate-secret",
    response_model=AgentSecretRotateResponse,
    dependencies=[Depends(require_auth0_scopes({"rotate:secret"}))],
)
async def rotate_agent_secret(
    agent_id: UUID,
    payload: dict[str, Any] = Depends(get_auth0_payload),
    db: AsyncSession = Depends(get_db),
) -> AgentSecretRotateResponse:
    agent = await _get_owned_agent(db, payload, agent_id)
    plain_secret = generate_agent_secret()
    agent.secret_hash = hash_secret(plain_secret)
    await db.commit()
    return AgentSecretRotateResponse(agent_id=agent.id, secret=plain_secret)


@router.post(
    "/{agent_id}/secret",
    response_model=SecretStoreResponse,
    dependencies=[Depends(require_auth0_scopes({"update:agents"}))],
)
async def store_agent_secret(
    agent_id: UUID,
    payload: AgentSecretStore,
    payload: dict[str, Any] = Depends(get_auth0_payload),
    db: AsyncSession = Depends(get_db),
) -> SecretStoreResponse:
    agent = await _get_owned_agent(db, payload, agent_id)
    name = payload.name.strip()
    if not name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Secret name cannot be blank.",
        )
    encrypted = encrypt_api_key(payload.api_key)
    result = await db.execute(
        select(AgentSecret).where(
            AgentSecret.agent_id == agent.id,
            AgentSecret.name == name,
        )
    )
    secret = result.scalar_one_or_none()
    if secret:
        secret.encrypted_key = encrypted
    else:
        secret = AgentSecret(agent_id=agent.id, name=name, encrypted_key=encrypted)
        db.add(secret)
    await db.commit()
    return SecretStoreResponse(status="stored", name=name)


@router.get(
    "/{agent_id}/secrets",
    response_model=list[AgentSecretOut],
    dependencies=[Depends(require_auth0_scopes({"read:agents"}))],
)
async def list_agent_secrets(
    agent_id: UUID,
    payload: dict[str, Any] = Depends(get_auth0_payload),
    db: AsyncSession = Depends(get_db),
) -> list[AgentSecretOut]:
    agent = await _get_owned_agent(db, payload, agent_id)
    result = await db.execute(
        select(AgentSecret)
        .where(AgentSecret.agent_id == agent.id)
        .order_by(AgentSecret.created_at.desc())
    )
    return [
        AgentSecretOut(name=secret.name, created_at=secret.created_at)
        for secret in result.scalars().all()
    ]


@router.post("/{agent_id}/request-token", response_model=TokenResponse)
async def request_agent_token(
    agent_id: UUID,
    request: Request,
    payload: TokenRequest | None = Body(default=None),
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> TokenResponse:
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if agent is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found.")
    if not agent.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Agent is inactive.")

    body_secret = payload.agent_secret if payload else None
    supplied_secret = body_secret or extract_bearer_token(authorization)
    if not supplied_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Agent secret is required in Authorization bearer token or request body.",
        )
    if not verify_secret(supplied_secret, agent.secret_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid agent secret.",
        )

    await enforce_agent_rate_limit(
        redis,
        str(agent.id),
        settings.rate_limit_requests_per_minute,
        60,
    )

    requested_scopes = payload.requested_scopes if payload else None
    desired_scopes = requested_scopes if requested_scopes is not None else agent.allowed_scopes
    granted_scopes = [scope for scope in desired_scopes if scope in agent.allowed_scopes]
    if not granted_scopes:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No requested scopes are allowed for this agent.",
        )

    token, token_id, expires_in = create_agent_access_token(
        agent_id=agent.id,
        user_id=agent.user_id,
        scopes=granted_scopes,
    )

    source_ip = request.client.host if request.client else None
    await create_audit_log(
        db=db,
        agent_id=agent.id,
        user_id=agent.user_id,
        action="token_issued",
        scopes=granted_scopes,
        token_id=token_id,
        ip_address=source_ip,
    )
    return TokenResponse(token=token, expires_in=expires_in)


@router.post(
    "/{agent_id}/revoke",
    response_model=RevokeResponse,
    dependencies=[Depends(require_auth0_scopes({"revoke:agent"}))],
)
async def revoke_agent_tokens(
    agent_id: UUID,
    request: Request,
    payload: dict[str, Any] = Depends(get_auth0_payload),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> RevokeResponse:
    agent = await _get_owned_agent(db, payload, agent_id)
    agent.is_active = False
    await db.commit()
    revoked_count = await _blacklist_recent_agent_tokens(
        db=db,
        redis=redis,
        agent_id=agent.id,
    )

    source_ip = request.client.host if request.client else None
    await create_audit_log(
        db=db,
        agent_id=agent.id,
        user_id=agent.user_id,
        action="revoked",
        scopes=[],
        token_id=None,
        ip_address=source_ip,
    )
    return RevokeResponse(agent_id=agent.id, revoked_jti_count=revoked_count)
