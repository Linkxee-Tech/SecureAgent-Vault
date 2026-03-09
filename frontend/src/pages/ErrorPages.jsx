import React from "react";
import {
    ShieldExclamationIcon,
    MapIcon,
    ArrowLeftIcon,
    HomeIcon
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";

export function NotFoundPage() {
    const navigate = useNavigate();
    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center p-6 bg-white/50 rounded-3xl border border-slate-100 shadow-sm backdrop-blur-sm">
            <div className="relative mb-8">
                <div className="absolute inset-0 scale-150 blur-3xl bg-blue-100 rounded-full opacity-50" />
                <div className="relative p-6 bg-white rounded-full border border-slate-100 shadow-xl shadow-slate-200/50 text-slate-400">
                    <MapIcon className="h-16 w-16" />
                </div>
            </div>
            <h1 className="text-6xl font-black text-slate-900 tracking-tighter">404</h1>
            <h2 className="mt-2 text-xl font-bold text-slate-800">Destination Not Found</h2>
            <p className="mt-4 text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
                The vault resource or page you are looking for has been moved, renamed, or is currently unavailable.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                    <ArrowLeftIcon className="h-4 w-4" />
                    Go Back
                </button>
                <button
                    onClick={() => navigate("/dashboard")}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 border border-slate-900 text-sm font-bold text-white hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20"
                >
                    <HomeIcon className="h-4 w-4" />
                    Return to Vault
                </button>
            </div>
        </div>
    );
}

export function UnauthorizedPage() {
    const navigate = useNavigate();
    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center p-6 bg-white/50 rounded-3xl border border-slate-100 shadow-sm backdrop-blur-sm">
            <div className="relative mb-8">
                <div className="absolute inset-0 scale-150 blur-3xl bg-rose-100 rounded-full opacity-50" />
                <div className="relative p-6 bg-white rounded-full border border-rose-100 shadow-xl shadow-rose-200/50 text-rose-500">
                    <ShieldExclamationIcon className="h-16 w-16" />
                </div>
            </div>
            <h1 className="text-6xl font-black text-slate-900 tracking-tighter underline decoration-rose-500 decoration-8 underline-offset-8">403</h1>
            <h2 className="mt-4 text-xl font-bold text-slate-800">Access Denied</h2>
            <p className="mt-4 text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
                You do not have the necessary cryptographic permissions or administrative roles to view this vault sector.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
                <button
                    onClick={() => navigate("/dashboard")}
                    className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-slate-900 border border-slate-900 text-sm font-bold text-white hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20"
                >
                    <ArrowLeftIcon className="h-4 w-4" />
                    Evacuate to Dashboard
                </button>
            </div>

            <div className="mt-12 p-4 bg-slate-50 border border-slate-100 rounded-2xl max-w-md mx-auto">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Security Recommendation</p>
                <p className="text-[11px] text-slate-600 leading-relaxed italic">
                    Ensure your Auth0 session is valid and your account has the{" "}
                    <code className="text-blue-600">admin</code> or{" "}
                    <code className="text-blue-600">read:agents</code> scope assigned.
                </p>
            </div>
        </div>
    );
}
