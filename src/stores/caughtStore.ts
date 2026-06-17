import { create } from "zustand";
import { persist } from "zustand/middleware";

// Right-clicking a Pokedex tile cycles: unmarked -> "caught" -> "not-caught" -> unmarked.
// Absent from the map means unmarked.
export type CatchMark = "caught" | "not-caught";

// Each dex tracks its catch marks in its own bucket, so the same species can be
// caught in one game and uncaught in another. The bucket key is "national" for
// the generation-grouped National view, or a region-group name (e.g. "Paldea",
// "Galar") for the regional dexes. Within a bucket, marks are keyed by a
// form-aware id: the bare national id for a base form ("79"), or "<id>-<region>"
// for a regional variant ("79-galar"). This keeps the same species tracked
// separately when different dexes show it as different forms (e.g. regular
// Slowpoke in Paldea vs Galarian Slowpoke in Blueberry). Bare-number keys from
// older data still read correctly as the base form.
export type CaughtBuckets = Record<string, Record<string, CatchMark>>;

export const NATIONAL_BUCKET = "national";

// v1 data was a single shared map; all of it was tracked while using Paldea, so
// it migrates into the Paldea region bucket.
export const PALDEA_BUCKET = "Paldea";

// Version history:
//   0: Record<number, true>            — caught-only, flat, national-id keyed
//   1: Record<number, CatchMark>       — 3-state, flat, national-id keyed
//   2: Record<bucketKey, Record<number, CatchMark>> — per-dex buckets
//   3: Record<bucketKey, Record<formAwareId, CatchMark>> — keys now "<id>" or "<id>-<region>"
//      (bare-number v2 keys are forward-compatible: they read as base forms)
export const CAUGHT_STORE_VERSION = 3;

function coerceMark(value: unknown): CatchMark | undefined {
  if (value === true || value === "caught") return "caught";
  if (value === "not-caught") return "not-caught";
  return undefined;
}

// Normalize an already-bucketed (v2/v3) map, coercing legacy inner values. Keys
// are kept as strings: v2 keys are bare national ids, v3 adds "<id>-<region>"
// variant keys — Number()-ing those would corrupt them to NaN.
function normalizeBuckets(map: Record<string, unknown>): CaughtBuckets {
  const out: CaughtBuckets = {};
  for (const [bucket, inner] of Object.entries(map)) {
    if (typeof inner !== "object" || inner === null) continue;
    const marks: Record<string, CatchMark> = {};
    for (const [id, value] of Object.entries(inner as Record<string, unknown>)) {
      const mark = coerceMark(value);
      if (mark) marks[id] = mark;
    }
    out[bucket] = marks;
  }
  return out;
}

// Shared by the persist middleware and the cloud-sync engine so a payload from
// either source — at any version — normalizes the same way. Detects the shape
// (flat v0/v1 vs. bucketed v2) rather than relying on a passed version, so it's
// correct regardless of which caller invokes it.
export function migrateCaughtState(persisted: unknown): { caught: CaughtBuckets } {
  const old = (persisted ?? {}) as { caught?: Record<string, unknown> };
  const caughtMap = old.caught ?? {};

  // v2: values are per-bucket objects.
  const isBucketed = Object.values(caughtMap).some(
    (v) => typeof v === "object" && v !== null
  );
  if (isBucketed) {
    return { caught: normalizeBuckets(caughtMap) };
  }

  // v0/v1: a single flat map, all in relation to Paldea. Keys are bare national
  // ids (base forms), kept as strings to match the form-aware key space.
  const paldea: Record<string, CatchMark> = {};
  for (const [key, value] of Object.entries(caughtMap)) {
    const mark = coerceMark(value);
    if (mark) paldea[key] = mark;
  }
  const caught: CaughtBuckets = {};
  if (Object.keys(paldea).length > 0) caught[PALDEA_BUCKET] = paldea;
  return { caught };
}

interface CaughtStore {
  // Map of bucket key -> (form-aware id -> mark). A plain object (not a Map) so
  // it serializes cleanly to localStorage via the persist middleware.
  caught: CaughtBuckets;
  // `key` is the form-aware id from catchKeyFor(): "79" or "79-galar".
  cycleCaught: (bucket: string, key: string) => void;
  // Clear one bucket's marks, or every bucket when no key is given.
  clearCaught: (bucket?: string) => void;
}

export const useCaughtStore = create<CaughtStore>()(
  persist(
    (set) => ({
      caught: {},
      cycleCaught: (bucket, key) =>
        set((state) => {
          const marks = { ...(state.caught[bucket] ?? {}) };
          const current = marks[key];
          if (current === undefined) {
            marks[key] = "caught";
          } else if (current === "caught") {
            marks[key] = "not-caught";
          } else {
            delete marks[key];
          }
          return { caught: { ...state.caught, [bucket]: marks } };
        }),
      clearCaught: (bucket) =>
        set((state) => {
          if (bucket === undefined) return { caught: {} };
          const next = { ...state.caught };
          delete next[bucket];
          return { caught: next };
        }),
    }),
    {
      name: "thundderrdex-caught",
      version: CAUGHT_STORE_VERSION,
      migrate: (persisted) => migrateCaughtState(persisted) as CaughtStore,
    }
  )
);
