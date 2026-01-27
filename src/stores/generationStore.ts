import { create } from "zustand";
import { persist } from "zustand/middleware";

interface GenerationStore {
  globalGeneration: number;
  setGeneration: (gen: number) => void;
}

export const useGenerationStore = create<GenerationStore>()(
  persist(
    (set) => ({
      globalGeneration: 9, // Default to Gen 9
      setGeneration: (gen) => set({ globalGeneration: gen }),
    }),
    {
      name: "thundderrdex-generation",
    }
  )
);
