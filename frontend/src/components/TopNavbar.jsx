import React, { useState, useRef, useEffect } from "react";
import {
    BellIcon,
    MagnifyingGlassIcon,
    ChevronDownIcon,
    ArrowRightOnRectangleIcon,
    IdentificationIcon,
    ShieldCheckIcon,
    Bars3Icon,
} from "@heroicons/react/24/outline";

export default function TopNavbar({
    title,
    userLabel,
    onSignOut,
    onSettingsClick,
    devBypassAuth,
    onMenuClick,
}) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-4 sm:px-6 py-3">
            <div className="flex items-center justify-between gap-3">
                {/* Left: Hamburger (mobile) + Title */}
                <div className="flex items-center gap-3 min-w-0">
                    {/* Hamburger – only on mobile/tablet */}
                    <button
                        onClick={onMenuClick}
                        className="lg:hidden flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors flex-shrink-0"
                        aria-label="Open navigation"
                    >
                        <Bars3Icon className="h-5 w-5" />
                    </button>

                    <div className="flex flex-col min-w-0">
                        <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <span>Console</span>
                            <span>/</span>
                            <span className="text-blue-600 truncate">{title}</span>
                        </div>
                        <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight truncate">
                            {title}
                        </h1>
                    </div>
                </div>

                {/* Right: Actions & Profile */}
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    {/* Global Search – desktop only */}
                    <div className="hidden xl:relative xl:block">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search vault..."
                            className="w-56 rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-4 text-xs transition-colors focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/5"
                        />
                    </div>

                    <div className="h-6 w-px bg-slate-200/60 hidden sm:block"></div>

                    {/* Notifications */}
                    <button className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
                        <BellIcon className="h-5 w-5" />
                        <span className="absolute top-2 right-2 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                    </button>

                    {/* User Profile Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
                        >
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-blue-500/20 flex-shrink-0">
                                {userLabel?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <div className="hidden md:flex flex-col items-start text-left">
                                <span className="text-xs font-bold text-slate-900 leading-none truncate max-w-[100px]">{userLabel}</span>
                                <span className="text-[10px] text-slate-400 font-medium">Platform Admin</span>
                            </div>
                            <ChevronDownIcon className={`h-3 w-3 text-slate-400 transition-transform duration-200 hidden sm:block ${dropdownOpen ? "rotate-180" : ""}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {dropdownOpen && (
                            <div className="absolute right-0 mt-2 w-52 origin-top-right rounded-2xl bg-white p-2 shadow-2xl border border-slate-100 ring-1 ring-black/5 focus:outline-none z-50">
                                <div className="px-3 py-2.5 border-b border-slate-50 mb-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Signed in as</p>
                                    <p className="text-xs font-semibold text-slate-900 truncate">{userLabel}</p>
                                </div>

                                <button
                                    onClick={() => { onSettingsClick?.(); setDropdownOpen(false); }}
                                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                    <IdentificationIcon className="h-4 w-4 text-slate-400" />
                                    <span>Account Settings</span>
                                </button>

                                <div className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-400 cursor-not-allowed opacity-50">
                                    <ShieldCheckIcon className="h-4 w-4" />
                                    <span>Security Policy</span>
                                </div>

                                <div className="h-px bg-slate-100 my-1"></div>

                                {onSignOut && (
                                    <button
                                        onClick={() => { onSignOut(); setDropdownOpen(false); }}
                                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors font-medium"
                                    >
                                        <ArrowRightOnRectangleIcon className="h-4 w-4" />
                                        <span>Sign Out</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
