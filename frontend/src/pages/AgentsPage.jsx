import { useCallback, useEffect, useMemo, useState } from "react";
import { MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import {
  createAgent,
  deleteAgent,
  listAgents,
  rotateAgentSecret,
  storeAgentApiKey,
  updateAgent,
} from "../services/api";
import ConfirmModal from "../components/ConfirmModal";
import ApiKeyModal from "../components/ApiKeyModal";
import { SecretRevealModal } from "../components/ApiKeyModal";
import Toast from "../components/Toast";

function parseScopes(raw) {
  return raw
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean);
}

export default function AgentsPage({
  getAccessToken,
  onSelectAgent,
  selectedAgentId,
  reloadKey,
  onAgentsLoaded
}) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState("read:weather");
  const [secretFlash, setSecretFlash] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, active, inactive

  // Modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteAgentId, setDeleteAgentId] = useState(null);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [revokeAgent, setRevokeAgent] = useState(null);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [apiKeyAgentId, setApiKeyAgentId] = useState(null);
  const [apiKeyAgentName, setApiKeyAgentName] = useState("");
  const [secretRevealOpen, setSecretRevealOpen] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  const loadAgents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getAccessToken();
      const result = await listAgents(token);
      setAgents(result);
      if (typeof onAgentsLoaded === "function") {
        onAgentsLoaded(result);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, onAgentsLoaded]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents, reloadKey]);

  const filteredAgents = useMemo(() => {
    let filtered = agents;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (agent) =>
          agent.name.toLowerCase().includes(query) ||
          agent.allowed_scopes.some((scope) => scope.toLowerCase().includes(query))
      );
    }

    // Filter by status
    if (filterStatus === "active") {
      filtered = filtered.filter((agent) => agent.is_active);
    } else if (filterStatus === "inactive") {
      filtered = filtered.filter((agent) => !agent.is_active);
    }

    return filtered;
  }, [agents, searchQuery, filterStatus]);

  const totalActive = useMemo(
    () => agents.filter((agent) => agent.is_active).length,
    [agents]
  );

  async function onCreateAgent(event) {
    event.preventDefault();
    setError("");
    try {
      const token = await getAccessToken();
      const created = await createAgent(token, {
        name,
        allowed_scopes: parseScopes(scopes),
      });
      setSecretFlash(created.secret);
      setName("");
      await loadAgents();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onDeleteAgent(agentId) {
    setDeleteAgentId(agentId);
    setDeleteModalOpen(true);
  }

  async function confirmDeleteAgent() {
    if (!deleteAgentId) return;
    setError("");
    try {
      const token = await getAccessToken();
      await deleteAgent(token, deleteAgentId);
      if (selectedAgentId === deleteAgentId && typeof onSelectAgent === "function") {
        onSelectAgent(null);
      }
      await loadAgents();
      showToast("Agent deleted successfully");
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleteAgentId(null);
    }
  }

  async function onToggleActive(agent) {
    setRevokeAgent(agent);
    setRevokeModalOpen(true);
  }

  async function confirmToggleActive() {
    if (!revokeAgent) return;
    setError("");
    try {
      const token = await getAccessToken();
      await updateAgent(token, revokeAgent.id, {
        is_active: !revokeAgent.is_active,
      });
      await loadAgents();
      showToast(revokeAgent.is_active ? "Agent revoked successfully" : "Agent activated successfully");
    } catch (err) {
      setError(err.message);
    } finally {
      setRevokeAgent(null);
    }
  }

  async function onRotateSecret(agentId) {
    setError("");
    try {
      const token = await getAccessToken();
      const result = await rotateAgentSecret(token, agentId);
      setRevealedSecret(result.secret);
      setSecretRevealOpen(true);
    } catch (err) {
      setError(err.message);
    }
  }

  function onStoreApiKeyClick(agentId, agentName) {
    setApiKeyAgentId(agentId);
    setApiKeyAgentName(agentName);
    setApiKeyModalOpen(true);
  }

  async function onSubmitApiKey(secretName, apiKey) {
    if (!apiKeyAgentId) return;
    setError("");
    try {
      const token = await getAccessToken();
      await storeAgentApiKey(token, apiKeyAgentId, apiKey, secretName);
      showToast(`Encrypted API key stored as "${secretName}"`);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  function showToast(message) {
    setToastMessage(message);
    setTimeout(() => setToastMessage(""), 3000);
  }

  return (
    <section className="space-y-6">
      {/* Create Agent Card */}
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Register New Agent</h2>
            <p className="mt-1 text-sm text-slate-600">
              Active agents: <span className="font-semibold text-emerald-600">{totalActive}</span> / {agents.length}
            </p>
          </div>
        </div>
        <form className="mt-4 grid gap-3 md:grid-cols-[1fr_2fr_auto]" onSubmit={onCreateAgent}>
          <input
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="WeatherBot"
            required
          />
          <input
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            value={scopes}
            onChange={(event) => setScopes(event.target.value)}
            placeholder="read:weather,write:calendar"
          />
          <button className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700">
            <PlusIcon className="h-4 w-4" />
            Create
          </button>
        </form>
      </div>

      {/* Secret Flash */}
      {secretFlash ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <p className="font-semibold text-amber-900">New Agent Secret (shown once)</p>
          <code className="mt-2 block overflow-x-auto rounded-lg bg-amber-100 px-4 py-3 font-mono text-sm text-amber-900">
            {secretFlash}
          </code>
          <button
            className="mt-3 text-sm font-medium text-amber-800 hover:text-amber-900"
            onClick={() => setSecretFlash("")}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Error Message */}
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {/* Agents List Card */}
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-slate-900">Agents</h3>

          {/* Search and Filter */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
              <p className="mt-3 text-sm text-slate-500">Loading agents...</p>
            </div>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Scopes</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAgents.map((agent) => (
                  <tr
                    key={agent.id}
                    className={`transition-colors hover:bg-slate-50/50 ${selectedAgentId === agent.id ? "bg-blue-50/50" : ""
                      }`}
                  >
                    <td className="px-4 py-4 font-medium text-slate-900">{agent.name}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {agent.allowed_scopes.length > 0 ? (
                          agent.allowed_scopes.map((scope, idx) => (
                            <span
                              key={idx}
                              className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
                            >
                              {scope}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400">No scopes</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${agent.is_active
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-700"
                          }`}
                      >
                        {agent.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                          onClick={() => {
                            if (typeof onSelectAgent === "function") {
                              onSelectAgent(agent);
                            }
                          }}
                        >
                          Edit
                        </button>

                        <button
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${agent.is_active
                            ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                            : "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                          onClick={() => onToggleActive(agent)}
                        >
                          {agent.is_active ? "Deactivate" : "Activate"}
                        </button>

                        <button
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                          onClick={() => onRotateSecret(agent.id)}
                        >
                          Rotate
                        </button>

                        <button
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                          onClick={() => onStoreApiKeyClick(agent.id, agent.name)}
                        >
                          Store Key
                        </button>

                        <button
                          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100"
                          onClick={() => onDeleteAgent(agent.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredAgents.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500" colSpan={4}>
                      {searchQuery || filterStatus !== "all"
                        ? "No agents match your filters."
                        : "No agents registered yet."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDeleteAgent}
        title="Delete Agent"
        message="Are you sure you want to delete this agent? This action cannot be undone and all associated data will be permanently removed."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />

      {/* Revoke/Activate Confirmation Modal */}
      <ConfirmModal
        isOpen={revokeModalOpen}
        onClose={() => setRevokeModalOpen(false)}
        onConfirm={confirmToggleActive}
        title={revokeAgent?.is_active ? "Revoke Agent" : "Activate Agent"}
        message={revokeAgent?.is_active
          ? `Revoke agent '${revokeAgent?.name}'? This will immediately block any new token requests. Outstanding tokens will expire within 2 minutes.`
          : `Activate agent '${revokeAgent?.name}'? This will allow the agent to request new tokens.`
        }
        confirmLabel={revokeAgent?.is_active ? "Revoke" : "Activate"}
        cancelLabel="Cancel"
        variant="warning"
      />

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={apiKeyModalOpen}
        onClose={() => setApiKeyModalOpen(false)}
        onSubmit={onSubmitApiKey}
        agentName={apiKeyAgentName}
      />

      {/* Secret Reveal Modal */}
      <SecretRevealModal
        isOpen={secretRevealOpen}
        onClose={() => setSecretRevealOpen(false)}
        secret={revealedSecret}
        title="New Agent Secret"
      />

      {/* Toast Notification */}
      <Toast message={toastMessage} onClose={() => setToastMessage("")} />
    </section>
  );
}
