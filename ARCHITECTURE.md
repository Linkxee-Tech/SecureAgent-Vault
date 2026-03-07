# ARCHITECTURE

## Components

### 1. Frontend
- React SPA.
- Auth0 React SDK integration.
- Bearer token distribution via REST.

### 2. Backend
- FastAPI runtime.
- Auth0 JWT signature validation via JWKS.
- Execution of AES-256-GCM external key encryption.
- Execution of bcrypt hash generation for secrets.
- SHA-256 hash chaining for audit logs.
- Short-lived HS256 JWT issuance for agents.

### 3. Database
- PostgreSQL persistent storage.
- Alembic schema migrations.

### 4. Cache
- Redis instance.
- Request rate limit enforcement.
- JWT `jti` revocation blacklist.

## Request Lifecycle

1. SPA obtains Auth0 Access Token.
2. SPA transmits request to Backend with Bearer Token.
3. Backend validates RSA signature and scopes via Auth0 JWKS.
4. Agent submits ID and Secret to `/request-token`.
5. Backend executes bcrypt validation and Redis rate limit check.
6. Backend returns HS256 signed JWT.
7. Postgres write operations trigger chained hash computation in `audit_logs` table.
