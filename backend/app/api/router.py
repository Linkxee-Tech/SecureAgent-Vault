from fastapi import APIRouter

from app.api.routes import agents, audit, config, health, tools

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(config.router)
api_router.include_router(agents.router)
api_router.include_router(audit.router)
api_router.include_router(tools.router)
