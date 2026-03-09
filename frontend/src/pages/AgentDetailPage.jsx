import { useEffect, useMemo, useState } from "react";
import {
  KeyIcon,
  ArrowPathIcon,
  TrashIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/24/outline";
import {
  deleteAgent,
  revokeAgent,
  rotateAgentSecret,
  storeAgentApiKey,
  updateAgent,
} from "../services/api";
import ConfirmModal from "../components/ConfirmModal";
import ApiKeyModal, { SecretRevealModal } from "../components/ApiKeyModal";
import Toast from "../components/Toast";

function parseScopes(raw) {
  return raw
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean);
}

export default function AgentDetailPage({
  agent,
  getAccessToken,
  onAgentUpdated,
  onAgentDeleted,
  onRefreshAgents
}) {
  const [name, setName] = useState("");
  const [scopesRaw, setScopesRaw] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [secretRevealOpen, setSecretRevealOpen] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    if (!agent) {
      return;
    }
    setName(agent.name);
    setScopesRaw((agent.allowed_scopes || []).join(", "));
    setIsActive(agent.is_active);
    setMessage("");
    setError("");
    setRevealedSecret("");
  }, [agent]);

  const scopeCount = useMemo(() => parseScopes(scopesRaw).length, [scopesRaw]);

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  }

  if (!agent) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white/80 p-8 shadow-sm backdrop-blur">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <ShieldExclamationIcon className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">No Agent Selected</h2>
          <p className="mt-2 text-sm text-slate-600">
            Select an agent from the Agents tab to view and edit details.
          </p>
        </div>
      </section>
    );
  }

  async function onSave(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const token = await getAccessToken();
      const updated = await updateAgent(token, agent.id, {
        name,
        allowed_scopes: parseScopes(scopesRaw),
        is_active: isActive,
      });
      showToast("Agent details updated");
      onAgentUpdated(updated);
      onRefreshAgents();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function onRotateSecret() {
    setError("");
    try {
      const token = await getAccessToken();
      const result = await rotateAgentSecret(token, agent.id);
      setRevealedSecret(result.secret);
      setSecretRevealOpen(true);
    } catch (err) {
      setError(err.message);
    }
  }

  async function onSubmitApiKey(secretName, apiKey) {
    setError("");
    try {
      const token = await getAccessToken();
      await storeAgentApiKey(token, agent.id, apiKey, secretName);
      showToast(`Secret "${secretName}" stored securely`);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  async function confirmRevokeTokens() {
    setError("");
    try {
      const token = await getAccessToken();
      const result = await revokeAgent(token, agent.id);
      onAgentUpdated({ ...agent, is_active: false });
      onRefreshAgents();
      setIsActive(false);
      showToast(`Revoked ${result.revoked_jti_count} active token(s)`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function confirmDeleteAgent() {
    setError("");
    try {
      const token = await getAccessToken();
      await deleteAgent(token, agent.id);
      onRefreshAgents();
      onAgentDeleted(agent.id);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="space-y-6">
      {/* Agent Info Card */}
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Agent Configuration</h2>
            <p className="mt-1 text-sm text-slate-600">
              Update name and allowed permission scopes
            </p>
          </div>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${agent.is_active
              ? "bg-emerald-100 text-emerald-800"
              : "bg-slate-200 text-slate-700"
              }`}
          >
            {agent.is_active ? "Active" : "Inactive"}
          </span>
        </div>

        <form className="mt-6 space-y-5" onSubmit={onSave}>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Agent Name
            </label>
            <input
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Allowed Scopes ({scopeCount})
            </label>
            <input
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              value={scopesRaw}
              onChange={(event) => setScopesRaw(event.target.value)}
              placeholder="read:weather,write:calendar"
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Comma-separated list of scopes this agent can request
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="is-active"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
            />
            <label htmlFor="is-active" className="text-sm font-medium text-slate-700">
              Agent is active (can request tokens)
            </label>
          </div>

          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>

      {/* Security Actions */}
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
        <h3 className="text-base font-semibold text-slate-900">Security Credentials</h3>
        <p className="mt-1 text-sm text-slate-600">
          Rotate core secrets or store encrypted external API keys.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            onClick={onRotateSecret}
          >
            <ArrowPathIcon className="h-4 w-4" />
            Rotate Agent Secret
          </button>
          <button
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            onClick={() => setApiKeyModalOpen(true)}
          >
            <KeyIcon className="h-4 w-4" />
            Store API Key
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl border border-rose-200 bg-rose-50/30 p-6 shadow-sm">
        <h3 className="text-base font-semibold text-rose-900">Danger Zone</h3>
        <p className="mt-1 text-sm text-rose-700">
          High-impact security actions. IRM protocols apply.
        </p>

        <div className="mt-6 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <p className="text-sm font-medium text-slate-900">Revoke All Access</p>
            <p className="text-xs text-slate-600 mt-1">Immediately blacklist all active tokens and deactivate agent.</p>
            <button
              className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100"
              onClick={() => setRevokeModalOpen(true)}
            >
              <ShieldExclamationIcon className="h-4 w-4" />
              Revoke & Deactivate
            </button>
          </div>

          <div className="flex-1 min-w-[200px]">
            <p className="text-sm font-medium text-slate-900">Delete Agent</p>
            <p className="text-xs text-slate-600 mt-1">Permanently remove agent and all associated audit references.</p>
            <button
              className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100"
              onClick={() => setDeleteModalOpen(true)}
            >
              <TrashIcon className="h-4 w-4" />
              Delete Permanently
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDeleteAgent}
        title="Delete Agent"
        message={`Are you sure you want to delete '${agent.name}'? This action is permanent and cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />

      <ConfirmModal
        isOpen={revokeModalOpen}
        onClose={() => setRevokeModalOpen(false)}
        onConfirm={confirmRevokeTokens}
        title="Revoke All Access"
        message={`This will immediately deactivate '${agent.name}' and blacklist all short-lived tokens currently in circulation.`}
        confirmLabel="Revoke Access"
        variant="warning"
      />

      <ApiKeyModal
        isOpen={apiKeyModalOpen}
        onClose={() => setApiKeyModalOpen(false)}
        onSubmit={onSubmitApiKey}
        agentName={agent.name}
      />

      <SecretRevealModal
        isOpen={secretRevealOpen}
        onClose={() => setSecretRevealOpen(false)}
        secret={revealedSecret}
      />

      {/* Error Message */}
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {/* Toast Notification */}
      <Toast message={toastMessage} onClose={() => setToastMessage("")} />
    </section>
  );
}
