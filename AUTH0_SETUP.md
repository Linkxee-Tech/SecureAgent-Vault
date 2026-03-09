# AUTH0 SETUP

## 1. Tenant
Create or select an Auth0 tenant.

## 2. API Configuration
1. Applications > APIs > Create API.
2. Name: `SecureAgent Vault API`
3. Identifier: `https://api.secureagent.local`
4. Algorithm: `RS256`
5. Scopes (Permissions tab):
   - `read:agents`
   - `create:agents`
   - `update:agents`
   - `delete:agents`
   - `rotate:secret`
   - `revoke:agent`
   - `read:audit`
   - `admin`

## 3. SPA Configuration
1. Applications > Applications > Create Application (Single Page Web Applications).
2. URI settings:
   - Allowed Callback URLs: `http://localhost:5173`
   - Allowed Logout URLs: `http://localhost:5173`
   - Allowed Web Origins: `http://localhost:5173`

## 4. Environment Configuration

`backend/.env`:
```ini
AUTH0_DOMAIN="YOUR_TENANT.auth0.com"
AUTH0_API_AUDIENCE="https://api.secureagent.local"
AUTH0_ISSUER="https://YOUR_TENANT.auth0.com/"
```

`frontend/.env`:
```ini
VITE_AUTH0_DOMAIN="YOUR_TENANT.auth0.com"
VITE_AUTH0_CLIENT_ID="YOUR_SPA_CLIENT_ID"
VITE_AUTH0_AUDIENCE="https://api.secureagent.local"
```

## 5. Roles
Create Auth0 Role. Map API scopes to Role. Assign Role to users. Configure Auth0 Action or Rule to append permissions to the JWT.
