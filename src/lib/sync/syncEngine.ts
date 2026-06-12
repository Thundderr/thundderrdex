// Cloud-sync engine: mirrors the registered Zustand stores to Supabase with
// debounced uploads and last-write-wins reconciliation. Module-level
// singleton driven by SyncManager (start on sign-in, stop on sign-out).
//
// Safety invariants:
// - Nothing touches the network before every store has rehydrated from
//   localStorage (otherwise empty defaults could overwrite real cloud data).
// - Store subscriptions attach only after the initial reconcile.
// - The applyingRemote flag prevents downloads from re-triggering uploads.
// - Uploads go through the save_user_state RPC, which rejects writes older
//   than what's stored; a rejected write means another device won the race
//   and its data is downloaded instead.
// - Payloads with a schema version newer than this build are never applied,
//   and that store stops uploading for the session (no downgrades).

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { getStamp, setStamp, SyncStoreKey } from "./meta";
import { SYNCED_STORES, SyncedStoreConfig } from "./storeRegistry";

const TABLE = "user_state";
const DEBOUNCE_MS = 2500;
const FOCUS_PULL_THROTTLE_MS = 60_000;
const BACKOFF_MS = [5_000, 15_000, 60_000];
const SIGN_OUT_FLUSH_TIMEOUT_MS = 3_000;

interface RemoteRow {
  store_key: string;
  payload: unknown;
  version: number;
  updated_at: string;
}

interface StoreRuntime {
  cfg: SyncedStoreConfig;
  lastSerialized: string;
  dirty: boolean;
  failed: boolean;
  schemaLocked: boolean;
  debounceTimer: ReturnType<typeof setTimeout> | null;
  unsubscribe: (() => void) | null;
}

interface EngineState {
  userId: string;
  runtimes: Map<SyncStoreKey, StoreRuntime>;
  applyingRemote: boolean;
  reconciled: boolean;
  backoffIndex: number;
  retryTimer: ReturnType<typeof setTimeout> | null;
  lastFocusPullAt: number;
  removeWindowListeners: (() => void) | null;
  stopped: boolean;
}

let engine: EngineState | null = null;

export async function startSync(userId: string): Promise<void> {
  if (!supabase || typeof window === "undefined") return;
  if (engine && engine.userId === userId && !engine.stopped) return;
  if (engine) stopSync();

  const e: EngineState = {
    userId,
    runtimes: new Map(
      SYNCED_STORES.map((cfg) => [
        cfg.key,
        {
          cfg,
          lastSerialized: "",
          dirty: false,
          failed: false,
          schemaLocked: false,
          debounceTimer: null,
          unsubscribe: null,
        },
      ])
    ),
    applyingRemote: false,
    reconciled: false,
    backoffIndex: 0,
    retryTimer: null,
    lastFocusPullAt: 0,
    removeWindowListeners: null,
    stopped: false,
  };
  engine = e;
  useAuthStore.getState().setSyncStatus("syncing");

  // Load-bearing guard: never read (or upload) store state before it has
  // rehydrated from localStorage.
  await Promise.all(
    SYNCED_STORES.map((cfg) =>
      cfg.hasHydrated()
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            const unsub = cfg.onFinishHydration(() => {
              unsub();
              resolve();
            });
          })
    )
  );
  if (engine !== e || e.stopped) return;

  await reconcile(e);
}

export function stopSync(): void {
  const e = engine;
  if (!e) return;
  e.stopped = true;
  for (const rt of e.runtimes.values()) {
    rt.unsubscribe?.();
    if (rt.debounceTimer) clearTimeout(rt.debounceTimer);
  }
  if (e.retryTimer) clearTimeout(e.retryTimer);
  e.removeWindowListeners?.();
  engine = null;
  useAuthStore.getState().setSyncStatus("idle");
}

// Manual retry from the account menu's "Retry" button.
export function retrySync(): void {
  const e = engine;
  if (!e || e.stopped) return;
  e.backoffIndex = 0;
  if (!e.reconciled) {
    void reconcile(e);
  } else {
    flushDirty(e);
  }
}

