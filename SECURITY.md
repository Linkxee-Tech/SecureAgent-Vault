# SECURITY

## IAM

- Frontend Auth: Delegated to Auth0 (OIDC/OAuth2). No password processing in backend.
- API Auth: Auth0 JWT scope constraints (`read:agents`, `write:agents`, `read:audit`, `admin`). Signature verified via external JWKS.

## Agent Credentials

- Storage: Agent secrets generated server-side. Persisted via one-way bcrypt digest. Unrecoverable.
- API Keys: Encrypted at rest. Algorithm: AES-256-GCM. Implementation constraint: Unique random nonce per record.

## Token Lifecycle

- Issuance: HS256 algorithm. Symmetric signing key. Configurable TTL.
- Scoping: JWT permission bounds derived from Postgres agent record.
- Revocation: Extraction of token `jti`. Redis blacklist entry mapped to token TTL.
- Throttling: Redis counter implementation on issuance endpoints to drop high-frequency requesters.

## Audit Subsystem

- Record Integrity: SHA-256 hash chain. Input sequence: timestamp, action, target, actor, `previous_hash`.
- Tamper detection: Modification of row N invalidates computed `hash` bounds of sequence N+1...M.

## Network Topology

- Postgres and Redis: Internal Docker bridge. No host exposure.
- Application Layer: HTTP boundaries on mapped ports.
- Configuration: Secret injection strictly bound to process environment vectors. Zero commit policy.
