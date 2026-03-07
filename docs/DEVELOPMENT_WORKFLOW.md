# DEVELOPMENT WORKFLOW

## Phase 0: System Requirements
1. Python 3.11+
2. Node.js 18+
3. Docker Desktop (optional)
4. PostgreSQL 14+
5. Redis 7+

## Phase 1: Repository Target
1. Clone target.
2. Structure check:
   - `backend/`
   - `frontend/`
   - `docker-compose.yml`
   - `README.md`

## Phase 2: Backend initialization
1. Virtual environment:
```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\Activate.ps1
# macOS/Linux
source .venv/bin/activate
```
2. Dependencies:
```bash
pip install -r requirements.txt
```
3. Configuration (`backend/.env`):
```env
AUTH0_DOMAIN=YOUR_TENANT.auth0.com
AUTH0_CLIENT_ID=YOUR_CLIENT_ID
AUTH0_CLIENT_SECRET=YOUR_CLIENT_SECRET
AUTH0_AUDIENCE=https://secureagentvault/api
AUTH0_ALGORITHMS=RS256

DATABASE_URL=postgresql+asyncpg://vault:vaultpass@localhost:5432/vault
REDIS_URL=redis://localhost:6379/0

ENCRYPTION_KEY=RAW_32_BYTES_OR_BASE64
JWT_SECRET_KEY=STRONG_SECRET_MIN_32_CHARS
JWT_ALGORITHM=HS256
TOKEN_EXPIRE_SECONDS=120

DEV_BYPASS_AUTH=false
CORS_ORIGINS=http://localhost:3000
WEATHER_PROVIDER=demo
WEATHER_API_KEY_NAME=weatherapi
```
4. Load validation:
```bash
python -c "from app.core.config import get_settings; print(get_settings().project_name)"
```

## Phase 3: Infrastructure and Schema
1. Target start:
```bash
docker compose up -d db redis
```
2. Migrations execution:
```bash
alembic upgrade head
```
3. Table validation: `users`, `agents`, `agent_secrets`, `audit_logs`

## Phase 4: API Execution
1. Startup:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
2. Health check:
```bash
curl http://localhost:8000/api/v1/health
```

## Phase 5: Auth0 Mapping
1. SPA Application allocation.
2. API Configuration (Identifier: `https://secureagentvault/api`, ALGO: `RS256`).
3. Scopes binding:
   - `read:agents`
   - `write:agents`
   - `read:audit`
   - `admin`
4. Base token acquisition.

## Phase 6: API Integration Tests
1. Agent Object Creation:
```bash
curl -X POST http://localhost:8000/api/v1/agents \
  -H "Authorization: Bearer <AUTH0_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"WeatherBot","allowed_scopes":["read:weather"]}'
```
2. State check: capture `secret`.
3. Secret persistence target:
```bash
curl -X POST http://localhost:8000/api/v1/agents/<AGENT_ID>/secret \
  -H "Authorization: Bearer <AUTH0_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"weatherapi","api_key":"test-key"}'
```
4. Token exchange limit:
```bash
curl -X POST http://localhost:8000/api/v1/agents/<AGENT_ID>/request-token \
  -H "Content-Type: application/json" \
  -d '{"agent_secret":"<AGENT_SECRET>","requested_scopes":["read:weather"]}'
```
5. Endpoint target execution:
```bash
curl -H "Authorization: Bearer <VAULT_TOKEN>" \
  "http://localhost:8000/api/v1/tools/weather?city=Paris"
```
6. Audit sequence mapping:
```bash
curl -H "Authorization: Bearer <AUTH0_ACCESS_TOKEN>" \
  "http://localhost:8000/api/v1/audit?limit=50&offset=0"
```
7. Target revocation:
```bash
curl -X POST http://localhost:8000/api/v1/agents/<AGENT_ID>/revoke \
  -H "Authorization: Bearer <AUTH0_ACCESS_TOKEN>"
```

## Phase 7: Frontend Interface
1. Environment (`frontend/.env`):
```env
VITE_API_BASE_URL=/api/v1
VITE_AUTH0_DOMAIN=YOUR_TENANT.auth0.com
VITE_AUTH0_CLIENT_ID=YOUR_CLIENT_ID
VITE_AUTH0_AUDIENCE=https://secureagentvault/api
VITE_AUTH0_SCOPE=read:agents write:agents read:audit admin
```
2. Build commands:
```bash
cd frontend
npm install
npm run dev
```

## Phase 8: Container Alignment
1. Stack build:
```bash
docker compose up --build
```
2. Port binding: Backend (8000), Frontend (3000).

## Phase 9: Testing Architecture
1. Unit boundaries:
```bash
cd backend
.venv\Scripts\python.exe -m unittest discover -s tests -p "test_*.py" -v
```
2. Integration vectors (External Auth0 dependency):
```bash
.venv\Scripts\python.exe .\tests\run_live_integration.py
```
