const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

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

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.detail || "Request failed");
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
