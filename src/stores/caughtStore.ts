import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CaughtStore {
  // Map of national dex id -> true for caught Pokemon. A plain object (not a
  // Set) so it serializes cleanly to localStorage via the persist middleware.
  caught: Record<number, true>;
  toggleCaught: (nationalId: number) => void;
  clearCaught: () => void;
}

export const useCaughtStore = create<CaughtStore>()(
  persist(
    (set) => ({
      caught: {},
      toggleCaught: (nationalId) =>
        set((state) => {
          const next = { ...state.caught };
          if (next[nationalId]) {
            delete next[nationalId];
          } else {
            next[nationalId] = true;
          }
          return { caught: next };
        }),
      clearCaught: () => set({ caught: {} }),
    }),
    {
      name: "thundderrdex-caught",
    }
  )
);
