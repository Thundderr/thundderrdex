"use client";

import { useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { AccountMenu } from "./AccountMenu";
import { AuthModal } from "./AuthModal";
import { syncStatusMeta } from "./syncStatusMeta";

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

  const meta = syncStatusMeta(syncStatus);

  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={() => setMenuOpen((open) => !open)}
        className="relative w-8 h-8 rounded-full bg-surface-hover hover:bg-line text-fg text-sm font-semibold flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label={`Account — ${meta.label}${user?.email ? ` (${user.email})` : ""}`}
        title={`${user?.email ?? "Account"} · ${meta.label}`}
      >
        {user?.email?.[0]?.toUpperCase() ?? "?"}
        <span
          role="status"
          aria-label={meta.label}
          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-app ${meta.dot}`}
        />
      </button>
      {menuOpen && <AccountMenu onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
