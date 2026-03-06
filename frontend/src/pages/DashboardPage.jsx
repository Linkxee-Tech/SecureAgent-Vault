import { useCallback, useEffect, useState } from "react";
import {
    ChartBarIcon,
    CheckCircleIcon,
    CubeIcon,
    KeyIcon,
    XCircleIcon,
} from "@heroicons/react/24/outline";
import { listAgents, listAudit } from "../services/api";

export default function DashboardPage({ getAccessToken, onSelectAgent, userName = "" }) {
    const [stats, setStats] = useState({
        totalAgents: 0,
        activeAgents: 0,
        tokensIssuedToday: 0,
        revokedAgents: 0,
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadDashboardData = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const token = await getAccessToken();

            // Load agents
            const agents = await listAgents(token);
            const totalAgents = agents.length;
            const activeAgents = agents.filter((agent) => agent.is_active).length;
            const revokedAgents = agents.filter((agent) => !agent.is_active).length;

            // Load audit logs
            const auditLogs = await listAudit(token);

            // Calculate tokens issued today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tokensIssuedToday = auditLogs.filter((log) => {
                const logDate = new Date(log.timestamp);
                return (
                    log.action === "token_issued" &&
                    logDate >= today
                );
            }).length;

            // Get recent activity (last 10 entries)
            const recentActivity = auditLogs.slice(0, 10);

            setStats({
                totalAgents,
                activeAgents,
                tokensIssuedToday,
                revokedAgents,
            });
            setRecentActivity(recentActivity);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [getAccessToken]);

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    const statCards = [
        {
            title: "Total Agents",
            value: stats.totalAgents,
            icon: CubeIcon,
            color: "text-blue-600",
            bgColor: "bg-blue-50",
        },
        {
            title: "Active Agents",
            value: stats.activeAgents,
            icon: CheckCircleIcon,
            color: "text-emerald-600",
            bgColor: "bg-emerald-50",
        },
        {
            title: "Tokens Issued Today",
            value: stats.tokensIssuedToday,
            icon: KeyIcon,
            color: "text-amber-600",
            bgColor: "bg-amber-50",
        },
        {
            title: "Revoked Agents",
            value: stats.revokedAgents,
            icon: XCircleIcon,
            color: "text-rose-600",
            bgColor: "bg-rose-50",
        },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <p className="text-sm text-slate-500">Loading dashboard...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Welcome Section */}
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
                <h2 className="text-2xl font-semibold text-slate-900">
                    {userName ? `Welcome back, ${userName}!` : "Welcome back!"}
                </h2>
                <p className="mt-2 text-slate-600">Your agents are secure and monitored.</p>
            </div>

            {error ? (
                <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
            ) : null}

            {/* Stats Cards */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {statCards.map((card) => (
                    <div
                        key={card.title}
                        className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur transition-shadow hover:shadow-md"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-600">{card.title}</p>
                                <p className="mt-2 text-3xl font-semibold text-slate-900">{card.value}</p>
                            </div>
                            <div className={`rounded-xl ${card.bgColor} p-3`}>
                                <card.icon className={`h-6 w-6 ${card.color}`} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
                <h3 className="text-lg font-semibold text-slate-900">Quick Actions</h3>
                <div className="mt-4 flex flex-wrap gap-3">
                    <button
                        className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                        onClick={() => {
                            // Navigate to agents tab
                            const agentsTab = document.querySelector('[data-tab="agents"]');
                            if (agentsTab) agentsTab.click();
                        }}
                    >
                        + New Agent
                    </button>
                    <button
                        className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                        onClick={() => {
                            // Navigate to audit tab
                            const auditTab = document.querySelector('[data-tab="audit"]');
                            if (auditTab) auditTab.click();
                        }}
                    >
                        View Audit Log
                    </button>
                    <button
                        className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                        onClick={loadDashboardData}
                    >
                        Refresh Dashboard
                    </button>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
                    <button
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                        onClick={() => {
                            const auditTab = document.querySelector('[data-tab="audit"]');
                            if (auditTab) auditTab.click();
                        }}
                    >
                        View All →
                    </button>
                </div>

                <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                        <thead className="text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-3 py-2">Time</th>
                                <th className="px-3 py-2">Agent</th>
                                <th className="px-3 py-2">Action</th>
                                <th className="px-3 py-2">Scopes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentActivity.map((entry) => (
                                <tr key={entry.id} className="border-t border-slate-200">
                                    <td className="px-3 py-3 text-slate-600">
                                        {new Date(entry.timestamp).toLocaleTimeString()}
                                    </td>
                                    <td className="px-3 py-3 font-medium text-slate-900">
                                        {entry.agent_name || entry.agent_id || "-"}
                                    </td>
                                    <td className="px-3 py-3">
                                        <span
                                            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${entry.action === "token_issued"
                                                ? "bg-emerald-100 text-emerald-800"
                                                : entry.action === "token_revoked"
                                                    ? "bg-rose-100 text-rose-800"
                                                    : "bg-slate-100 text-slate-800"
                                                }`}
                                        >
                                            {entry.action}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 text-slate-600">
                                        {entry.scopes?.join(", ") || "-"}
                                    </td>
                                </tr>
                            ))}
                            {recentActivity.length === 0 ? (
                                <tr>
                                    <td className="px-3 py-4 text-slate-500" colSpan={4}>
                                        No recent activity.
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
