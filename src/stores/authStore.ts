import { create } from "zustand";

export type AuthStatus = "loading" | "signedOut" | "signedIn";
export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "offline";

export interface AuthUser {
  id: string;
  email: string;
}

interface AuthStore {
  status: AuthStatus;
  user: AuthUser | null;
  syncStatus: SyncStatus;
  syncError: string | null;
  lastSyncedAt: number | null;
  // Set when Supabase fires PASSWORD_RECOVERY (user arrived via a reset
  // link); opens the new-password modal.
  recoveryMode: boolean;
  setAuth: (status: AuthStatus, user: AuthUser | null) => void;
  setSyncStatus: (syncStatus: SyncStatus, syncError?: string | null) => void;
  setRecoveryMode: (recoveryMode: boolean) => void;
}

// Not persisted: supabase-js already persists the session in localStorage.
export const useAuthStore = create<AuthStore>()((set) => ({
  status: "loading",
  user: null,
  syncStatus: "idle",
  syncError: null,
  lastSyncedAt: null,
  recoveryMode: false,
  setAuth: (status, user) => set({ status, user }),
  setSyncStatus: (syncStatus, syncError = null) =>
    set((state) => ({
      syncStatus,
      syncError,
      lastSyncedAt: syncStatus === "synced" ? Date.now() : state.lastSyncedAt,
    })),
  setRecoveryMode: (recoveryMode) => set({ recoveryMode }),
}));
