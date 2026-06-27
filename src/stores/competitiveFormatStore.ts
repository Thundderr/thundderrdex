import { create } from "zustand";
import { persist } from "zustand/middleware";
import { COMPETITIVE_FORMATS, type CompetitiveFormatId } from "@/lib/competitive/formats";

/**
 * The selected competitive format (VGC Reg I ↔ Champions Reg M-A). Deliberately
 * separate from the generation selector — both target Gen 9, but they gate
 * different things (legality, Tera, which usage/teams feed to load).
 *
 * Local-persisted only for now: cloud sync would need a new Supabase store_key
 * (see docs/data-pathways.md / the training store note).
 */
interface CompetitiveFormatStore {
  format: CompetitiveFormatId;
  setFormat: (format: CompetitiveFormatId) => void;
}

// Default to the highest-activity current format (Champions Reg M-A ladder).
const DEFAULT_FORMAT: CompetitiveFormatId = "champions-regma";

export const useCompetitiveFormatStore = create<CompetitiveFormatStore>()(
  persist(
    (set) => ({
      format: DEFAULT_FORMAT,
      setFormat: (format) => {
        // Guard against a stale persisted id that's no longer in the registry.
        if (format in COMPETITIVE_FORMATS) set({ format });
      },
    }),
    {
      name: "thundderrdex-competitive-format",
      // Drop an unknown persisted id back to the default on hydrate.
      migrate: (persisted) => {
        const p = persisted as Partial<CompetitiveFormatStore> | undefined;
        if (!p || !(p.format && p.format in COMPETITIVE_FORMATS)) {
          return { format: DEFAULT_FORMAT } as CompetitiveFormatStore;
        }
        return p as CompetitiveFormatStore;
      },
    }
  )
);
