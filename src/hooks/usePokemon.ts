"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPokemon } from "@/lib/pokeapi/client";
import { transformFullPokemon } from "@/lib/pokeapi/transformers";
import { isChampionsMega } from "@/lib/pokemon/championsMega";
import { transformDexSpecies } from "@/lib/pokemon/dexSpecies";
import { toShowdownName } from "@/lib/pokemon/names";
import { Pokemon } from "@/types/pokemon";

export function usePokemon(nameOrId: string | number | null) {
  return useQuery({
    queryKey: ["pokemon", nameOrId],
    queryFn: async (): Promise<Pokemon> => {
      if (!nameOrId) throw new Error("No Pokemon specified");
      if (typeof nameOrId === "string") {
        // Champions megas have no PokéAPI entry — skip the doomed fetch.
        if (isChampionsMega(nameOrId)) return transformDexSpecies(toShowdownName(nameOrId));
        try {
          return transformFullPokemon(await fetchPokemon(nameOrId));
        } catch {
          // PokéAPI lacks this form (some @pkmn-only forms) — build from @pkmn/dex.
          return transformDexSpecies(toShowdownName(nameOrId));
        }
      }
      const data = await fetchPokemon(nameOrId);
      return transformFullPokemon(data);
    },
    enabled: !!nameOrId,
    staleTime: 5 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
    retry: 1,
  });
}
