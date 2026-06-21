import { SyncStatus } from "@/stores/authStore";

export interface SyncMeta {
  /** Tailwind classes for the status dot. */
  dot: string;
  /** Short accessible label. */
  label: string;
}

/**
 * Single source for how each sync state looks and reads. Notably gives `offline`
 * its own colour (was identical to `idle`, so "changes aren't reaching the cloud"
 * looked the same as "nothing happening").
 */
export function syncStatusMeta(status: SyncStatus): SyncMeta {
  switch (status) {
    case "synced":
      return { dot: "bg-green-500", label: "Synced" };
    case "syncing":
      return { dot: "bg-blue-400 animate-pulse motion-reduce:animate-none", label: "Syncing" };
    case "error":
      return { dot: "bg-red-500", label: "Sync error" };
    case "offline":
      return { dot: "bg-amber-500", label: "Offline" };
    default:
      return { dot: "bg-slate-500", label: "Sync idle" };
  }
}
