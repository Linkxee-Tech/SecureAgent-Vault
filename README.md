# SecureAgent Vault

SecureAgent Vault is a token broker that issues short-lived, scoped JWTs to agents after identity, scope, and policy checks.

## Stack

- Backend: FastAPI + SQLAlchemy + Alembic
- Database: PostgreSQL
- Cache/Revocation/Rate limit: Redis
- Frontend: React + Vite + Tailwind + Auth0 React SDK
- Deployment: Docker Compose

## Implemented Features

- Auth0 access-token validation via JWKS.
- Auth0 scope enforcement for user APIs:
  - `read:agents`
  - `write:agents`
  - `read:audit`
  - `admin` (required only for revoke endpoint)
- User auto-provisioning from Auth0 `sub`.
- Agent CRUD:
  - Create/list/update/delete agents
  - Rotate agent secret
  - Store encrypted API keys (`AES-256-GCM`, `nonce + ciphertext`)
- Agent token issuance:
  - Agent secret verification (bcrypt)
  - Scope intersection and enforcement
  - Short-lived JWT generation (`HS256`, configurable TTL)
  - Rate limiting per agent in Redis
- Revocation:
  - Agent deactivation
  - Blacklisting outstanding token `jti` values in Redis
- Audit:
  - Tamper-evident entries with `previous_hash` and `hash`
  - Query endpoint with pagination support
- Protected demo endpoint:
  - `GET /api/v1/tools/weather` requires `read:weather` vault scope.

## Repository Layout

- `backend/` FastAPI app, services, models, and Alembic migrations.
- `frontend/` React dashboard with modern SaaS-style UI:
  - **Sidebar navigation** with icons (Dashboard, Agents, Audit)
  - **Dashboard home** with statistics cards and recent activity
  - **Agent management** with search/filter functionality
  - **Agent detail** page with inline editing and security controls
  - **Audit viewer** with tamper-evident log display
  - **Heroicons** integration for consistent iconography
- `docker-compose.yml` local stack for postgres, redis, backend, and frontend.
- `DASHBOARD_FEATURES.md` detailed documentation of UI features.

## Local Setup

1. Copy environment files:
   - `backend/.env.example` -> `backend/.env`
   - `frontend/.env.example` -> `frontend/.env`
2. Fill Auth0 and secret values.
   - For local backend execution, set `DATABASE_URL`/`REDIS_URL` to `localhost`.
   - For Docker Compose, service hosts are overridden to `db`/`redis`.
3. Ensure your Auth0 API defines and grants:
   - `read:agents`
   - `write:agents`
   - `read:audit`
   - `admin` (only if you need token revoke endpoint in UI/API)
4. For a complete, test-after-each-step workflow, see `docs/DEVELOPMENT_WORKFLOW.md`.
5. Start services:

```bash
docker compose up --build
```

If the UI shows "Auth0 Config Missing", run:

```bash
# PowerShell
Copy-Item frontend/.env.example frontend/.env
# Bash
cp frontend/.env.example frontend/.env
docker compose up -d --build frontend
```

## Endpoints

- Health: `GET /api/v1/health`
- Public config: `GET /api/v1/config/public`
- Agents:
  - `POST /api/v1/agents`
  - `GET /api/v1/agents`
  - `PATCH /api/v1/agents/{id}`
  - `DELETE /api/v1/agents/{id}`
  - `POST /api/v1/agents/{id}/rotate-secret`
  - `POST /api/v1/agents/{id}/secret`
  - `GET /api/v1/agents/{id}/secrets`
  - `POST /api/v1/agents/{id}/request-token`
  - `POST /api/v1/agents/{id}/revoke`
- Audit:
  - `GET /api/v1/audit`
- Tool demo:
  - `GET /api/v1/tools/weather`

## Notes

- `POST /api/v1/agents/{id}/request-token` is agent-facing and authenticates with the agent secret (bearer or body), not Auth0 user access token.
- `POST /api/v1/agents/{id}/revoke` currently requires an Auth0 token with `admin` scope and ownership of the agent.
- Frontend auto-loads Auth0 config from `GET /api/v1/config/public` when `frontend/.env` Auth0 values are missing.
