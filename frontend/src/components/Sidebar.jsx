import {
    HomeIcon,
    CubeIcon,
    KeyIcon,
    IdentificationIcon,
    CommandLineIcon,
    DocumentTextIcon,
    CodeBracketIcon,
    ChartBarIcon,
    Cog6ToothIcon,
    UsersIcon,
    LockClosedIcon,
    ArrowRightOnRectangleIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";

export default function Sidebar({ currentTab, onTabChange, userLabel, onSignOut, devBypassAuth, isOpen, onClose, rbac = {} }) {
    const navItems = [
        { id: "dashboard", label: "Dashboard", icon: HomeIcon, enabled: true },
        { id: "agents", label: "Agents", icon: CubeIcon, enabled: !!rbac.canReadAgents, requiredScope: "read:agents" },
        { id: "tokens", label: "Tokens", icon: KeyIcon, enabled: !!rbac.canUpdateAgents, requiredScope: "update:agents" },
        { id: "inspector", label: "Inspector", icon: IdentificationIcon, enabled: !!rbac.canReadAgents, requiredScope: "read:agents" },
        { id: "playground", label: "Playground", icon: CommandLineIcon, enabled: !!rbac.canCreateAgents, requiredScope: "create:agents" },
        { id: "audit", label: "Audit Logs", icon: DocumentTextIcon, enabled: !!rbac.canReadAudit, requiredScope: "read:audit" },
        { id: "developer", label: "Developer", icon: CodeBracketIcon, enabled: true },
        { id: "security", label: "Security", icon: ChartBarIcon, enabled: !!rbac.canReadAudit, requiredScope: "read:audit" },
        { id: "admin", label: "Admin", icon: UsersIcon, enabled: !!rbac.isAdmin, requiredScope: "admin:*" },
        { id: "settings", label: "Settings", icon: Cog6ToothIcon, enabled: true },
    ];

    const handleTabChange = (id, enabled) => {
        if (!enabled) {
            return;
        }
        onTabChange(id);
        if (onClose) onClose(); // Close drawer on mobile after tap
    };

    const sidebarContent = (
        <aside className="flex h-full w-64 flex-col bg-slate-800 text-white">
            {/* Logo Area */}
            <div className="border-b border-slate-700 p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <img
                        src="/logo-icon.png"
                        alt="SecureAgent Vault"
                        className="h-14 w-14 rounded-xl flex-shrink-0"
                    />
                    <div className="min-w-0">
                        <h1 className="text-base font-bold leading-tight">SecureAgent</h1>
                        <p className="text-xs text-slate-400">Vault</p>
                    </div>
                </div>
                {/* Mobile close button */}
                <button
                    onClick={onClose}
                    className="lg:hidden ml-2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                    aria-label="Close sidebar"
                >
                    <XMarkIcon className="h-5 w-5" />
                </button>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 overflow-y-auto space-y-0.5 p-3">
                {navItems.map((item) => {
                    const isActive = currentTab === item.id;
                    const isLocked = !item.enabled;
                    return (
                        <button
                            key={item.id}
                            data-tab={item.id}
                            onClick={() => handleTabChange(item.id, item.enabled)}
                            disabled={isLocked}
                            title={isLocked && item.requiredScope ? `Requires ${item.requiredScope}` : item.label}
                            className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all ${isActive
                                ? "bg-blue-600/20 text-white border border-blue-500/30"
                                : isLocked
                                    ? "text-slate-500 border border-transparent cursor-not-allowed opacity-70"
                                    : "text-slate-300 hover:bg-slate-700/60 hover:text-white border border-transparent"
                                }`}
                        >
                            {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-blue-500" />
                            )}
                            <item.icon className="h-5 w-5 flex-shrink-0" />
                            <span className="truncate">{item.label}</span>
                            {isLocked ? <LockClosedIcon className="ml-auto h-4 w-4 text-slate-500" /> : null}
                        </button>
                    );
                })}
            </nav>

            {/* Dev Bypass Notice */}
            {devBypassAuth ? (
                <div className="mx-3 mb-3 rounded-lg border border-emerald-600 bg-emerald-900/20 p-2.5">
                    <p className="text-xs text-emerald-400">🔓 Dev bypass active</p>
                </div>
            ) : null}

            {/* User Info Footer */}
            <div className="border-t border-slate-700 p-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white text-sm font-bold shadow">
                        {userLabel?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{userLabel}</p>
                        <p className="text-xs text-slate-400">
                            {devBypassAuth ? "Local mode" : "Authenticated"}
                        </p>
                    </div>
                </div>
                {onSignOut ? (
                    <button
                        onClick={onSignOut}
                        className="mt-2.5 flex w-full items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
                    >
                        <ArrowRightOnRectangleIcon className="h-4 w-4 flex-shrink-0" />
                        Sign Out
                    </button>
                ) : null}
            </div>
        </aside>
    );

    return (
        <>
            {/* Desktop Sidebar — always visible on lg+ */}
            <div className="hidden lg:flex lg:flex-shrink-0 h-screen sticky top-0">
                {sidebarContent}
            </div>

            {/* Mobile Drawer Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex lg:hidden">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                        onClick={onClose}
                        aria-hidden="true"
                    />
                    {/* Drawer panel */}
                    <div className="relative flex flex-shrink-0 h-full shadow-2xl">
                        {sidebarContent}
                    </div>
                </div>
            )}
        </>
    );
}
