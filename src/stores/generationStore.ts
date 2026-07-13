import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useModuleStore } from "./moduleStore";

interface GenerationStore {
  globalGeneration: number;
  // Champions is a PvP battle format layered on top of Gen 9 (its mechanics are
  // Scarlet/Violet-era), not a generation of its own — so it's a separate flag
  // rather than a `globalGeneration` value, leaving every gen consumer untouched.
  // Local-only: it is intentionally excluded from the cloud sync payload.
  championsMode: boolean;
  setGeneration: (gen: number) => void;
  setChampionsMode: (on: boolean) => void;
}

export const useGenerationStore = create<GenerationStore>()(
  persist(
    (set) => ({
      globalGeneration: 9, // Default to Gen 9
      championsMode: false,
      setGeneration: (gen) => {
        // Picking a generation always leaves Champions mode.
        set({ globalGeneration: gen, championsMode: false });
        // Reset all damage calc gimmicks when generation changes
        useModuleStore.getState().resetDamageCalcGimmicks();
      },
      setChampionsMode: (on) => {
        // Champions runs on Gen 9 data/mechanics, so pin the generation to 9
        // while it's active (mirrors a generation switch: reset gimmicks).
        set(on ? { championsMode: true, globalGeneration: 9 } : { championsMode: false });
        useModuleStore.getState().resetDamageCalcGimmicks();
      },
    }),
    {
      name: "thundderrdex-generation",
    }
  )
);
