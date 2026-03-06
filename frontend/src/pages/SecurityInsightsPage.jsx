import React, { useState, useEffect, useMemo } from "react";
import {
    ShieldCheckIcon,
    ShieldExclamationIcon,
    ArrowTrendingUpIcon,
    BellAlertIcon,
    LockClosedIcon,
    CpuChipIcon
} from "@heroicons/react/24/outline";
import { listAudit, listAgents } from "../services/api";

function StatCard({ title, value, subValue, icon: Icon, trend, color }) {
    const colorMap = {
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
        rose: "bg-rose-50 text-rose-600 border-rose-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100",
    };

    return (
        <div className={`rounded-2xl border p-5 shadow-sm bg-white ${colorMap[color].split(' ')[2]}`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{title}</p>
                    <h3 className="mt-2 text-3xl font-black text-slate-900 tracking-tighter">{value}</h3>
                    <div className="mt-1 flex items-center gap-1">
                        <span className={`text-[10px] font-bold ${trend > 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                            {trend > 0 ? `+${trend}%` : 'Stable'}
                        </span>
                        <span className="text-[10px] text-slate-400">{subValue}</span>
                    </div>
                </div>
                <div className={`p-3 rounded-xl ${colorMap[color].split(' ')[0]} ${colorMap[color].split(' ')[1]}`}>
                    <Icon className="h-6 w-6" />
                </div>
            </div>
        </div>
    );
}

export default function SecurityInsightsPage({ getAccessToken }) {
    const [auditLogs, setAuditLogs] = useState([]);
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const token = await getAccessToken();
                const [logs, agentList] = await Promise.all([
                    listAudit(token),
                    listAgents(token)
                ]);
                setAuditLogs(logs);
                setAgents(agentList);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [getAccessToken]);

    const stats = useMemo(() => {
        const tokenIssued = auditLogs.filter(l => l.action === 'token_issued').length;
        const revoked = auditLogs.filter(l => l.action.includes('revoked')).length;
        const activeAgents = agents.filter(a => a.is_active).length;

        return {
            tokenIssued,
            revoked,
            activeAgents,
            securityScore: 98
        };
    }, [auditLogs, agents]);

    const recentAlerts = [
        { id: 1, type: 'info', msg: 'System integrity check passed', time: '2 mins ago' },
        { id: 2, type: 'warning', msg: 'Multiple token requests for WeatherBot', time: '15 mins ago' },
        { id: 3, type: 'success', msg: 'Master key rotation scheduled', time: '1 hour ago' },
        { id: 4, type: 'danger', msg: 'Blocked unauthorized IP: 192.168.1.45', time: '3 hours ago' },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="text-center">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600 mx-auto" />
                    <p className="mt-4 text-sm font-medium text-slate-400 uppercase tracking-widest">Aggregating Security Intelligence...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
                <h2 className="text-lg font-semibold text-slate-900">Security Insights</h2>
                <p className="mt-1 text-sm text-slate-600">
                    Real-time monitoring of your agent ecosystem and security perimeter.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Security Score"
                    value={`${stats.securityScore}%`}
                    subValue="vs 92% avg"
                    icon={ShieldCheckIcon}
                    trend={2}
                    color="emerald"
                />
                <StatCard
                    title="Active Agents"
                    value={stats.activeAgents}
                    subValue={`of ${agents.length} total`}
                    icon={CpuChipIcon}
                    trend={0}
                    color="blue"
                />
                <StatCard
                    title="Tokens Issued"
                    value={stats.tokenIssued}
                    subValue="last 24 hours"
                    icon={LockClosedIcon}
                    trend={12}
                    color="amber"
                />
                <StatCard
                    title="Revocations"
                    value={stats.revoked}
                    subValue="security events"
                    icon={ShieldExclamationIcon}
                    trend={-5}
                    color="rose"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Activity Chart Mockup */}
                <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                                <ArrowTrendingUpIcon className="h-5 w-5" />
                            </div>
                            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800">Traffic Analysis</h3>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-lg border border-slate-100 text-[10px] font-bold text-slate-400">
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                            Requests / Minute
                        </div>
                    </div>

                    <div className="h-48 flex items-end justify-between gap-2 px-2">
                        {[35, 42, 38, 55, 62, 45, 50, 75, 40, 30, 45, 60].map((h, i) => (
                            <div key={i} className="flex-1 group relative">
                                <div
                                    className="w-full bg-blue-100 rounded-t-lg transition-all duration-500 group-hover:bg-blue-500/80"
                                    style={{ height: `${h}%` }}
                                />
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
                                    {h}req
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 flex justify-between px-2 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                        <span>00:00</span>
                        <span>06:00</span>
                        <span>12:00</span>
                        <span>18:00</span>
                        <span>23:59</span>
                    </div>
                </div>

                {/* Real-time Alerts */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
                            <BellAlertIcon className="h-5 w-5" />
                        </div>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800">Security Pulse</h3>
                    </div>

                    <div className="space-y-4">
                        {recentAlerts.map(alert => (
                            <div key={alert.id} className="flex gap-3 pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                                <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${alert.type === 'danger' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]' :
                                        alert.type === 'warning' ? 'bg-amber-500' :
                                            alert.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'
                                    }`} />
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-slate-900 leading-snug">{alert.msg}</p>
                                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tight">{alert.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button className="w-full mt-6 py-2.5 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-colors">
                        View All Events
                    </button>
                </div>
            </div>
        </div>
    );
}
