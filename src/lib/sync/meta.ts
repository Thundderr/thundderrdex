// Local last-modified bookkeeping for the sync engine. Each synced store gets
// a millisecond timestamp of its last local edit, stored separately from the
// store data itself so last-write-wins can compare local vs remote ages.
// A missing stamp means this device has never recorded an edit since sync
// shipped ("unstamped") — the reconcile algorithm treats that case specially.

export type SyncStoreKey = "caught" | "modules" | "generation" | "training";

const META_KEY = "thundderrdex-sync-meta";

type SyncMeta = Partial<Record<SyncStoreKey, { lastModifiedAt: number }>>;

function readMeta(): SyncMeta {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(META_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as SyncMeta) : {};
  } catch {
    return {};
  }
}

export function getStamp(key: SyncStoreKey): number | null {
  const value = readMeta()[key]?.lastModifiedAt;
  return typeof value === "number" ? value : null;
}

export function setStamp(key: SyncStoreKey, ms: number): void {
  if (typeof window === "undefined") return;
  try {
    const meta = readMeta();
    meta[key] = { lastModifiedAt: ms };
    window.localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // localStorage unavailable; the store will reconcile as unstamped next time
  }
}
