"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { retrySync, signOutWithFlush } from "@/lib/sync/syncEngine";
import { useAuthStore } from "@/stores/authStore";
import { POPOVER_MAXW } from "@/lib/utils/popoverPosition";
import { clearAllCache } from "@/lib/queryPersister";
import { Modal } from "@/components/ui";
import { AuthModal } from "./AuthModal";
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
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const syncStatus = useAuthStore((s) => s.syncStatus);
  const syncError = useAuthStore((s) => s.syncError);
  const lastSyncedAt = useAuthStore((s) => s.lastSyncedAt);
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [showClearCacheConfirm, setShowClearCacheConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);

  const signedIn = status !== "signedOut";
  const meta = syncStatusMeta(syncStatus);

  // Close on Escape like the rest of the app's overlays.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

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

  const handleClearCache = async () => {
    setIsClearing(true);
    setClearError(null);
    try {
      queryClient.clear();
      const success = await clearAllCache();
      if (success) {
        window.location.reload();
      } else {
        setClearError("Failed to clear cache. Please try again.");
        setIsClearing(false);
      }
    } catch (error) {
      console.error("Error clearing cache:", error);
      setClearError("Failed to clear cache. Please try again.");
      setIsClearing(false);
    }
  };

  return (
    <>
      {/* Invisible backdrop to close on outside click */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div role="dialog" aria-label="Account" className={`absolute right-0 top-full mt-1.5 w-60 bg-surface-raised rounded-lg shadow-xl border border-line z-50 p-3 ${POPOVER_MAXW}`}>
        {signedIn ? (
          <>
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
          </>
        ) : (
          <>
            <p className="text-xs text-fg font-medium">Not signed in</p>
            <p className="text-2xs text-fg-subtle mt-1">
              Sign in to sync your caught data across devices.
            </p>
            <button
              onClick={() => setAuthOpen(true)}
              className="mt-2 w-full px-3 py-1.5 text-xs text-white bg-accent hover:bg-accent-hover rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Sign in
            </button>
          </>
        )}

        {/* Utilities — available in both auth states */}
        <div className="mt-3 pt-3 border-t border-line">
          <button
            onClick={() => setShowClearCacheConfirm(true)}
            className="w-full px-2 py-1.5 text-xs text-fg-muted hover:text-fg bg-surface-hover hover:bg-line rounded transition-colors flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear Cache
          </button>
          <p className="text-2xs text-fg-subtle mt-2 text-center">
            Data from{" "}
            <a href="https://pokeapi.co" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              PokeAPI
            </a>
          </p>
        </div>
      </div>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}

      {/* Clear Cache confirmation — kept as a Modal (not ConfirmModal) to preserve
          the in-progress spinner and inline failure message. */}
      {showClearCacheConfirm && (
        <Modal
          isOpen
          onClose={() => { if (!isClearing) { setShowClearCacheConfirm(false); setClearError(null); } }}
          labelledBy="clear-cache-title"
          size="sm"
          dismissOnBackdrop={!isClearing}
          className="p-6"
        >
          <h3 id="clear-cache-title" className="text-lg font-semibold text-fg mb-2">Clear All Cache?</h3>
          <p className="text-sm text-fg-muted mb-4">
            This will delete all cached Pokemon data and reload the page. The app will need to re-fetch data from PokeAPI, which may take a moment.
          </p>
          {clearError && <p className="text-sm text-red-400 mb-4">{clearError}</p>}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => { setShowClearCacheConfirm(false); setClearError(null); }}
              disabled={isClearing}
              className="px-4 py-2 text-sm text-fg-muted hover:text-fg bg-surface-hover hover:bg-line rounded transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Cancel
            </button>
            <button
              onClick={handleClearCache}
              disabled={isClearing}
              className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-500 rounded transition-colors disabled:opacity-50 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {isClearing ? (
                <>
                  <svg className="w-4 h-4 animate-spin motion-reduce:animate-none" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Clearing...
                </>
              ) : (
                "Clear Cache"
              )}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
