import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Auth0Provider } from "@auth0/auth0-react";
import App from "./App";
import "./index.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";
const DEV_BYPASS_AUTH = import.meta.env.VITE_DEV_BYPASS_AUTH === "true";
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
          scope: import.meta.env.VITE_AUTH0_SCOPE || "read:agents write:agents read:audit admin",
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
          throw new Error(`Backend config request failed with ${response.status}`);
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
              scope:
                import.meta.env.VITE_AUTH0_SCOPE ||
                payload.auth0_scope ||
                "read:agents write:agents read:audit admin",
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
      />
    );
  }

  if (state.authConfig.mode === "dev-bypass") {
    return <App authConfigMissing={false} devBypassAuth />;
  }

  return (
    <Auth0Provider
      domain={state.authConfig.domain}
      clientId={state.authConfig.clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: state.authConfig.audience,
      }}
      cacheLocation="localstorage"
      useRefreshTokens
    >
      <App authConfigMissing={false} />
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
