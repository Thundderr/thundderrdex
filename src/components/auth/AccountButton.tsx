"use client";

import { useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase";
import { SyncStatus, useAuthStore } from "@/stores/authStore";
import { AccountMenu } from "./AccountMenu";
import { AuthModal } from "./AuthModal";

const DOT_CLASSES: Record<SyncStatus, string> = {
  synced: "bg-green-500",
  syncing: "bg-blue-400 animate-pulse",
  error: "bg-red-500",
  offline: "bg-slate-500",
  idle: "bg-slate-500",
};

export function AccountButton() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const syncStatus = useAuthStore((s) => s.syncStatus);
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  if (!isSupabaseConfigured || status === "loading") return null;

  if (status === "signedOut") {
    return (
      <div className="flex-shrink-0">
        <button
          onClick={() => setAuthOpen(true)}
          className="px-3 py-1.5 text-sm font-medium text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors whitespace-nowrap"
        >
          Sign in
        </button>
        {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
      </div>
    );
  }

  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={() => setMenuOpen((open) => !open)}
        className="relative w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold flex items-center justify-center transition-colors"
        title={user?.email}
      >
        {user?.email?.[0]?.toUpperCase() ?? "?"}
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${DOT_CLASSES[syncStatus]}`}
        />
      </button>
      {menuOpen && <AccountMenu onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