// Sign-out path: best-effort flush of pending changes first so the last few
// seconds of edits aren't stranded on this device.
export async function signOutWithFlush(): Promise<void> {
  if (!supabase) return;
  const e = engine;
  if (e && !e.stopped && e.reconciled) {
    const uploads: Promise<void>[] = [];
    for (const rt of e.runtimes.values()) {
      if (!rt.dirty) continue;
      if (rt.debounceTimer) {
        clearTimeout(rt.debounceTimer);
        rt.debounceTimer = null;
      }
      uploads.push(uploadStore(e, rt));
    }
    await Promise.race([
      Promise.all(uploads),
      new Promise((resolve) => setTimeout(resolve, SIGN_OUT_FLUSH_TIMEOUT_MS)),
    ]);
  }
  stopSync();
  await supabase.auth.signOut();
}

// --- Reconcile (runs once per sign-in) --------------------------------------

async function reconcile(e: EngineState): Promise<void> {
  useAuthStore.getState().setSyncStatus("syncing");
  const { data, error } = await supabase!
    .from(TABLE)
    .select("store_key, payload, version, updated_at");
  if (engine !== e || e.stopped) return;
  if (error) {
    setStatus(e, { failedNow: true });
    scheduleRetry(e, () => void reconcile(e));
    return;
  }

  const rows = new Map<string, RemoteRow>(
    ((data ?? []) as RemoteRow[]).map((r) => [r.store_key, r])
  );

  for (const rt of e.runtimes.values()) {
    const cfg = rt.cfg;
    const local = cfg.getPayload();
    const stamp = getStamp(cfg.key);
    const remote = rows.get(cfg.key);

    if (!remote) {
      // First-ever sign-in for this store: upload local data if there is any.
      if (!cfg.isDefault(local)) {
        if (stamp == null) setStamp(cfg.key, Date.now());
        rt.dirty = true;
      }
    } else if (stamp != null) {
      // Normal case: this device tracks its edits — plain last-write-wins.
      const remoteTs = Date.parse(remote.updated_at);
      if (remoteTs > stamp) {
        applyRemoteRow(e, rt, remote);
      } else if (stamp > remoteTs) {
        rt.dirty = true;
      }
    } else if (cfg.isDefault(local)) {
      // New device with no data: adopt the cloud copy.
      applyRemoteRow(e, rt, remote);
    } else {
      // Adoption edge: real local data but no stamp (app was used signed-out
      // before sync existed) AND a cloud copy exists. Merge where the data
      // allows it; otherwise back up local before letting the cloud win.
      const remotePayload = prepareRemotePayload(rt, remote);
      if (remotePayload == null) {
        // Cloud copy unusable — keep local and let it become the new truth.
        setStamp(cfg.key, Date.now());
        rt.dirty = true;
      } else if (cfg.merge) {
        const merged = cfg.merge(local, remotePayload);
        e.applyingRemote = true;
        try {
          cfg.applyPayload(merged);
        } finally {
          e.applyingRemote = false;
        }
        setStamp(cfg.key, Date.now());
        rt.dirty = true;
      } else {
        backupLocal(cfg.key, local);
        applyRemoteRow(e, rt, remote);
      }
    }
  }

  for (const rt of e.runtimes.values()) {
    rt.lastSerialized = JSON.stringify(rt.cfg.getPayload());
    rt.unsubscribe = rt.cfg.subscribe(() => onStoreChange(e, rt));
  }
  e.reconciled = true;
  attachWindowListeners(e);
  flushDirty(e);
  setStatus(e);
}

function backupLocal(key: SyncStoreKey, payload: unknown): void {
  try {
    window.localStorage.setItem(
      `thundderrdex-${key}-presync-backup`,
      JSON.stringify(payload)
    );
  } catch {
    // Best effort; the same data also still exists in the store's own key
    // until the remote payload is applied.
  }
}

// --- Applying remote data ----------------------------------------------------

