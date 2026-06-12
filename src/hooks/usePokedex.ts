"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPokedex, getSpriteUrl } from "@/lib/pokeapi/client";
import { formatPokemonName } from "@/lib/pokeapi/transformers";

export interface PokedexEntry {
  regionalNumber: number; // Per-game regional dex number (entry_number)
  nationalId: number; // National dex id, used for sprite lookup
  name: string; // Species slug, e.g. "spinarak"
  displayName: string;
  spriteUrl: string;
}

// Extract the national dex id from a pokemon-species URL like ".../pokemon-species/167/"
function speciesIdFromUrl(url: string): number {
  return parseInt(url.split("/").filter(Boolean).pop() || "0", 10);
}

/**
 * Fetch a single regional Pokédex by its PokeAPI id and return its entries
 * sorted by regional number. Pass `enabled: false` (id === null) to skip.
 */
export function usePokedex(dexId: number | null) {
  return useQuery({
    queryKey: ["pokedex", dexId],
    enabled: dexId !== null,
    queryFn: async (): Promise<PokedexEntry[]> => {
      const data = await fetchPokedex(dexId as number);
      return data.pokemon_entries
        .map((entry) => {
          const nationalId = speciesIdFromUrl(entry.pokemon_species.url);
          return {
            regionalNumber: entry.entry_number,
            nationalId,
            name: entry.pokemon_species.name,
            displayName: formatPokemonName(entry.pokemon_species.name),
            spriteUrl: getSpriteUrl(nationalId),
          };
        })
        .sort((a, b) => a.regionalNumber - b.regionalNumber);
    },
    staleTime: Infinity, // Regional dexes never change
    gcTime: Infinity,
  });
}
