"use client";

import { useState, useEffect } from "react";
import { retrySync, signOutWithFlush } from "@/lib/sync/syncEngine";
import { useAuthStore } from "@/stores/authStore";
import { POPOVER_MAXW } from "@/lib/utils/popoverPosition";
import { syncStatusMeta } from "./syncStatusMeta";

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
  const [retrying, setRetrying] = useState(false);
  const meta = syncStatusMeta(syncStatus);

  // Dropdown should close on Escape like the rest of the app's overlays.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Give the retry an explicit pending state so the click visibly does something
  // (it used to silently no-op when the engine had stopped, with no feedback).
  const handleRetry = () => {
    setRetrying(true);
    retrySync();
    setTimeout(() => setRetrying(false), 1500);
  };

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
      <div role="dialog" aria-label="Account" className={`absolute right-0 top-full mt-1.5 w-60 bg-surface-raised rounded-lg shadow-xl border border-line z-50 p-3 ${POPOVER_MAXW}`}>
        <p className="text-xs text-fg font-medium truncate" title={user?.email}>
          {user?.email}
        </p>
        <p className={`flex items-center gap-1.5 text-2xs mt-1 ${syncStatus === "error" ? "text-red-400" : "text-fg-subtle"}`}>
          <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`} aria-hidden />
          <span>{statusText}</span>
        </p>
        {syncStatus === "error" && (
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="mt-2 w-full px-3 py-1.5 text-xs text-white bg-accent hover:bg-accent-hover disabled:opacity-60 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {retrying ? "Retrying…" : "Retry sync"}
          </button>
        )}
        <button
          onClick={() => void handleSignOut()}
          disabled={signingOut}
          className="mt-2 w-full px-3 py-1.5 text-xs text-fg-muted hover:text-fg bg-surface-hover hover:bg-line disabled:opacity-40 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {signingOut ? "Signing out..." : "Sign out"}
        </button>
        <p className="text-2xs text-fg-subtle mt-2">
          Your data stays on this device after signing out.
        </p>
      </div>
    </>
  );
}
