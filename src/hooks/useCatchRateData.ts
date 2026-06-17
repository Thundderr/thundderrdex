"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPokemon, fetchPokemonSpecies } from "@/lib/pokeapi/client";
import {
  isUltraBeastSpecies,
  evolvesByMoonStone,
  isGen2FastBallSpecies,
} from "@/lib/utils/catchRate";

export interface CatchRateData {
  captureRate: number; // species base catch rate (0-255)
  baseHp: number;
  baseSpeed: number;
  weightKg: number;
  types: string[];
  isGenderless: boolean;
  isUltraBeast: boolean;
  evolvesByMoonStone: boolean;
  isGen2FastBallSpecies: boolean;
}

// Bundles the species + form data the catch-rate engine needs. Same caching
// posture as usePokemon — this data is static, so cache it for a long time.
export function useCatchRateData(nameOrId: string | number | null) {
  return useQuery({
    queryKey: ["catch-rate-data", nameOrId],
    queryFn: async (): Promise<CatchRateData> => {
      if (!nameOrId) throw new Error("No Pokemon specified");
      const [pokemon, species] = await Promise.all([
        fetchPokemon(nameOrId),
        fetchPokemonSpecies(nameOrId),
      ]);
      const statMap: Record<string, number> = {};
      for (const s of pokemon.stats) statMap[s.stat.name] = s.base_stat;
      return {
        captureRate: species.capture_rate,
        baseHp: statMap["hp"] ?? 1,
        baseSpeed: statMap["speed"] ?? 0,
        weightKg: pokemon.weight / 10, // hectograms -> kg
        types: pokemon.types.map((t) => t.type.name),
        isGenderless: species.gender_rate === -1,
        isUltraBeast: isUltraBeastSpecies(species.name),
        evolvesByMoonStone: evolvesByMoonStone(species.name),
        isGen2FastBallSpecies: isGen2FastBallSpecies(species.name),
      };
    },
    enabled: !!nameOrId,
    staleTime: 5 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
    retry: 1,
  });
}
