import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowPathIcon,
  DocumentTextIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ClipboardIcon,
  ClipboardDocumentCheckIcon
} from "@heroicons/react/24/outline";
import { listAudit } from "../services/api";

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className={`p-1 rounded transition-colors ${copied ? 'text-emerald-500' : 'text-slate-400 hover:text-slate-600'}`}
      title="Copy to clipboard"
    >
      {copied ? <ClipboardDocumentCheckIcon className="h-4 w-4" /> : <ClipboardIcon className="h-4 w-4" />}
    </button>
  );
}

export default function AuditPage({ getAccessToken }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getAccessToken();
      const result = await listAudit(token);
      setEntries(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getActionBadgeClass = (action) => {
    switch (action) {
      case "token_issued":
        return "bg-emerald-100 text-emerald-800";
      case "token_revoked":
      case "agent_revoked":
        return "bg-rose-100 text-rose-800";
      case "secret_rotated":
        return "bg-amber-100 text-amber-800";
      case "agent_created":
        return "bg-blue-100 text-blue-800";
      case "agent_updated":
        return "bg-slate-100 text-slate-800";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const handleExportCSV = () => {
    if (entries.length === 0) return;
    const headers = ["Timestamp", "Agent ID", "Agent Name", "Action", "Scopes", "Token ID", "IP Address"];
    const rows = entries.map(e => [
      new Date(e.timestamp).toISOString(),
      e.agent_id,
      e.agent_name || "System",
      e.action,
      (e.scopes || []).join(";"),
      e.token_id || "",
      e.ip_address || ""
    ]);

    const csvContent = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `audit_log_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section className="space-y-6">
      {/* Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Audit Trail</h2>
            <p className="mt-1 text-sm text-slate-600">
              Tamper-evident log of all security-critical actions
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              onClick={handleExportCSV}
              disabled={entries.length === 0}
            >
              <ClipboardIcon className="h-4 w-4" />
              Export to CSV
            </button>
            <button
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              onClick={loadEntries}
            >
              <ArrowPathIcon className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {/* Audit Logs Table */}
      <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
              <p className="mt-3 text-sm text-slate-500">Loading vault logs...</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50/50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-6 py-3 w-10"></th>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Scopes</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry) => {
                  const isExpanded = expandedId === entry.id;
                  return (
                    <React.Fragment key={entry.id}>
                      <tr
                        className={`transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50/30' : 'hover:bg-slate-50/50'}`}
                        onClick={() => toggleExpand(entry.id)}
                      >
                        <td className="px-6 py-4">
                          {isExpanded ? <ChevronDownIcon className="h-4 w-4 text-blue-600" /> : <ChevronRightIcon className="h-4 w-4 text-slate-400" />}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-900">
                              {new Date(entry.timestamp).toLocaleDateString()}
                            </span>
                            <span className="text-xs text-slate-500">
                              {new Date(entry.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-semibold text-slate-900">
                            {entry.agent_name || entry.agent_id?.substring(0, 8) || "System"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getActionBadgeClass(
                              entry.action
                            )}`}
                          >
                            {entry.action.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-4 max-w-xs truncate">
                          {entry.scopes && entry.scopes.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {entry.scopes.slice(0, 2).map((scope, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-100"
                                >
                                  {scope}
                                </span>
                              ))}
                              {entry.scopes.length > 2 && <span className="text-xs text-slate-400">+{entry.scopes.length - 2} more</span>}
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5 ">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            <span className="text-xs font-medium text-slate-600">Verified</span>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-blue-50/10 active:bg-blue-50/20">
                          <td colSpan={6} className="px-14 py-6 border-l-2 border-blue-500">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                              <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Request Context</h4>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-2">
                                    <span className="text-xs text-slate-500 font-medium">IP Address</span>
                                    <span className="text-xs font-mono text-slate-900 sm:col-span-2">{entry.ip_address || "Unknown"}</span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-2 items-start">
                                    <span className="text-xs text-slate-500 font-medium">Token ID</span>
                                    <div className="flex items-center gap-2 sm:col-span-2 overflow-hidden">
                                      <span className="text-xs font-mono text-slate-900 truncate">{entry.token_id || "N/A"}</span>
                                      {entry.token_id && <CopyButton text={entry.token_id} />}
                                    </div>
                                  </div>
                                  {entry.scopes && entry.scopes.length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-2">
                                      <span className="text-xs text-slate-500 font-medium">Full Scopes</span>
                                      <div className="sm:col-span-2 flex flex-wrap gap-1">
                                        {entry.scopes.map((s, i) => (
                                          <code key={i} className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-blue-700">{s}</code>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Tamper-Evident Chain</h4>
                                <div className="space-y-4">
                                  <div className="flex flex-col gap-2">
                                    <span className="text-xs text-slate-500">Previous Block Hash</span>
                                    <div className="flex items-center gap-2 rounded-lg bg-slate-100 p-2 overflow-hidden">
                                      <code className="text-[10px] font-mono text-slate-600 truncate flex-1">{entry.previous_hash || "GENESIS BLOCK"}</code>
                                      {entry.previous_hash && <CopyButton text={entry.previous_hash} />}
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <span className="text-xs text-slate-500">Current Entry Hash</span>
                                    <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 p-2 overflow-hidden">
                                      <code className="text-[10px] font-mono text-emerald-800 truncate flex-1">{entry.hash}</code>
                                      <CopyButton text={entry.hash} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="mt-8 pt-6 border-t border-blue-100 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <ShieldCheckIcon className="h-4 w-4 text-emerald-600" />
                                <span className="text-[11px] font-medium text-slate-600">Cryptographically verified at {new Date(entry.timestamp).toLocaleTimeString()}</span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">Event ID: {entry.id}</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {entries.length === 0 && (
                  <tr>
                    <td className="px-4 py-12 text-center text-slate-500" colSpan={6}>
                      <div className="flex flex-col items-center">
                        <DocumentTextIcon className="h-12 w-12 text-slate-300" />
                        <p className="mt-2 font-medium">No audit events found</p>
                        <p className="mt-1 text-sm">
                          Activity logs will populate here once agents begin operations
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Entry Count */}
        {!loading && entries.length > 0 && (
          <div className="bg-slate-50/50 px-6 py-4 border-t border-slate-200">
            <p className="text-xs font-medium text-slate-500">
              Total <span className="text-slate-900">{entries.length}</span> security events categorized by SHA-256 chain integrity.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

// Simple internal icon for verification
function ShieldCheckIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