// Migrate (if older) and validate a remote payload. Returns null if the
// payload can't be used; sets schemaLocked when it comes from a newer build.
function prepareRemotePayload(rt: StoreRuntime, row: RemoteRow): unknown | null {
  const cfg = rt.cfg;
  if (row.version > cfg.version) {
    rt.schemaLocked = true;
    return null;
  }
  let payload = row.payload;
  if (row.version < cfg.version) {
    if (!cfg.migrate) return null;
    try {
      payload = cfg.migrate(payload, row.version);
    } catch (err) {
      console.warn(`[sync] migration failed for "${cfg.key}"`, err);
      return null;
    }
  }
  if (!cfg.validate(payload)) {
    console.warn(`[sync] invalid cloud payload for "${cfg.key}" — skipped`);
    return null;
  }
  return payload;
}

function applyRemoteRow(e: EngineState, rt: StoreRuntime, row: RemoteRow): void {
  const payload = prepareRemotePayload(rt, row);
  if (payload == null) return;
  e.applyingRemote = true;
  try {
    rt.cfg.applyPayload(payload);
  } finally {
    e.applyingRemote = false;
  }
  rt.lastSerialized = JSON.stringify(rt.cfg.getPayload());
  setStamp(rt.cfg.key, Date.parse(row.updated_at));
  rt.dirty = false;
}

// --- Change detection + upload -----------------------------------------------

function onStoreChange(e: EngineState, rt: StoreRuntime): void {
  if (e.stopped || e.applyingRemote || !e.reconciled || rt.schemaLocked) return;
  // Serialized comparison so non-persisted churn (e.g. fullscreen toggles,
  // which change tab references but are stripped by partialize) is ignored.
  const serialized = JSON.stringify(rt.cfg.getPayload());
  if (serialized === rt.lastSerialized) return;
  rt.lastSerialized = serialized;
  // Stamp synchronously so the edit survives a crash before the upload fires.
  setStamp(rt.cfg.key, Date.now());
  rt.dirty = true;
  setStatus(e);
  if (rt.debounceTimer) clearTimeout(rt.debounceTimer);
  rt.debounceTimer = setTimeout(() => {
    rt.debounceTimer = null;
    void uploadStore(e, rt);
  }, DEBOUNCE_MS);
}

async function uploadStore(e: EngineState, rt: StoreRuntime): Promise<void> {
  if (!supabase || e.stopped || rt.schemaLocked || !rt.dirty) return;
  const stampAtSend = getStamp(rt.cfg.key) ?? Date.now();
  rt.failed = false;
  const { data, error } = await supabase.rpc("save_user_state", {
    p_store_key: rt.cfg.key,
    p_payload: rt.cfg.getPayload(),
    p_version: rt.cfg.version,
    p_updated_at: new Date(stampAtSend).toISOString(),
  });
  if (engine !== e || e.stopped) return;

  if (error) {
    rt.failed = true;
    setStatus(e);
    scheduleRetry(e, () => flushDirty(e));
    return;
  }

  // If the user edited again while the request was in flight, the newer stamp
  // owns the dirty flag — leave it for the already-scheduled next upload.
  const editedMeanwhile = getStamp(rt.cfg.key) !== stampAtSend;

  if (data == null) {
    // RPC guard rejected the write: another device holds newer data.
    // Adopt it (consistent last-write-wins) unless we just edited again,
    // in which case the next upload will re-contest with a newer timestamp.
    if (!editedMeanwhile) {
      rt.dirty = false;
      const { data: row, error: rowError } = await supabase
        .from(TABLE)
        .select("store_key, payload, version, updated_at")
        .eq("store_key", rt.cfg.key)
        .maybeSingle();
      if (engine !== e || e.stopped) return;
      if (!rowError && row) applyRemoteRow(e, rt, row as RemoteRow);
    }
  } else if (!editedMeanwhile) {
    rt.dirty = false;
  }
  e.backoffIndex = 0;
  setStatus(e);
}

