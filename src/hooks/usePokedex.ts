"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPokedex, getSpriteUrl } from "@/lib/pokeapi/client";
import { formatPokemonName } from "@/lib/pokeapi/transformers";
import { resolveDexForm } from "@/data/dexForms";

export interface PokedexEntry {
  regionalNumber: number; // Per-game regional dex number (entry_number)
  nationalId: number; // National dex id (base species)
  name: string; // Resolved form slug, e.g. "slowpoke-galar" (base species slug if no form)
  displayName: string;
  spriteUrl: string;
  // Catch-tracking key: bare national id for base forms, "<id>-<region>" for a
  // regional variant — so the same species tracks separately across dexes that
  // show it as different forms (e.g. Paldea "79" vs Blueberry "79-galar").
  catchKey: string;
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
          // Resolve whether this dex shows a regional variant for the species;
          // when it does, override the slug/name/sprite with the variant's.
          const form = resolveDexForm(dexId as number, nationalId);
          return {
            regionalNumber: entry.entry_number,
            nationalId,
            name: form?.variantName ?? entry.pokemon_species.name,
            displayName: form?.displayName ?? formatPokemonName(entry.pokemon_species.name),
            spriteUrl: getSpriteUrl(form?.formId ?? nationalId),
            catchKey: form ? `${nationalId}-${form.region}` : `${nationalId}`,
          };
        })
        .sort((a, b) => a.regionalNumber - b.regionalNumber);
    },
    staleTime: Infinity, // Regional dexes never change
    gcTime: Infinity,
  });
}
