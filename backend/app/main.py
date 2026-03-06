from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from redis.asyncio import Redis
from sqlalchemy.exc import SQLAlchemyError

from app.api.router import api_router
from app.core.config import get_settings

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.redis = Redis.from_url(settings.redis_url, decode_responses=True)
    try:
        await app.state.redis.ping()
    except Exception:
        # Redis is optional during local development; routes that need it will fail explicitly.
        pass
    yield
    if hasattr(app.state.redis, "aclose"):
        await app.state.redis.aclose()
    else:
        await app.state.redis.close()


app = FastAPI(title=settings.project_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.exception_handler(SQLAlchemyError)
async def database_exception_handler(_request, _exc: SQLAlchemyError):
    return JSONResponse(
        status_code=503,
        content={
            "detail": "Database is unavailable. Check DATABASE_URL and PostgreSQL credentials.",
        },
    )


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "name": settings.project_name,
        "docs": "/docs",
        "health": "/health",
        "versioned_health": f"{settings.api_v1_prefix}/health",
    }


@app.get("/health")
async def root_health() -> dict[str, str]:
    return {"status": "ok"}
