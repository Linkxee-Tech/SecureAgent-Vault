# SecureAgent Vault Backend

FastAPI service for issuing short-lived, scoped JWTs to registered agents after authentication and policy checks.

## Tech Stack

- Python 3.11+
- FastAPI
- SQLAlchemy (async) + asyncpg
- Alembic
- Redis (revocation + rate limiting)
- Auth0 (OIDC access-token validation via JWKS)

## Implemented Capabilities

- Auth0 access-token validation (issuer, audience, signature, expiry).
- Scope checks on user-facing endpoints.
- User auto-provisioning from Auth0 `sub`.
- Agent lifecycle:
  - Create, list, update, delete
  - Rotate agent secret
  - Store encrypted API keys (multiple per agent)
- Agent token issuance:
  - Agent secret verification (bcrypt)
  - Scope intersection with `allowed_scopes`
  - Short TTL signed JWT (`HS256`)
- Revocation:
  - Agent deactivation
  - Redis JTI blacklist
- Audit:
  - Issuance and revoke events
  - Previous-hash + hash fields for tamper-evidence
- Demo protected tool endpoint: weather API requiring `read:weather`.

## Project Layout

- `app/main.py` app startup, CORS, lifespan, router mounting.
- `app/api/` route handlers and dependencies.
- `app/models/` SQLAlchemy models.
- `app/services/` Auth0, crypto, tokens, revocation, audit logic.
- `alembic/` DB migrations.

## Environment Variables

Copy `.env.example` to `.env` in `backend/`.

Required:

- `AUTH0_DOMAIN`
- `AUTH0_AUDIENCE`
- `AUTH0_ALGORITHMS` (default `RS256`)
- `DEV_BYPASS_AUTH` (default `false`; set `true` only for local no-Auth0 development)
- `DATABASE_URL`
- `REDIS_URL`
- `ENCRYPTION_KEY` (32-byte key, raw or base64-encoded)
- `JWT_SECRET_KEY`
- `JWT_ALGORITHM` (default `HS256`)
- `TOKEN_EXPIRE_SECONDS` (default `120`)
- `CORS_ORIGINS`
- `WEATHER_PROVIDER` (default `demo`, set `weatherapi` to use WeatherAPI)
- `WEATHER_API_KEY_NAME` (default `weatherapi`)

Format notes:

- `AUTH0_ALGORITHMS` supports `RS256` or comma-separated values (for example `RS256,ES256`).
- `CORS_ORIGINS` supports a single origin or comma-separated values.
- For local (non-Docker) runs use `localhost` hosts in `DATABASE_URL` and `REDIS_URL`.
- In Docker Compose, these are overridden to service hosts (`db`, `redis`) automatically.

Present for integration completeness:

- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`
- `OPA_URL` (optional, not yet enforced in runtime flow)

## Run Locally (Python)

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Docs will be available at:

- `http://localhost:8000/docs`
- `http://localhost:8000/redoc`

## Run Feature Tests

```powershell
cd backend
.venv\Scripts\python.exe -m unittest discover -s tests -p "test_*.py" -v
```

## Run Live Integration

Requirements:
- Backend running on `http://localhost:8000`
- Reachable PostgreSQL and Redis
- Real Auth0 values in `backend/.env`

Command:

```powershell
cd backend
.venv\Scripts\python.exe .\tests\run_live_integration.py
```

## Run with Docker Compose

From repo root:

```powershell
docker compose up --build
```

Backend runs on `http://localhost:8000`.

## Troubleshooting

- `error parsing value for field "auth0_algorithms"`:
  - fixed in current code; ensure you are on latest files and retry.
- `socket.gaierror: getaddrinfo failed` during `alembic upgrade head`:
  - your `DATABASE_URL` likely uses `@db:` while running outside Docker.
  - switch to `@localhost:` for local runs.
- `InvalidPasswordError: password authentication failed for user "postgres"`:
  - update `DATABASE_URL` with your local Postgres username/password, or
  - run Postgres from Docker Compose with matching credentials.

## Migrations

```powershell
cd backend
alembic upgrade head
alembic revision --autogenerate -m "your message"
```

## Auth and Scopes

User-facing endpoints require Auth0 bearer token with scopes:

- `read:agents` for listing agents
- `write:agents` for create/update/delete/rotate/store-secret
- `read:audit` for audit listing
- `admin` + `write:agents` for revoke endpoint

Agent-facing token endpoint:

- `POST /api/v1/agents/{id}/request-token`
- Authenticates with agent secret (header bearer or body `agent_secret`)
- Does not use Auth0 user access token

## Endpoint Summary

- `GET /api/v1/health`
- `GET /api/v1/config/public`
- `POST /api/v1/agents`
- `GET /api/v1/agents`
- `PATCH /api/v1/agents/{agent_id}`
- `DELETE /api/v1/agents/{agent_id}`
- `POST /api/v1/agents/{agent_id}/rotate-secret`
- `POST /api/v1/agents/{agent_id}/secret`
- `GET /api/v1/agents/{agent_id}/secrets`
- `POST /api/v1/agents/{agent_id}/request-token`
- `POST /api/v1/agents/{agent_id}/revoke`
- `GET /api/v1/audit`
- `GET /api/v1/tools/weather`

## Security Notes

- API keys are stored as `nonce + ciphertext` encrypted with AES-256-GCM.
- Agent secrets are hashed with bcrypt and never stored plaintext.
- Vault tokens include `jti` and are checked against Redis blacklist.
- Vault tokens use the internal user UUID for the `user_id` claim.
- Audit entries include `previous_hash` and `hash` for tamper-evidence.

## Weather Tool Notes

- Default `WEATHER_PROVIDER=demo` returns a stub response for local use.
- Set `WEATHER_PROVIDER=weatherapi` and store a secret named `weatherapi` to call the live provider.
