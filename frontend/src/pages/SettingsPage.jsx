import {
    UserCircleIcon,
    ShieldCheckIcon,
    ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
export default function SettingsPage({ user }) {

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
                <h2 className="text-xl font-semibold text-slate-900">Account Settings</h2>
                <p className="mt-1 text-sm text-slate-600">
                    Manage your personal information and security preferences.
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Profile Card */}
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                            <UserCircleIcon className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900">User Profile</h3>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Full Name
                            </label>
                            <p className="mt-1 text-sm font-medium text-slate-900">
                                {user?.name || "N/A"}
                            </p>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Email Address
                            </label>
                            <p className="mt-1 text-sm font-medium text-slate-900">
                                {user?.email || "N/A"}
                            </p>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Account ID
                            </label>
                            <code className="mt-1 block truncate text-xs font-mono text-slate-600">
                                {user?.sub || "N/A"}
                            </code>
                        </div>
                    </div>
                </div>

                {/* Security Card */}
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                            <ShieldCheckIcon className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900">Security & Authentication</h3>
                    </div>

                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                        <p className="text-sm text-slate-700 leading-relaxed">
                            Your password, Multi-Factor Authentication (MFA), and login methods are securely managed by <span className="font-bold text-slate-900">Auth0</span>.
                        </p>

                        <a
                            href="https://auth0.com/user-profile"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 flex items-center justify-center gap-2 w-full rounded-xl bg-white border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-400"
                        >
                            <span>Manage Account on Auth0</span>
                            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                        </a>
                    </div>

                    <p className="mt-4 text-xs text-slate-500 text-center">
                        For security reasons, some settings can only be changed via the identity provider.
                    </p>
                </div>
            </div>
        </div>
    );
}
