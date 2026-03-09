# BACKEND SPECIFICATION

FastAPI instance mapping short-lived, scoped JWTs bounded to target agents.

## Stack Allocation

- Python 3.11+
- FastAPI
- SQLAlchemy (async) / asyncpg
- Alembic
- Redis
- Auth0 (OIDC JWKS)

## Operational Vectors

- Access-token validation pipeline (issuer, audience, signature, TTL).
- Policy bounds derived from frontend REST scopes.
- Implicit auto-provisioning extracted from Auth0 `sub`.
- Target manipulation:
  - Agent CRUD
  - Secret rotation constraints
  - External API key injection
- Issuance constraints:
  - bcrypt evaluation
  - Internal scope validation
  - HS256 JWT rendering
- Denial targets:
  - Boolean deactivation switch
  - Redis JTI ingestion
- Immutability layer:
  - Append-only sequence logic
  - Cryptographic state transition (Hash chaining)

## File Tree

- `app/main.py`: Base event loop, router config, CORS boundaries.
- `app/api/`: Endpoint resolution mappings.
- `app/models/`: Object relational mappings.
- `app/services/`: Core crypto logic and network targets.
- `alembic/`: Schema execution graphs.

## Configuration Requirements

Copy `.env.example` -> `.env`.

Matrix:
- `AUTH0_DOMAIN`
- `AUTH0_AUDIENCE`
- `AUTH0_ALGORITHMS`
- `DEV_BYPASS_AUTH`
- `DATABASE_URL`
- `REDIS_URL`
- `ENCRYPTION_KEY`
- `JWT_SECRET_KEY`
- `JWT_ALGORITHM`
- `TOKEN_EXPIRE_SECONDS`
- `CORS_ORIGINS`
- `WEATHER_PROVIDER`
- `WEATHER_API_KEY_NAME`

Network parameters:
- Internal resolution targeting `localhost` outside isolated Docker networks. Docker execution overrides DNS boundary to `db`, `redis`.

## Shell Execution

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Swagger instance port binding: `http://localhost:8000/docs`

## Test Vectors

Local scope constraints:
```powershell
cd backend
.venv\Scripts\python.exe -m unittest discover -s tests -p "test_*.py" -v
```

Remote scope target mapping:
```powershell
cd backend
.venv\Scripts\python.exe .\tests\run_live_integration.py
```

## Migration Target Layer

```powershell
cd backend
alembic upgrade head
alembic revision --autogenerate -m "ID"
```

## Policy Scopes

Bearer validation bounds:
- `read:agents`
- `create:agents`
- `update:agents`
- `delete:agents`
- `rotate:secret`
- `revoke:agent`
- `read:audit`
- `admin`
Agent endpoints internal bounding condition:
- `POST /api/v1/agents/{id}/request-token` uses agent secret hash comparison.

## Routings

- `GET /api/v1/health`
- `GET /api/v1/config/public`
- `POST /PATCH /GET /DELETE /api/v1/agents`
- `POST /api/v1/agents/{id}/rotate-secret`
- `POST /GET /api/v1/agents/{id}/secret`
- `POST /api/v1/agents/{id}/request-token`
- `POST /api/v1/agents/{id}/revoke`
- `GET /api/v1/audit`
- `GET /api/v1/tools/weather`
