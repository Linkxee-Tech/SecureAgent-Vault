# DEMO SCRIPT

## Pre-conditions

1. Docker Compose running.
2. Auth0 tenant configured per `AUTH0_SETUP.md`.
3. Valid target user credential available.

## Execution

### Phase 1: Authentication
1. Navigate to `http://localhost:5173`.
2. Execute Auth0 login sequence.
3. Verify dashboard redirect.

### Phase 2: Agent Provisioning
1. Select Agents tab.
2. Select Create Agent.
3. Input:
   - Name: `Demo Agent`
   - Description: `Target test agent`
   - Scopes: `read:weather`
4. Submit.
5. Capture Agent Secret from UI modal.

### Phase 3: Audit Verification
1. Select Audit tab.
2. Locate newest sequence entry.
3. Verify payload contains `Demo Agent` creation event and calculated SHA-256 hash.

### Phase 4: Token Exchange
1. Execute curl command:
```bash
curl -X POST http://localhost:8000/api/v1/agents/<AGENT_ID>/request-token \
  -H "Content-Type: application/json" \
  -d '{"secret": "<AGENT_SECRET>"}'
```
2. Capture `access_token` from JSON output.

### Phase 5: Resource Access
1. Execute curl command:
```bash
curl -X GET http://localhost:8000/api/v1/tools/weather \
  -H "Authorization: Bearer <AGENT_TOKEN>"
```
2. Verify HTTP 200 JSON payload response.

### Phase 6: Revocation
1. Navigate to Agents tab in UI.
2. Select `Demo Agent`.
3. Execute `Deactivate`.
4. Run curl command from Phase 5.
5. Verify HTTP 403 / 401 rejection response.
