# User Operational Guide

This guide outlines the standard operational procedures for provisioning agents and managing credentials within the SecureAgent Vault environment.

## Pre-conditions

1. Docker Compose stack is active.
2. Auth0 tenant configuration is validated per `AUTH0_SETUP.md`.
3. Authorized operator credentials are available.

## Execution Procedures

### Phase 1: Authentication
1. Navigate to the SecureAgent Vault console (`http://localhost:5173`).
2. Complete the Auth0 sign-in sequence.
3. Verify successful redirection to the main dashboard.

### Phase 2: Agent Provisioning
1. Select the **Agents** tab.
2. Select **Register New Agent**.
3. Input specific configuration:
   - **Name**: `Production-Agent-01`
   - **Scopes**: `read:weather`
4. Confirm registration.
5. Capture and securely store the **Agent Secret** from the verification modal.

### Phase 3: Integrity Audit
1. Select the **Audit** tab.
2. Verify the presence of the newest cryptographic sequence entry.
3. Confirm the entry contains the registration event and calculated SHA-256 fingerprint.

### Phase 4: Token Acquisition
1. Perform a secure token exchange via the API:
```bash
curl -X POST http://localhost:8000/api/v1/agents/<AGENT_ID>/request-token \
  -H "Content-Type: application/json" \
  -d '{"secret": "<AGENT_SECRET>"}'
```
2. Verify the short-lived `access_token` in the JSON response.

### Phase 5: Resource Access
1. Call the protected resource endpoint:
```bash
curl -X GET http://localhost:8000/api/v1/tools/weather \
  -H "Authorization: Bearer <AGENT_TOKEN>"
```
2. Verify successful retrieval of requested telemetry data.

### Phase 6: Blacklisting & Revocation
1. Identify the agent in the **Agents** console.
2. Select **Deactivate** or **Revoke Access**.
3. Re-attempt the resource access from Phase 5.
4. Verify immediate rejection and session termination.
