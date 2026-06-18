"use client";

import { useState } from "react";
import { retrySync, signOutWithFlush } from "@/lib/sync/syncEngine";
import { useAuthStore } from "@/stores/authStore";
import { POPOVER_MAXW } from "@/lib/utils/popoverPosition";

interface Props {
  onClose: () => void;
}

function formatLastSynced(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export function AccountMenu({ onClose }: Props) {
  const user = useAuthStore((s) => s.user);
  const syncStatus = useAuthStore((s) => s.syncStatus);
  const syncError = useAuthStore((s) => s.syncError);
  const lastSyncedAt = useAuthStore((s) => s.lastSyncedAt);
  const [signingOut, setSigningOut] = useState(false);

  const statusText =
    syncStatus === "synced"
      ? `Synced ${lastSyncedAt ? formatLastSynced(lastSyncedAt) : ""}`.trim()
      : syncStatus === "syncing"
        ? "Syncing..."
        : syncStatus === "offline"
          ? "Offline — will sync when online"
          : syncStatus === "error"
            ? (syncError ?? "Sync error")
            : "Sync idle";

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    await signOutWithFlush();
    onClose();
  };

  return (
    <>
      {/* Invisible backdrop to close on outside click */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className={`absolute right-0 top-full mt-1.5 w-60 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-50 p-3 ${POPOVER_MAXW}`}>
        <p className="text-xs text-white font-medium truncate" title={user?.email}>
          {user?.email}
        </p>
        <p className={`text-[11px] mt-1 ${syncStatus === "error" ? "text-red-400" : "text-slate-400"}`}>
          {statusText}
        </p>
        {syncStatus === "error" && (
          <button
            onClick={() => retrySync()}
            className="mt-2 w-full px-3 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 rounded transition-colors"
          >
            Retry sync
          </button>
        )}
        <button
          onClick={() => void handleSignOut()}
          disabled={signingOut}
          className="mt-2 w-full px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded transition-colors"
        >
          {signingOut ? "Signing out..." : "Sign out"}
        </button>
        <p className="text-[10px] text-slate-500 mt-2">
          Your data stays on this device after signing out.
        </p>
      </div>
    </>
  );
}
