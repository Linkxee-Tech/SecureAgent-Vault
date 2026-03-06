import React, { useState } from "react";
import {
    MagnifyingGlassIcon,
    CodeBracketIcon,
    IdentificationIcon,
    ShieldCheckIcon,
    CalendarDaysIcon,
    FingerPrintIcon
} from "@heroicons/react/24/outline";

export default function TokenInspectorPage() {
    const [token, setToken] = useState("");
    const [decoded, setDecoded] = useState(null);
    const [error, setError] = useState("");

    const decodeToken = (jwt) => {
        try {
            const parts = jwt.split(".");
            if (parts.length !== 3) {
                throw new Error("Invalid JWT format. Must have 3 parts separated by dots.");
            }

            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));

            return { header, payload };
        } catch (err) {
            throw new Error("Failed to decode token: " + err.message);
        }
    };

    const handleInspect = (e) => {
        e.preventDefault();
        setError("");
        setDecoded(null);
        if (!token.trim()) return;

        try {
            const result = decodeToken(token.trim());
            setDecoded(result);
        } catch (err) {
            setError(err.message);
        }
    };

    const formatTime = (seconds) => {
        if (!seconds) return "N/A";
        return new Date(seconds * 1000).toLocaleString();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
                <h2 className="text-lg font-semibold text-slate-900">Token Inspector</h2>
                <p className="mt-1 text-sm text-slate-600">
                    Paste a vault token to decode its claims and verify the security posture.
                </p>
            </div>

            {/* Input */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <form onSubmit={handleInspect} className="space-y-4">
                    <label className="block text-sm font-medium text-slate-700">Vault Token (JWT)</label>
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <IdentificationIcon className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                            <textarea
                                className="w-full h-12 rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-xs font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none"
                                placeholder="Paste your eyJ... token here"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            className="rounded-xl bg-blue-600 px-6 font-semibold text-white transition-all hover:bg-blue-700 shadow-lg shadow-blue-500/20"
                        >
                            Inspect
                        </button>
                    </div>
                    {error && (
                        <p className="text-xs text-rose-600 font-medium">⚠️ {error}</p>
                    )}
                </form>
            </div>

            {decoded && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
                    {/* Summary Cards */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                                        <FingerPrintIcon className="h-5 w-5" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Identities</span>
                                </div>
                                <dl className="space-y-3">
                                    <div>
                                        <dt className="text-[10px] text-slate-500 uppercase font-bold">Agent ID</dt>
                                        <dd className="text-xs font-mono text-slate-900 truncate">{decoded.payload.agent_id || "N/A"}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-[10px] text-slate-500 uppercase font-bold">User ID</dt>
                                        <dd className="text-xs font-mono text-slate-900 truncate">{decoded.payload.user_id || "N/A"}</dd>
                                    </div>
                                </dl>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                                        <CalendarDaysIcon className="h-5 w-5" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Timestamps</span>
                                </div>
                                <dl className="space-y-3">
                                    <div>
                                        <dt className="text-[10px] text-slate-500 uppercase font-bold">Issued At</dt>
                                        <dd className="text-xs text-slate-900">{formatTime(decoded.payload.iat)}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-[10px] text-slate-500 uppercase font-bold">Expires At</dt>
                                        <dd className="text-xs text-slate-900 font-semibold">{formatTime(decoded.payload.exp)}</dd>
                                    </div>
                                </dl>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                                    <ShieldCheckIcon className="h-5 w-5" />
                                </div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Authorized Scopes</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {decoded.payload.scopes?.map(scope => (
                                    <span key={scope} className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700">
                                        {scope}
                                    </span>
                                )) || <span className="text-sm text-slate-400 italic">No scopes found in payload</span>}
                            </div>
                        </div>
                    </div>

                    {/* JSON Viewer */}
                    <div className="lg:col-span-1">
                        <div className="rounded-2xl border border-slate-200 bg-slate-900 p-6 shadow-sm text-white sticky top-6">
                            <div className="flex items-center gap-2 mb-4">
                                <CodeBracketIcon className="h-4 w-4 text-blue-400" />
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Payload JSON</span>
                            </div>
                            <pre className="text-[10px] font-mono leading-relaxed text-blue-300 bg-slate-800/50 p-4 rounded-xl overflow-x-auto custom-scrollbar">
                                {JSON.stringify(decoded.payload, null, 2)}
                            </pre>
                            <div className="mt-6 pt-6 border-t border-slate-800">
                                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tighter text-slate-500">
                                    <span>JWT Header</span>
                                    <span className="text-blue-500">{decoded.header.alg}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
