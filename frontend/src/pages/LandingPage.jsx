import { useAuth0 } from "@auth0/auth0-react";

export default function LandingPage() {
    const { loginWithRedirect } = useAuth0();

    const requestedScopes =
        import.meta.env.VITE_AUTH0_SCOPE || "read:agents write:agents read:audit admin";

    return (
        <main className="flex min-h-screen flex-col lg:flex-row bg-slate-50">
            {/* Left Side: Branding & Value Prop (60%) */}
            <div className="relative hidden lg:flex lg:w-3/5 flex-col justify-center bg-slate-900 px-12 py-20 text-white overflow-hidden">
                {/* Background Decorative Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <defs>
                            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" />
                            </pattern>
                        </defs>
                        <rect width="100" height="100" fill="url(#grid)" />
                    </svg>
                </div>

                <div className="relative z-10 max-w-xl">
                    <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-blue-600/20 shadow-2xl shadow-blue-500/20 backdrop-blur ring-1 ring-blue-500/30 overflow-hidden">
                        <img src="/logo-icon.png" alt="SecureAgent Vault" className="h-full w-full object-cover" />
                    </div>

                    <p className="mt-8 text-sm font-semibold uppercase tracking-[0.3em] text-blue-400">
                        Zero-Trust Security
                    </p>
                    <h1 className="mt-4 text-6xl font-extrabold tracking-tight">
                        SecureAgent <span className="text-blue-500">Vault</span>
                    </h1>
                    <p className="mt-6 text-xl leading-relaxed text-slate-300">
                        The standard for securing how agents access tools, APIs, and data.
                        Replace static keys with short-lived, scoped credentials.
                    </p>

                    <ul className="mt-12 space-y-6">
                        {[
                            { icon: "🔐", text: "Eliminate long-lived API keys" },
                            { icon: "⏳", text: "Tokens expire in 2 minutes" },
                            { icon: "🎯", text: "Fine-grained permission scopes" },
                            { icon: "📜", text: "Immutable audit trail" },
                            { icon: "⚡", text: "Instant agent revocation" },
                        ].map((item, i) => (
                            <li key={i} className="flex items-center gap-4 group">
                                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-xl transition-colors group-hover:bg-blue-600/20">
                                    {item.icon}
                                </span>
                                <span className="text-lg text-slate-200">{item.text}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="absolute bottom-12 left-12">
                    <p className="text-sm text-slate-500">
                        &copy; 2026 SecureAgent Vault. All rights reserved.
                    </p>
                </div>
            </div>

            {/* Right Side: Login Card (40%) */}
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-12 bg-white">
                <div className="w-full max-w-md">
                    {/* Mobile Header */}
                    <div className="mb-10 lg:hidden flex items-center gap-3">
                        <img src="/logo-icon.png" alt="SecureAgent Vault" className="h-16 w-16 rounded-xl" />
                        <h1 className="text-2xl font-bold text-slate-900">SecureAgent Vault</h1>
                    </div>

                    <div className="text-center lg:text-left mb-10">
                        <h2 className="text-3xl font-bold text-slate-900">Welcome back</h2>
                        <p className="mt-3 text-slate-600">Log in to manage your agents and monitor security events.</p>
                    </div>

                    <button
                        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-xl shadow-blue-500/20 transition-all hover:bg-blue-700 hover:-translate-y-0.5"
                        onClick={() =>
                            loginWithRedirect({
                                authorizationParams: {
                                    audience: import.meta.env.VITE_AUTH0_AUDIENCE,
                                    scope: requestedScopes,
                                },
                            })
                        }
                    >
                        <span>Continue with Auth0</span>
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </button>

                    <div className="mt-10 relative">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="bg-white px-4 text-slate-500 font-medium">Quick Access</span>
                        </div>
                    </div>

                    {/* Preview Account */}
                    <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <p className="text-sm font-bold text-slate-900 uppercase tracking-wide">Preview Access</p>
                        </div>

                        <p className="text-sm text-slate-600 leading-relaxed">
                            Use our pre-configured demo to explore the full dashboard:
                        </p>

                        <div className="mt-4 flex flex-col gap-3">
                            <div className="flex items-center justify-between rounded-xl bg-white border border-slate-200 p-4">
                                <code className="text-xs font-mono text-blue-600">demo@secureagent.local</code>
                                <button
                                    onClick={() =>
                                        loginWithRedirect({
                                            authorizationParams: {
                                                audience: import.meta.env.VITE_AUTH0_AUDIENCE,
                                                scope: requestedScopes,
                                            },
                                            loginHint: "demo@secureagent.local",
                                        })
                                    }
                                    className="text-xs font-bold text-slate-900 underline hover:text-blue-600 transition-colors"
                                >
                                    Use this email
                                </button>
                            </div>
                            <button
                                onClick={() =>
                                    loginWithRedirect({
                                        authorizationParams: {
                                            audience: import.meta.env.VITE_AUTH0_AUDIENCE,
                                            scope: requestedScopes,
                                        },
                                        loginHint: "demo@secureagent.local",
                                    })
                                }
                                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-slate-800"
                            >
                                Log in as Preview User
                            </button>
                        </div>
                    </div>

                    <p className="mt-10 text-center text-xs text-slate-400">
                        Auth0 handles authentication — we never see your password.
                    </p>
                </div>
            </div>
        </main>
    );
}
