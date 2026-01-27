"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPokemonList } from "@/lib/pokeapi/client";
import { transformPokemonListItem } from "@/lib/pokeapi/transformers";
import { PokemonListItem } from "@/types/pokemon";

export function usePokemonList() {
  return useQuery({
    queryKey: ["pokemon-list"],
    queryFn: async (): Promise<PokemonListItem[]> => {
      const data = await fetchPokemonList(1025); // All Pokemon up to Gen 9
      return data.results.map((p) => transformPokemonListItem(p.name, p.url));
    },
    staleTime: Infinity, // Pokemon list never goes stale
    gcTime: Infinity,
  });
}
