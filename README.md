# SecureAgent Vault

Token broker for issuing short-lived, scoped JWTs to automated agents based on identity, scope, and policy validation.

## Tech Stack

- Backend: FastAPI, SQLAlchemy, Alembic
- Database: PostgreSQL
- Cache/Rate Limit: Redis
- Frontend: React, Vite, Tailwind CSS, Auth0 SDK
- Runtime: Docker Compose

## Core Capabilities

- Auth0 JWKS access-token validation.
- Scope enforcement: `read:agents`, `write:agents`, `read:audit`, `admin`.
- Agent management: CRUD, secret rotation, AES-256-GCM API key encryption.
- Token issuance: bcrypt secret verification, HS256 JWT generation, Redis rate limiting.
- Auditing: SHA-256 chained log entries.

## Docs

- [Architecture](ARCHITECTURE.md)
- [Auth0 Setup](AUTH0_SETUP.md)
- [Security](SECURITY.md)
- [Operational Guide](USER_GUIDE.md)

## Development Setup

1. Copy environments:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
2. Populate Auth0 values in `.env` files.
3. Start stack:
   ```bash
   docker compose up --build
   ```

## Endpoints

- Base: `GET /api/v1/health`, `GET /api/v1/config/public`
- Agent List: `GET /api/v1/agents`
- Agent Mutate: `POST /PATCH /DELETE /api/v1/agents`
- Agent Auth: `POST /api/v1/agents/{id}/rotate-secret`, `POST /api/v1/agents/{id}/request-token`, `POST /api/v1/agents/{id}/revoke`
- Audit Logs: `GET /api/v1/audit`
