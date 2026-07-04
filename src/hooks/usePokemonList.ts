"use client";

import { useQuery } from "@tanstack/react-query";
import { getSpriteUrl, getShowdownSpriteUrl } from "@/lib/pokeapi/client";
import { PokemonListItem } from "@/types/pokemon";
import { getRoster } from "@/lib/pokemon/roster";

export function usePokemonList() {
  return useQuery({
    queryKey: ["pokemon-list"],
    queryFn: async (): Promise<PokemonListItem[]> => {
      return getRoster().map((e) => ({
        id: e.num,
        name: e.id,
        displayName: e.displayName,
        // Base forms keep the PokéAPI sprite; alt/mega/regional forms use the
        // Showdown sprite (base-species PokéAPI fallback happens at render onError).
        spriteUrl: e.forme === "" ? getSpriteUrl(e.num) : getShowdownSpriteUrl(e.showdownName.toLowerCase()),
        isChampionsMega: e.isChampionsMega,
      }));
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
