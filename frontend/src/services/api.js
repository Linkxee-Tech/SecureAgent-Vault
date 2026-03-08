let API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

// Auto-correct common configuration mistake where the Vercel environment variable
// is set to just the root domain (e.g. https://secureagent-vault.onrender.com)
// without the required /api/v1 suffix.
if (API_BASE_URL.startsWith("http") && !API_BASE_URL.includes("/api/v1")) {
  API_BASE_URL = API_BASE_URL.replace(/\/$/, "") + "/api/v1";
}


async function apiFetch(path, accessToken, options = {}) {
  const headers = new Headers(options.headers || {});
  if (accessToken && String(accessToken).trim()) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  headers.set("Accept", "application/json");

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type");
  let payload;

  try {
    if (contentType && contentType.includes("application/json")) {
      payload = await response.json();
    } else {
      const text = await response.text();
      // If we expected JSON but got something else (like an HTML error page)
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${text.slice(0, 100)}`);
      }
      return text;
    }
  } catch (err) {
    if (err.name === "SyntaxError") {
      const text = await response.text().catch(() => "unavailable");
      throw new Error(`Invalid JSON response from server: ${text.slice(0, 100)}`);
    }
    throw err;
  }

  if (!response.ok) {
    throw new Error(payload?.detail || `Request failed with status ${response.status}`);
  }
  return payload;
}

export function listAgents(accessToken) {
  return apiFetch("/agents", accessToken);
}

export function createAgent(accessToken, body) {
  return apiFetch("/agents", accessToken, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateAgent(accessToken, agentId, body) {
  return apiFetch(`/agents/${agentId}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteAgent(accessToken, agentId) {
  return apiFetch(`/agents/${agentId}`, accessToken, {
    method: "DELETE",
  });
}

export function rotateAgentSecret(accessToken, agentId) {
  return apiFetch(`/agents/${agentId}/rotate-secret`, accessToken, {
    method: "POST",
  });
}

export function storeAgentApiKey(accessToken, agentId, apiKey, name = "default") {
  return apiFetch(`/agents/${agentId}/secret`, accessToken, {
    method: "POST",
    body: JSON.stringify({ api_key: apiKey, name }),
  });
}

export function listAudit(accessToken) {
  return apiFetch("/audit?limit=100&offset=0", accessToken);
}

export function revokeAgent(accessToken, agentId) {
  return apiFetch(`/agents/${agentId}/revoke`, accessToken, {
    method: "POST",
  });
}
export function requestAgentToken(agentId, secret, requestedScopes = null) {
  const body = {};
  if (secret) body.agent_secret = secret;
  if (requestedScopes) body.requested_scopes = requestedScopes;

  return apiFetch(`/agents/${agentId}/request-token`, null, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function callWeatherTool(vaultToken, city = "Paris") {
  return apiFetch(`/tools/weather?city=${encodeURIComponent(city)}`, vaultToken);
}
