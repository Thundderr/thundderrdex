import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useModuleStore } from "./moduleStore";

interface GenerationStore {
  globalGeneration: number;
  setGeneration: (gen: number) => void;
}

export const useGenerationStore = create<GenerationStore>()(
  persist(
    (set) => ({
      globalGeneration: 9, // Default to Gen 9
      setGeneration: (gen) => {
        set({ globalGeneration: gen });
        // Reset all damage calc gimmicks when generation changes
        useModuleStore.getState().resetDamageCalcGimmicks();
      },
    }),
    {
      name: "thundderrdex-generation",
    }
  )
);
