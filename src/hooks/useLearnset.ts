"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPokemon } from "@/lib/pokeapi/client";
import { transformLearnset } from "@/lib/pokeapi/transformers";
import { LearnsetEntry } from "@/types/moves";

export function useLearnset(pokemonName: string | null) {
  return useQuery({
    queryKey: ["learnset", pokemonName],
    queryFn: async (): Promise<LearnsetEntry[]> => {
      if (!pokemonName) throw new Error("No Pokemon specified");
      const data = await fetchPokemon(pokemonName);
      return transformLearnset(data.moves);
    },
    enabled: !!pokemonName,
    staleTime: 30 * 60 * 1000, // 30 minutes - learnsets take time to load
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days - learnset data is static
    retry: 1,
  });
}
