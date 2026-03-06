from datetime import datetime, timezone

from fastapi import HTTPException, status
from redis.asyncio import Redis

BLACKLIST_PREFIX = "blacklist:jti:"
RATE_LIMIT_PREFIX = "ratelimit:agent:"


async def blacklist_token(redis: Redis, token_id: str, ttl_seconds: int) -> None:
    if ttl_seconds <= 0:
        return
    await redis.setex(f"{BLACKLIST_PREFIX}{token_id}", ttl_seconds, "1")


async def is_token_blacklisted(redis: Redis, token_id: str) -> bool:
    exists = await redis.exists(f"{BLACKLIST_PREFIX}{token_id}")
    return bool(exists)


async def enforce_agent_rate_limit(
    redis: Redis,
    agent_id: str,
    limit: int,
    window_seconds: int,
) -> None:
    current_bucket = int(datetime.now(timezone.utc).timestamp() // window_seconds)
    key = f"{RATE_LIMIT_PREFIX}{agent_id}:{current_bucket}"
    current = await redis.incr(key)
    if current == 1:
        await redis.expire(key, window_seconds)
    if current > limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded for this agent.",
        )

