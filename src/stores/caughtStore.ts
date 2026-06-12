import { create } from "zustand";
import { persist } from "zustand/middleware";

// Right-clicking a Pokedex tile cycles: unmarked -> "caught" -> "not-caught" -> unmarked.
// Absent from the map means unmarked.
export type CatchMark = "caught" | "not-caught";

// Bumped from 0 (Record<number, true>, caught-only) to 1 (Record<number, CatchMark>).
export const CAUGHT_STORE_VERSION = 1;

// Shared by the persist middleware and the cloud-sync engine so a v0 payload
// from either source normalizes the same way: legacy `true` means "caught".
export function migrateCaughtState(persisted: unknown): { caught: Record<number, CatchMark> } {
  const old = (persisted ?? {}) as { caught?: Record<string, unknown> };
  const next: Record<number, CatchMark> = {};
  for (const [key, value] of Object.entries(old.caught ?? {})) {
    if (value === true || value === "caught") next[Number(key)] = "caught";
    else if (value === "not-caught") next[Number(key)] = "not-caught";
  }
  return { caught: next };
}

interface CaughtStore {
  // Map of national dex id -> mark. A plain object (not a Map) so it
  // serializes cleanly to localStorage via the persist middleware.
  caught: Record<number, CatchMark>;
  cycleCaught: (nationalId: number) => void;
  clearCaught: () => void;
}

export const useCaughtStore = create<CaughtStore>()(
  persist(
    (set) => ({
      caught: {},
      cycleCaught: (nationalId) =>
        set((state) => {
          const next = { ...state.caught };
          const current = next[nationalId];
          if (current === undefined) {
            next[nationalId] = "caught";
          } else if (current === "caught") {
            next[nationalId] = "not-caught";
          } else {
            delete next[nationalId];
          }
          return { caught: next };
        }),
      clearCaught: () => set({ caught: {} }),
    }),
    {
      name: "thundderrdex-caught",
      version: CAUGHT_STORE_VERSION,
      migrate: (persisted) => migrateCaughtState(persisted) as CaughtStore,
    }
  )
);