function flushDirty(e: EngineState): void {
  for (const rt of e.runtimes.values()) {
    if (!rt.dirty) continue;
    if (rt.debounceTimer) {
      clearTimeout(rt.debounceTimer);
      rt.debounceTimer = null;
    }
    void uploadStore(e, rt);
  }
}

function scheduleRetry(e: EngineState, fn: () => void): void {
  if (e.retryTimer) return;
  const delay = BACKOFF_MS[Math.min(e.backoffIndex, BACKOFF_MS.length - 1)];
  e.backoffIndex++;
  e.retryTimer = setTimeout(() => {
    e.retryTimer = null;
    if (!e.stopped) fn();
  }, delay);
}

// --- Window listeners (flush-on-leave, retry-on-online, pull-on-focus) -------

function attachWindowListeners(e: EngineState): void {
  const onVisibility = () => {
    if (document.visibilityState === "hidden") {
      flushDirty(e);
    } else {
      onBecameActive(e);
    }
  };
  const onPageHide = () => flushDirty(e);
  const onOnline = () => {
    e.backoffIndex = 0;
    flushDirty(e);
    setStatus(e);
  };
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", onPageHide);
  window.addEventListener("online", onOnline);
  e.removeWindowListeners = () => {
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", onPageHide);
    window.removeEventListener("online", onOnline);
  };
}

function onBecameActive(e: EngineState): void {
  const anyDirty = [...e.runtimes.values()].some((rt) => rt.dirty);
  if (anyDirty) {
    flushDirty(e);
    return;
  }
  void focusPull(e);
}

// Cheap cross-device freshness: when the tab regains focus and nothing is
// dirty locally, check row timestamps and pull anything newer.
async function focusPull(e: EngineState): Promise<void> {
  if (!supabase) return;
  const now = Date.now();
  if (now - e.lastFocusPullAt < FOCUS_PULL_THROTTLE_MS) return;
  e.lastFocusPullAt = now;

  const { data, error } = await supabase.from(TABLE).select("store_key, updated_at");
  if (error || engine !== e || e.stopped) return;

  const newerKeys = ((data ?? []) as { store_key: string; updated_at: string }[])
    .filter((r) => {
      const rt = e.runtimes.get(r.store_key as SyncStoreKey);
      if (!rt || rt.dirty || rt.schemaLocked) return false;
      const stamp = getStamp(rt.cfg.key);
      return stamp == null || Date.parse(r.updated_at) > stamp;
    })
    .map((r) => r.store_key);
  if (newerKeys.length === 0) return;

  const { data: rows, error: rowsError } = await supabase
    .from(TABLE)
    .select("store_key, payload, version, updated_at")
    .in("store_key", newerKeys);
  if (rowsError || engine !== e || e.stopped) return;

  for (const row of (rows ?? []) as RemoteRow[]) {
    const rt = e.runtimes.get(row.store_key as SyncStoreKey);
    if (rt && !rt.dirty) applyRemoteRow(e, rt, row);
  }
  setStatus(e);
}

// --- Status reporting ---------------------------------------------------------

function setStatus(e: EngineState, opts?: { failedNow?: boolean }): void {
  const runtimes = [...e.runtimes.values()];
  const anyFailed = opts?.failedNow || runtimes.some((rt) => rt.failed);
  const anyLocked = runtimes.some((rt) => rt.schemaLocked);
  const anyPending = runtimes.some((rt) => rt.dirty) || !e.reconciled;
  const { setSyncStatus } = useAuthStore.getState();

  if (anyFailed && typeof navigator !== "undefined" && !navigator.onLine) {
    setSyncStatus("offline");
  } else if (anyFailed) {
    setSyncStatus("error", "Couldn't reach the cloud — will retry.");
  } else if (anyLocked) {
    setSyncStatus(
      "error",
      "Your cloud data was saved by a newer version of the app. Refresh to update."
    );
  } else if (anyPending) {
    setSyncStatus("syncing");
  } else {
    setSyncStatus("synced");
  }
}
