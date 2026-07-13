"use client";

import { useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { AccountMenu } from "./AccountMenu";
import { syncStatusMeta } from "./syncStatusMeta";

export function AccountButton() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const syncStatus = useAuthStore((s) => s.syncStatus);
  const [menuOpen, setMenuOpen] = useState(false);

  if (!isSupabaseConfigured || status === "loading") return null;

  const signedIn = status !== "signedOut";
  const meta = signedIn ? syncStatusMeta(syncStatus) : null;

  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={() => setMenuOpen((open) => !open)}
        className="relative w-8 h-8 rounded-full bg-surface-hover hover:bg-line text-fg text-sm font-semibold flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label={signedIn ? `Account — ${meta!.label}${user?.email ? ` (${user.email})` : ""}` : "Menu"}
        title={signedIn ? `${user?.email ?? "Account"} · ${meta!.label}` : "Menu"}
      >
        {signedIn ? (
          <>
            {user?.email?.[0]?.toUpperCase() ?? "?"}
            <span
              role="status"
              aria-label={meta!.label}
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-app ${meta!.dot}`}
            />
          </>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        )}
      </button>
      {menuOpen && <AccountMenu onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
