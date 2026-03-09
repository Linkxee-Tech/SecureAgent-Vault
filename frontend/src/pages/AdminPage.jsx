import { ShieldCheckIcon, UserGroupIcon, Cog6ToothIcon } from "@heroicons/react/24/outline";

export default function AdminPage({ rbac }) {
    if (!rbac?.isAdmin) {
        return (
            <div className="flex h-64 items-center justify-center">
                <p className="text-slate-500">You do not have administrative privileges.</p>
            </div>
        );
    }

    return (
        <section className="space-y-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">System Administration</h1>
                <p className="mt-1 text-sm text-slate-600">
                    Manage operators, assign fine-grained roles, and configure global vault policies.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* User Management */}
                <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                            <UserGroupIcon className="h-5 w-5" />
                        </div>
                        <h3 className="font-semibold text-slate-900">User Management</h3>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                        Provision new operator accounts, assign RBAC roles (Auditor, Agent Manager), and suspend compromised users.
                    </p>
                    <button className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                        Manage Users
                    </button>
                </div>

                {/* System Settings */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <Cog6ToothIcon className="h-5 w-5" />
                        </div>
                        <h3 className="font-semibold text-slate-900">Vault Configuration</h3>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                        Configure global telemetry, token strictness loops, and machine identity lifetimes.
                    </p>
                    <button className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
                        System Settings
                    </button>
                </div>

                {/* Security Audit */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <ShieldCheckIcon className="h-5 w-5" />
                        </div>
                        <h3 className="font-semibold text-slate-900">Compliance Audit</h3>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                        Export unalterable ledger events for regulatory compliance and deep forensic analysis.
                    </p>
                    <button className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
                        Export Logs
                    </button>
                </div>
            </div>
        </section>
    );
}
