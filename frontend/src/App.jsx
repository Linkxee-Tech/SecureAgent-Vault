import { useCallback, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import Sidebar from "./components/Sidebar";
import DashboardPage from "./pages/DashboardPage";
import AgentsPage from "./pages/AgentsPage";
import AgentDetailPage from "./pages/AgentDetailPage";
import AuditPage from "./pages/AuditPage";
import SettingsPage from "./pages/SettingsPage";
import LandingPage from "./pages/LandingPage";
import RequestTokenPage from "./pages/RequestTokenPage";
import ToolsPlaygroundPage from "./pages/ToolsPlaygroundPage";
import TokenInspectorPage from "./pages/TokenInspectorPage";
import SecurityInsightsPage from "./pages/SecurityInsightsPage";
import DeveloperPage from "./pages/DeveloperPage";
import AdminPage from "./pages/AdminPage";
import { NotFoundPage } from "./pages/ErrorPages";
import Callback from "./pages/Callback";
import TopNavbar from "./components/TopNavbar";
import { usePermissions } from "./hooks/usePermissions";

export default function App(props) {
  if (props.authConfigMissing) {
    return <AuthConfigMissingPage {...props} />;
  }
  if (props.devBypassAuth) {
    return <BypassApp {...props} />;
  }
  return <AuthenticatedApp {...props} />;
}

function AuthConfigMissingPage({ missingAuthEnv, bootstrapError }) {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mt-12 rounded-2xl border border-amber-300 bg-amber-50 p-6">
        <h1 className="text-xl font-semibold text-amber-900">Auth0 Config Missing</h1>
        <p className="mt-2 text-sm text-amber-800">
          Add required values in <code>backend/.env</code> or <code>frontend/.env</code>, then rebuild.
        </p>
        {missingAuthEnv.length > 0 ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-100/70 p-3 text-sm text-amber-900">
            <p className="font-semibold">Missing variables:</p>
            <p className="mt-1">{missingAuthEnv.join(", ")}</p>
          </div>
        ) : null}
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-100/70 p-3 text-xs text-amber-900">
          <p className="font-semibold">Fix commands</p>
          <code className="mt-2 block whitespace-pre-wrap">
            # Option A: configure backend (recommended){"\n"}
            # set AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_AUDIENCE in backend/.env{"\n"}
            docker compose up -d --build backend frontend{"\n\n"}
            # Option B: configure frontend env directly{"\n"}
            # PowerShell{"\n"}
            Copy-Item frontend/.env.example frontend/.env{"\n"}
            # Bash{"\n"}
            cp frontend/.env.example frontend/.env{"\n"}
            docker compose up -d --build frontend
          </code>
        </div>
        <p className="mt-3 text-xs text-amber-800">
          If backend env also changed, run <code>docker compose up -d --build</code>.
        </p>
        {bootstrapError ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            <p className="font-semibold">Bootstrap error</p>
            <p className="mt-1">{bootstrapError}</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function BypassApp() {
  const getAccessToken = useCallback(() => Promise.resolve(""), []);
  const mockUser = {
    name: "Developer",
    email: "dev@local.host",
    sub: "dev_123456789"
  };

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/dashboard"
        element={
          <ControlPlaneApp
            getAccessToken={getAccessToken}
            userLabel="Local development mode (Auth bypass)"
            userName="Developer"
            user={mockUser}
            onSignOut={null}
            devBypassAuth={true}
          />
        }
      />
      <Route path="/callback" element={<Callback />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function AuthenticatedApp() {
  const { isAuthenticated, isLoading, logout, user, getAccessTokenSilently } = useAuth0();

  const getAccessToken = useCallback(() => {
    return getAccessTokenSilently({
      authorizationParams: {
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        scope: import.meta.env.VITE_AUTH0_SCOPE || "openid profile email offline_access name read:agents write:agents read:audit admin",
      },
    });
  }, [getAccessTokenSilently]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
          <p className="mt-4 text-sm text-slate-600">Loading authentication...</p>
        </div>
      </main>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={!isAuthenticated ? <LandingPage /> : <Navigate to="/dashboard" replace />}
      />
      <Route
        path="/dashboard"
        element={
          isAuthenticated ? (
            <ControlPlaneApp
              getAccessToken={getAccessToken}
              userLabel={user?.email || user?.name || "Authenticated user"}
              userName={user?.name || ""}
              user={user}
              onSignOut={() => logout({ logoutParams: { returnTo: window.location.origin } })}
              devBypassAuth={false}
            />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route path="/callback" element={<Callback />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function ControlPlaneApp({ getAccessToken, userLabel, userName, user, onSignOut = null, devBypassAuth = false }) {
  const [tab, setTab] = useState("dashboard");
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const rbac = usePermissions(devBypassAuth);

  const refreshAgents = useCallback(() => {
    setReloadKey((value) => value + 1);
  }, []);

  const onAgentsLoaded = useCallback((agents) => {
    setSelectedAgent((previous) => {
      if (!previous) {
        return previous;
      }
      return agents.find((item) => item.id === previous.id) || null;
    });
  }, []);

  const handleSelectAgent = useCallback((agent) => {
    setSelectedAgent(agent);
    setTab("detail");
  }, []);

  const tabTitles = {
    dashboard: "Dashboard",
    agents: "Agents",
    detail: "Agent Detail",
    tokens: "Agent Tokens",
    inspector: "Token Inspector",
    playground: "Tools Playground",
    audit: "Audit Trail",
    developer: "Developer Portal",
    security: "Security Insights",
    settings: "System Settings",
    admin: "System Administration",
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar - handles its own desktop/mobile presentation */}
      <Sidebar
        currentTab={tab}
        onTabChange={setTab}
        userLabel={userLabel}
        onSignOut={onSignOut}
        devBypassAuth={devBypassAuth}
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        rbac={rbac}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopNavbar
          title={tabTitles[tab] || "Vault Console"}
          userLabel={userLabel}
          onSignOut={onSignOut}
          onSettingsClick={() => setTab("settings")}
          devBypassAuth={devBypassAuth}
          onMenuClick={() => setMobileOpen(true)}
        />
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

            {/* Dev Bypass Notice */}
            {devBypassAuth ? (
              <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                Dev auth bypass is enabled. Frontend is running without Auth0.
              </div>
            ) : null}

            {/* Tab Content */}
            {tab === "dashboard" ? (
              <DashboardPage
                getAccessToken={getAccessToken}
                onSelectAgent={handleSelectAgent}
                userName={userName}
              />
            ) : null}

            {tab === "agents" ? (
              <AgentsPage
                getAccessToken={getAccessToken}
                onSelectAgent={handleSelectAgent}
                selectedAgentId={selectedAgent?.id}
                reloadKey={reloadKey}
                onAgentsLoaded={onAgentsLoaded}
                rbac={rbac}
              />
            ) : null}

            {tab === "detail" ? (
              <AgentDetailPage
                agent={selectedAgent}
                getAccessToken={getAccessToken}
                onAgentUpdated={(agent) => {
                  setSelectedAgent(agent);
                }}
                onAgentDeleted={() => {
                  setSelectedAgent(null);
                  setTab("agents");
                }}
                onRefreshAgents={refreshAgents}
                rbac={rbac}
              />
            ) : null}

            {tab === "audit" ? <AuditPage getAccessToken={getAccessToken} /> : null}
            {tab === "tokens" ? <RequestTokenPage getAccessToken={getAccessToken} /> : null}
            {tab === "inspector" ? <TokenInspectorPage /> : null}
            {tab === "playground" ? <ToolsPlaygroundPage /> : null}
            {tab === "developer" ? <DeveloperPage /> : null}
            {tab === "security" ? <SecurityInsightsPage getAccessToken={getAccessToken} /> : null}
            {tab === "admin" ? <AdminPage rbac={rbac} /> : null}
            {tab === "settings" ? <SettingsPage user={user} rbac={rbac} /> : null}

            {/* Catch-all for unknown tabs */}
            {!tabTitles[tab] && <NotFoundPage />}
          </div>
        </div>
      </main>
    </div>
  );
}
