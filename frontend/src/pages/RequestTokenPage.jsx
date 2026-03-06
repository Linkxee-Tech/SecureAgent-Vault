import React, { useState, useEffect, useCallback } from "react";
import {
    KeyIcon,
    CommandLineIcon,
    ClipboardIcon,
    ClipboardDocumentCheckIcon,
    ClockIcon,
    ShieldCheckIcon
} from "@heroicons/react/24/outline";
import { listAgents, requestAgentToken } from "../services/api";

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
            className={`p-1.5 rounded-lg border transition-all ${copied
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300'
                }`}
            title="Copy to clipboard"
        >
            {copied ? <ClipboardDocumentCheckIcon className="h-4 w-4" /> : <ClipboardIcon className="h-4 w-4" />}
        </button>
    );
}

export default function RequestTokenPage({ getAccessToken }) {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Selection state
    const [selectedAgentId, setSelectedAgentId] = useState("");
    const [agentSecret, setAgentSecret] = useState("");
    const [selectedScopes, setSelectedScopes] = useState([]);

    // Response state
    const [tokenResult, setTokenResult] = useState(null);
    const [requesting, setRequesting] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);

    const fetchAgents = useCallback(async () => {
        setLoading(true);
        try {
            const token = await getAccessToken();
            const result = await listAgents(token);
            setAgents(result);
            if (result.length > 0) {
                setSelectedAgentId(result[0].id);
                setSelectedScopes(result[0].allowed_scopes);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [getAccessToken]);

    useEffect(() => {
        fetchAgents();
    }, [fetchAgents]);

    useEffect(() => {
        if (timeLeft <= 0) return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

    const handleAgentChange = (e) => {
        const id = e.target.value;
        setSelectedAgentId(id);
        const agent = agents.find(a => a.id === id);
        if (agent) {
            setSelectedScopes(agent.allowed_scopes);
        }
    };

    const toggleScope = (scope) => {
        setSelectedScopes(prev =>
            prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
        );
    };

    const handleRequestToken = async (e) => {
        e.preventDefault();
        if (!selectedAgentId || !agentSecret) return;

        setRequesting(true);
        setError("");
        try {
            const result = await requestAgentToken(selectedAgentId, agentSecret, selectedScopes);
            setTokenResult(result);
            setTimeLeft(result.expires_in);
        } catch (err) {
            setError(err.message);
            setTokenResult(null);
        } finally {
            setRequesting(false);
        }
    };

    const selectedAgent = agents.find(a => a.id === selectedAgentId);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
                <h2 className="text-lg font-semibold text-slate-900">Request Agent Token</h2>
                <p className="mt-1 text-sm text-slate-600">
                    Simulate an AI agent requesting a short-lived scoped token from the vault.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Request Form */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <form onSubmit={handleRequestToken} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Select Agent</label>
                            {loading ? (
                                <div className="h-10 w-full animate-pulse bg-slate-100 rounded-xl" />
                            ) : (
                                <select
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                    value={selectedAgentId}
                                    onChange={handleAgentChange}
                                    required
                                >
                                    {agents.map(agent => (
                                        <option key={agent.id} value={agent.id}>{agent.name}</option>
                                    ))}
                                    {agents.length === 0 && <option value="">No agents available</option>}
                                </select>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Agent Secret</label>
                            <input
                                type="password"
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                placeholder="Enter agent secret..."
                                value={agentSecret}
                                onChange={(e) => setAgentSecret(e.target.value)}
                                required
                            />
                            <p className="mt-1.5 text-xs text-slate-500">The secret generated when you registered the agent.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Requested Scopes</label>
                            {selectedAgent ? (
                                <div className="flex flex-wrap gap-2">
                                    {selectedAgent.allowed_scopes.map(scope => (
                                        <button
                                            key={scope}
                                            type="button"
                                            onClick={() => toggleScope(scope)}
                                            className={`px-3 py-1 text-xs font-medium rounded-full border transition-all ${selectedScopes.includes(scope)
                                                ? 'bg-blue-100 border-blue-200 text-blue-700'
                                                : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60 hover:opacity-100'
                                                }`}
                                        >
                                            {scope}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 italic">Select an agent to see available scopes.</p>
                            )}
                        </div>

                        {error && (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={requesting || !selectedAgentId || !agentSecret}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {requesting ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                            ) : (
                                <KeyIcon className="h-4 w-4" />
                            )}
                            {requesting ? "Requesting..." : "Generate Vault Token"}
                        </button>
                    </form>
                </div>

                {/* Token Result */}
                <div className="rounded-2xl border border-slate-200 bg-slate-900 p-6 shadow-sm text-white">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Vault Response</h3>
                        {tokenResult && (
                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter ${timeLeft > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                <div className={`h-1.5 w-1.5 rounded-full ${timeLeft > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                                {timeLeft > 0 ? 'Token Active' : 'Token Expired'}
                            </div>
                        )}
                    </div>

                    {!tokenResult ? (
                        <div className="h-full flex flex-col items-center justify-center py-12 text-center">
                            <CommandLineIcon className="h-16 w-16 text-slate-800 mb-4" />
                            <p className="text-slate-500 text-sm">Awaiting token request...</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-400">Access Token (JWT)</span>
                                    <CopyButton text={tokenResult.token} />
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-slate-900 pointer-events-none" />
                                    <code className="block w-full rounded-xl bg-slate-800 border border-slate-700 p-4 font-mono text-[11px] leading-relaxed text-blue-300 break-all h-32 overflow-y-auto custom-scrollbar">
                                        {tokenResult.token}
                                    </code>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <ClockIcon className="h-3.5 w-3.5 text-slate-500" />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Expires In</span>
                                    </div>
                                    <div className="text-xl font-mono text-emerald-400">{timeLeft}s</div>
                                </div>
                                <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <ShieldCheckIcon className="h-3.5 w-3.5 text-slate-500" />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Algorithm</span>
                                    </div>
                                    <div className="text-xl font-mono text-blue-400 text-sm mt-1">HS256</div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Granted Scopes</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {selectedScopes.map(scope => (
                                        <span key={scope} className="text-[10px] px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 border border-blue-600/30">
                                            {scope}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="p-4 bg-blue-600/10 border border-blue-600/20 rounded-xl">
                                <p className="text-[11px] leading-relaxed text-blue-300/80 italic">
                                    "This token is cryptographically signed. Use it in the 'Authorization: Bearer' header to access protected tools."
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
