"use client";

import { useQuery } from "@tanstack/react-query";
import { useGenerationStore } from "@/stores/generationStore";

// Format display names and priorities
const FORMAT_INFO: Record<string, { display: string; priority: number }> = {
  ubers: { display: "Ubers", priority: 0 },
  ou: { display: "OU", priority: 1 },
  uu: { display: "UU", priority: 2 },
  ru: { display: "RU", priority: 3 },
  nu: { display: "NU", priority: 4 },
  pu: { display: "PU", priority: 5 },
  zu: { display: "ZU", priority: 5.5 },
  lc: { display: "LC", priority: 6 },
  doublesou: { display: "Doubles", priority: 7 },
  monotype: { display: "Mono", priority: 8 },
  "1v1": { display: "1v1", priority: 9 },
};

// Formats to check for each generation
const GEN_FORMATS: Record<number, string[]> = {
  1: ["ou", "uu", "pu"],
  2: ["ou", "uu", "nu"],
  3: ["ubers", "ou", "uu", "nu"],
  4: ["ubers", "ou", "uu", "nu", "lc"],
  5: ["ubers", "ou", "uu", "ru", "nu", "pu", "lc", "monotype"],
  6: ["ubers", "ou", "uu", "ru", "nu", "pu", "lc", "doublesou", "monotype"],
  7: ["ubers", "ou", "uu", "ru", "nu", "pu", "lc", "doublesou", "monotype"],
  8: ["ubers", "ou", "uu", "ru", "nu", "pu", "lc", "doublesou", "monotype"],
  9: ["ubers", "ou", "uu", "ru", "nu", "pu", "zu", "lc", "doublesou", "monotype"],
};

export interface SmogonSet {
  name: string;
  format: string;
  formatDisplay: string;
  ability?: string | string[];
  item?: string | string[];
  nature?: string | string[];
  evs?: { hp?: number; atk?: number; def?: number; spa?: number; spd?: number; spe?: number };
  ivs?: { hp?: number; atk?: number; def?: number; spa?: number; spd?: number; spe?: number };
  moves: (string | string[])[];
  level?: number;
}

async function fetchSmogonSets(pokemonName: string, generation: number): Promise<SmogonSet[]> {
  const sets: SmogonSet[] = [];

  // Normalize Pokemon name for Smogon lookup (capitalize first letter of each word)
  const normalizedName = pokemonName
    .split("-")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join("-");

  const formats = GEN_FORMATS[generation] || GEN_FORMATS[9];

  // Dynamically import @smogon/sets to avoid SSR issues
  const { forFormat } = await import("@smogon/sets");

  // Fetch sets from each format
  for (const format of formats) {
    const formatId = `gen${generation}${format}`;
    try {
      const data = await forFormat(formatId);
      if (!data) continue;
      const dex = (data as { dex?: Record<string, unknown> }).dex || data;

      if (dex[normalizedName]) {
        const pokemonSets = dex[normalizedName];
        const formatInfo = FORMAT_INFO[format] || { display: format.toUpperCase(), priority: 100 };

        for (const [setName, setData] of Object.entries(pokemonSets)) {
          const s = setData as {
            moves?: string[];
            ability?: string;
            item?: string;
            nature?: string;
            evs?: Record<string, number>;
            ivs?: Record<string, number>;
            level?: number;
          };

          sets.push({
            name: setName,
            format: formatId,
            formatDisplay: formatInfo.display,
            ability: s.ability,
            item: s.item,
            nature: s.nature,
            evs: s.evs as SmogonSet["evs"],
            ivs: s.ivs as SmogonSet["ivs"],
            moves: s.moves || [],
            level: s.level,
          });
        }
      }
    } catch {
      // Format not available, skip
    }
  }

  // Sort by format priority, then by set name
  sets.sort((a, b) => {
    const formatA = a.format.replace(`gen${generation}`, "");
    const formatB = b.format.replace(`gen${generation}`, "");
    const priorityA = FORMAT_INFO[formatA]?.priority ?? 100;
    const priorityB = FORMAT_INFO[formatB]?.priority ?? 100;
    if (priorityA !== priorityB) return priorityA - priorityB;
    return a.name.localeCompare(b.name);
  });

  return sets;
}

export function useSmogonSets(pokemonName: string | null) {
  const { globalGeneration } = useGenerationStore();

  return useQuery({
    queryKey: ["smogon-sets", pokemonName, globalGeneration],
    queryFn: async (): Promise<SmogonSet[]> => {
      if (!pokemonName) throw new Error("No Pokemon specified");
      return fetchSmogonSets(pokemonName, globalGeneration);
    },
    enabled: !!pokemonName,
    staleTime: 60 * 60 * 1000, // 1 hour - Smogon sets don't change often
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: 1,
  });
}
