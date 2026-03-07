import { useState } from "react";
import {
    UserCircleIcon,
    ShieldCheckIcon,
    ArrowTopRightOnSquareIcon,
    PencilSquareIcon,
    CheckIcon,
    XMarkIcon
} from "@heroicons/react/24/outline";

export default function SettingsPage({ user }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(user?.name || "");
    const [isSaving, setIsSaving] = useState(false);
    const [savedName, setSavedName] = useState(user?.name || "");
    const [toastMsg, setToastMsg] = useState(null);

    const handleSaveProfile = async () => {
        setIsSaving(true);
        // Simulate an API call to update the user profile
        await new Promise((resolve) => setTimeout(resolve, 800));
        setSavedName(editName);
        setIsEditing(false);
        setIsSaving(false);
        setToastMsg("Profile updated successfully");
        setTimeout(() => setToastMsg(null), 3000);
    };

    const handleCancelEdit = () => {
        setEditName(savedName);
        setIsEditing(false);
    };

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

                    <div className="space-y-4 relative">
                        {toastMsg && (
                            <div className="absolute -top-12 left-0 right-0 flex justify-center animate-in fade-in slide-in-from-top-4">
                                <div className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white shadow-lg mx-auto flex items-center gap-2">
                                    <CheckIcon className="h-4 w-4" />
                                    {toastMsg}
                                </div>
                            </div>
                        )}

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Full Name
                                </label>
                                {!isEditing && (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                                    >
                                        <PencilSquareIcon className="h-3.5 w-3.5" />
                                        Edit
                                    </button>
                                )}
                            </div>

                            {isEditing ? (
                                <div className="flex items-center gap-2 mt-2">
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        disabled={isSaving}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                                    />
                                    <button
                                        onClick={handleSaveProfile}
                                        disabled={isSaving}
                                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                                    >
                                        {isSaving ? "Saving..." : <><CheckIcon className="h-4 w-4" /> Save</>}
                                    </button>
                                    <button
                                        onClick={handleCancelEdit}
                                        disabled={isSaving}
                                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                    >
                                        <XMarkIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            ) : (
                                <p className="text-sm font-medium text-slate-900">
                                    {savedName || "N/A"}
                                </p>
                            )}
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
