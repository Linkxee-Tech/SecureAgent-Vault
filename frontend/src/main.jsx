import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Auth0Provider } from "@auth0/auth0-react";
import App from "./App";
import "./index.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";
const DEV_BYPASS_AUTH = import.meta.env.VITE_DEV_BYPASS_AUTH === "true";
const DEFAULT_AUTH0_SCOPE =
  "openid profile email offline_access name read:agents create:agents update:agents delete:agents rotate:secret revoke:agent read:audit admin";
const REQUIRED_API_SCOPES = ["read:agents", "read:audit"];
const LEGACY_SCOPE_ALIASES = {
  "write:agents": ["read:agents", "create:agents", "update:agents", "delete:agents"],
};
const requiredAuthEnv = {
  VITE_AUTH0_DOMAIN: import.meta.env.VITE_AUTH0_DOMAIN,
  VITE_AUTH0_CLIENT_ID: import.meta.env.VITE_AUTH0_CLIENT_ID,
  VITE_AUTH0_AUDIENCE: import.meta.env.VITE_AUTH0_AUDIENCE,
};
const placeholderPatterns = {
  VITE_AUTH0_DOMAIN: ["your-tenant.auth0.com"],
  VITE_AUTH0_CLIENT_ID: ["your_auth0_client_id", "your_client_id"],
  VITE_AUTH0_AUDIENCE: [],
};

function isMissingValue(key, value) {
  if (!value || !String(value).trim()) {
    return true;
  }
  const normalized = String(value).trim().toLowerCase();
  const placeholders = placeholderPatterns[key] || [];
  return placeholders.some((item) => normalized === item.toLowerCase());
}

function getMissingKeys(values) {
  return Object.entries(values)
    .filter(([key, value]) => isMissingValue(key, value))
    .map(([key]) => key);
}

function _tokenizeScope(rawScope) {
  return String(rawScope || "")
    .replace(/,/g, " ")
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeScope(rawScope) {
  const initial = _tokenizeScope(rawScope || DEFAULT_AUTH0_SCOPE);
  const unique = [];
  const seen = new Set();
  const pushScope = (scope) => {
    if (!scope || seen.has(scope)) {
      return;
    }
    seen.add(scope);
    unique.push(scope);
  };

  initial.forEach(pushScope);
  for (const [legacyScope, aliases] of Object.entries(LEGACY_SCOPE_ALIASES)) {
    if (seen.has(legacyScope)) {
      aliases.forEach(pushScope);
    }
  }
  REQUIRED_API_SCOPES.forEach(pushScope);
  return unique.join(" ");
}

function Bootstrap() {
  const [state, setState] = useState({
    loading: true,
    authConfig: null,
    missingKeys: [],
    bootstrapError: "",
  });

  useEffect(() => {
    // Check for frontend-side dev bypass first
    if (DEV_BYPASS_AUTH) {
      setState({
        loading: false,
        authConfig: {
          mode: "dev-bypass",
          source: "frontend-dev-bypass",
        },
        missingKeys: [],
        bootstrapError: "",
      });
      return;
    }

    const envMissing = getMissingKeys(requiredAuthEnv);
    if (envMissing.length === 0) {
      setState({
        loading: false,
        authConfig: {
          mode: "auth0",
          domain: requiredAuthEnv.VITE_AUTH0_DOMAIN,
          clientId: requiredAuthEnv.VITE_AUTH0_CLIENT_ID,
          audience: requiredAuthEnv.VITE_AUTH0_AUDIENCE,
          scope: normalizeScope(import.meta.env.VITE_AUTH0_SCOPE || DEFAULT_AUTH0_SCOPE),
          source: "frontend-env",
        },
        missingKeys: [],
        bootstrapError: "",
      });
      return;
    }

    async function loadFromBackend() {
      try {
        const response = await fetch(`${API_BASE_URL}/config/public`);
        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(`Backend config request failed with ${response.status}: ${text.slice(0, 50)}`);
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await response.text().catch(() => "");
          throw new Error(`Expected JSON config but received ${contentType || "unknown"}: ${text.slice(0, 50)}`);
        }

        const payload = await response.json();
        if (payload.dev_bypass_auth) {
          setState({
            loading: false,
            authConfig: {
              mode: "dev-bypass",
              source: "backend-dev-bypass",
            },
            missingKeys: [],
            bootstrapError: "",
          });
          return;
        }
        const backendValues = {
          VITE_AUTH0_DOMAIN: payload.auth0_domain,
          VITE_AUTH0_CLIENT_ID: payload.auth0_client_id,
          VITE_AUTH0_AUDIENCE: payload.auth0_audience,
        };
        const backendMissing = getMissingKeys(backendValues);
        if (backendMissing.length === 0 && payload.configured) {
          setState({
            loading: false,
            authConfig: {
              mode: "auth0",
              domain: payload.auth0_domain,
              clientId: payload.auth0_client_id,
              audience: payload.auth0_audience,
              scope: normalizeScope(
                payload.auth0_scope ||
                  import.meta.env.VITE_AUTH0_SCOPE ||
                  DEFAULT_AUTH0_SCOPE
              ),
              source: "backend-public-config",
            },
            missingKeys: [],
            bootstrapError: "",
          });
          return;
        }

        setState({
          loading: false,
          authConfig: null,
          missingKeys: backendMissing.length > 0 ? backendMissing : envMissing,
          bootstrapError:
            "Frontend and backend are both missing Auth0 settings. Set values in backend/.env or frontend/.env.",
        });
      } catch (error) {
        setState({
          loading: false,
          authConfig: null,
          missingKeys: envMissing,
          bootstrapError:
            error instanceof Error
              ? error.message
              : "Unable to load Auth0 config from backend.",
        });
      }
    }

    loadFromBackend();
  }, []);

  const authConfigMissing = useMemo(() => !state.authConfig, [state.authConfig]);

  if (state.loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-600">Loading frontend configuration...</p>
      </main>
    );
  }

  if (authConfigMissing) {
    return (
      <App
        authConfigMissing
        missingAuthEnv={state.missingKeys}
        bootstrapError={state.bootstrapError}
        authConfig={null}
      />
    );
  }

  if (state.authConfig.mode === "dev-bypass") {
    return <App authConfigMissing={false} devBypassAuth authConfig={state.authConfig} />;
  }

  return (
    <Auth0Provider
      domain={state.authConfig.domain}
      clientId={state.authConfig.clientId}
      authorizationParams={{
        redirect_uri: window.location.origin + "/callback",
        audience: state.authConfig.audience,
        scope: state.authConfig.scope,
      }}
      cacheLocation="localstorage"
      useRefreshTokens
      useRefreshTokensFallback
    >
      <App authConfigMissing={false} authConfig={state.authConfig} />
    </Auth0Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Bootstrap />
    </BrowserRouter>
  </React.StrictMode>
);
