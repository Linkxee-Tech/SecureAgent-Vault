# SecureAgent Vault – Complete Development Workflow (Aligned to This Repo)

This is a step‑by‑step, no‑skip workflow that matches the current codebase. Each phase includes a test step. Follow in order.

**Phase 0: Prerequisites**
1. Install Python 3.11+, Node.js 18+, Docker Desktop (optional).
2. Ensure PostgreSQL 14+ and Redis 7+ are running locally, or use Docker Compose.

**Phase 1: Repository Setup**
1. Clone or unzip the repo.
2. Verify structure:
   - `backend/`
   - `frontend/`
   - `docker-compose.yml`
   - `README.md`
3. Test: `rg --files` from the repo root should list backend and frontend files.

**Phase 2: Backend Environment**
1. Create and activate a venv:
```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\Activate.ps1
# macOS/Linux
source .venv/bin/activate
```
2. Install dependencies:
```bash
pip install -r requirements.txt
```
3. Configure `backend/.env`:
```env
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your_client_id
AUTH0_CLIENT_SECRET=your_client_secret
AUTH0_AUDIENCE=https://secureagentvault/api
AUTH0_ALGORITHMS=RS256

DATABASE_URL=postgresql+asyncpg://vault:vaultpass@localhost:5432/vault
REDIS_URL=redis://localhost:6379/0

ENCRYPTION_KEY=raw_32_bytes_or_base64_32_bytes
JWT_SECRET_KEY=your_strong_secret_min_32_chars
JWT_ALGORITHM=HS256
TOKEN_EXPIRE_SECONDS=120

DEV_BYPASS_AUTH=false
CORS_ORIGINS=http://localhost:3000
WEATHER_PROVIDER=demo
WEATHER_API_KEY_NAME=weatherapi
```
4. Test: run a smoke import to ensure settings load:
```bash
python -c "from app.core.config import get_settings; print(get_settings().project_name)"
```

**Phase 3: Database Migrations**
1. Start Postgres and Redis:
```bash
docker compose up -d db redis
```
2. Apply migrations:
```bash
alembic upgrade head
```
3. Test: connect to Postgres and verify tables exist:
   - `users`, `agents`, `agent_secrets`, `audit_logs`

**Phase 4: Backend Runtime**
1. Start API:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
2. Test health:
```bash
curl http://localhost:8000/api/v1/health
```

**Phase 5: Auth0 Configuration**
1. Create a Regular Web Application for the frontend.
2. Create an API with Identifier `https://secureagentvault/api` and RS256.
3. Add scopes:
   - `read:agents`
   - `write:agents`
   - `read:audit`
   - `admin` (required for revoke)
4. Test token acquisition using Auth0 client credentials. Use that token for steps below.

**Phase 6: Core API Flow**
1. Create agent:
```bash
curl -X POST http://localhost:8000/api/v1/agents \
  -H "Authorization: Bearer <AUTH0_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"WeatherBot","allowed_scopes":["read:weather"]}'
```
2. Test: response includes `secret`.
3. Store a secret (named):
```bash
curl -X POST http://localhost:8000/api/v1/agents/<AGENT_ID>/secret \
  -H "Authorization: Bearer <AUTH0_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"weatherapi","api_key":"test-key"}'
```
4. Request a short‑lived token:
```bash
curl -X POST http://localhost:8000/api/v1/agents/<AGENT_ID>/request-token \
  -H "Content-Type: application/json" \
  -d '{"agent_secret":"<AGENT_SECRET>","requested_scopes":["read:weather"]}'
```
5. Call a protected tool:
```bash
curl -H "Authorization: Bearer <VAULT_TOKEN>" \
  "http://localhost:8000/api/v1/tools/weather?city=Paris"
```
6. Test: 200 response with weather data.
7. Audit check:
```bash
curl -H "Authorization: Bearer <AUTH0_ACCESS_TOKEN>" \
  "http://localhost:8000/api/v1/audit?limit=50&offset=0"
```
8. Revoke tokens:
```bash
curl -X POST http://localhost:8000/api/v1/agents/<AGENT_ID>/revoke \
  -H "Authorization: Bearer <AUTH0_ACCESS_TOKEN>"
```
9. Test: repeated tool call with old vault token should return 401.

**Phase 7: Frontend**
1. Configure `frontend/.env`:
```env
VITE_API_BASE_URL=/api/v1
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your_client_id
VITE_AUTH0_AUDIENCE=https://secureagentvault/api
VITE_AUTH0_SCOPE=read:agents write:agents read:audit admin
```
2. Install dependencies:
```bash
cd frontend
npm install
```
3. Run:
```bash
npm run dev
```
4. Test:
   - Login via Auth0.
   - Create agent.
   - Rotate secret.
   - Store named API key.
   - Revoke tokens.
   - Audit page shows entries with `previous_hash` and `hash`.

**Phase 8: Full Stack via Docker Compose**
1. Build and run:
```bash
docker compose up --build
```
2. Test:
   - Backend at `http://localhost:8000/api/v1/health`
   - Frontend at `http://localhost:3000`

**Phase 9: Automated Tests**
1. Run unit tests:
```bash
cd backend
.venv\Scripts\python.exe -m unittest discover -s tests -p "test_*.py" -v
```
2. Run live integration test (requires real Auth0 credentials):
```bash
.venv\Scripts\python.exe .\tests\run_live_integration.py
```
