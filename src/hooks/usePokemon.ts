"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPokemon } from "@/lib/pokeapi/client";
import { transformFullPokemon } from "@/lib/pokeapi/transformers";
import { isChampionsMega } from "@/lib/pokemon/championsMega";
import { transformDexSpecies } from "@/lib/pokemon/championsData";
import { Pokemon } from "@/types/pokemon";

export function usePokemon(nameOrId: string | number | null) {
  return useQuery({
    queryKey: ["pokemon", nameOrId],
    queryFn: async (): Promise<Pokemon> => {
      if (!nameOrId) throw new Error("No Pokemon specified");
      if (typeof nameOrId === "string" && isChampionsMega(nameOrId)) {
        return transformDexSpecies(nameOrId);
      }
      const data = await fetchPokemon(nameOrId);
      return transformFullPokemon(data);
    },
    enabled: !!nameOrId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days - Pokemon data is static
    retry: 1,
  });
}
