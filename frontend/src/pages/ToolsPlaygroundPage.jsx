import React, { useState } from "react";
import {
    CloudIcon,
    MapPinIcon,
    CommandLineIcon,
    ShieldCheckIcon,
    ShieldExclamationIcon,
    GlobeAltIcon
} from "@heroicons/react/24/outline";
import { callWeatherTool } from "../services/api";

export default function ToolsPlaygroundPage() {
    const [vaultToken, setVaultToken] = useState("");
    const [city, setCity] = useState("San Francisco");
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleTestTool = async (e) => {
        e.preventDefault();
        if (!vaultToken) {
            setError("Vault token is required to access protected tools.");
            return;
        }

        setLoading(true);
        setError("");
        setResult(null);
        try {
            const data = await callWeatherTool(vaultToken, city);
            setResult(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
                <h2 className="text-lg font-semibold text-slate-900">Tools Playground</h2>
                <p className="mt-1 text-sm text-slate-600">
                    Use vault-issued tokens to access protected external APIs and tools.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tool Config */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <form onSubmit={handleTestTool} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Simulation Mode</label>
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                                    <CloudIcon className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900">Weather API</p>
                                    <p className="text-[11px] text-slate-500">Requires <code className="text-blue-600 font-bold px-1">read:weather</code> scope</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Vault Token</label>
                            <textarea
                                className="w-full h-32 rounded-xl border border-slate-300 bg-white px-4 py-3 text-xs font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none"
                                placeholder="Paste the JWT from the 'Tokens' page..."
                                value={vaultToken}
                                onChange={(e) => setVaultToken(e.target.value)}
                                required
                            />
                            <p className="mt-2 text-[11px] text-slate-400 italic flex items-center gap-1">
                                <ShieldCheckIcon className="h-3.5 w-3.5" />
                                This token contains your agent identity and authorized scopes.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Search City</label>
                            <div className="relative">
                                <MapPinIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    placeholder="e.g. New York"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !vaultToken}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-xl transition-all hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                            ) : (
                                <CommandLineIcon className="h-4 w-4" />
                            )}
                            {loading ? "Executing Tool..." : "Run Tool Simulation"}
                        </button>
                    </form>
                </div>

                {/* Execution Output */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-sm flex flex-col min-h-[400px]">
                    <div className="bg-white rounded-t-xl border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Execution Output</span>
                        {result && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-tighter">Success</span>}
                        {error && <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded uppercase tracking-tighter">Denied</span>}
                    </div>

                    <div className="flex-1 p-6 flex flex-col">
                        {!result && !error && !loading && (
                            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                                <GlobeAltIcon className="h-16 w-16 text-slate-300 mb-4" />
                                <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">Idle State</p>
                            </div>
                        )}

                        {loading && (
                            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                                <div className="relative">
                                    <div className="h-16 w-16 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
                                </div>
                                <p className="text-xs font-medium text-slate-400 animate-pulse tracking-wide uppercase">Verifying Scope Integrity...</p>
                            </div>
                        )}

                        {error && (
                            <div className="flex-1 flex flex-col items-center justify-center text-center">
                                <div className="bg-rose-100 text-rose-600 p-4 rounded-3xl mb-4">
                                    <ShieldExclamationIcon className="h-10 w-10" />
                                </div>
                                <h4 className="text-lg font-bold text-slate-800">Access Denied</h4>
                                <p className="text-sm text-slate-500 mt-2 max-w-xs">{error}</p>
                                <div className="mt-6 p-3 rounded-xl bg-rose-50 border border-rose-100 text-[11px] text-rose-700 italic">
                                    "Permissions for this tool were not found in your provided token or have been revoked."
                                </div>
                            </div>
                        )}

                        {result && (
                            <div className="flex-1 animate-fade-in-up">
                                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                                    <div className="p-6 bg-blue-600 text-white flex items-center justify-between">
                                        <div>
                                            <h4 className="text-2xl font-bold tracking-tight">{result.city}</h4>
                                            <p className="text-xs opacity-70 font-medium uppercase tracking-widest">Real-time Weather Report</p>
                                        </div>
                                        <CloudIcon className="h-12 w-12 opacity-30" />
                                    </div>
                                    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:divide-x divide-slate-100">
                                        <div className="flex flex-col items-center justify-center py-4">
                                            <span className="text-5xl font-black text-slate-900 tracking-tighter">{result.temperature}°</span>
                                            <span className="text-xs font-bold text-slate-400 uppercase mt-2 tracking-widest">Temperature</span>
                                        </div>
                                        <div className="flex flex-col items-center justify-center py-4 sm:pl-6">
                                            <span className="text-lg font-bold text-slate-700">{result.conditions}</span>
                                            <span className="text-xs font-bold text-slate-400 uppercase mt-2 tracking-widest">Conditions</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-start gap-3">
                                    <ShieldCheckIcon className="h-5 w-5 text-emerald-600 mt-0.5" />
                                    <div className="text-[11px] leading-relaxed text-emerald-800">
                                        <span className="font-bold">Security Pass</span>: This tool request was authorized and executed using your vault-scoped token. The usage has been recorded in the permanent audit trail.
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
