"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPokemonList, getSpriteUrl, getShowdownSpriteUrl } from "@/lib/pokeapi/client";
import { transformPokemonListItem } from "@/lib/pokeapi/transformers";
import { PokemonListItem } from "@/types/pokemon";
import { MEGA_POKEMON, REGIONAL_VARIANTS } from "@/lib/utils/generationConfig";
import { getChampionsMegas } from "@/lib/pokemon/championsMega";

/**
 * Convert Mega Pokemon data to PokemonListItem format
 * Uses the base species ID for display but formId for sprites
 */
function getMegaPokemonListItems(): PokemonListItem[] {
  return MEGA_POKEMON.map((mega) => ({
    id: mega.baseSpeciesId, // Use base species ID (e.g., Mega Charizard shows as #6)
    name: mega.name,
    displayName: mega.displayName,
    spriteUrl: getSpriteUrl(mega.formId), // Use formId for correct Mega sprite
  }));
}

/**
 * Convert Regional Variants data to PokemonListItem format
 * Uses the base species ID for display but formId for sprites
 */
function getRegionalVariantListItems(): PokemonListItem[] {
  return REGIONAL_VARIANTS.map((variant) => ({
    id: variant.baseSpeciesId, // Use base species ID (e.g., Alolan Raichu shows as #26)
    name: variant.name,
    displayName: variant.displayName,
    spriteUrl: getSpriteUrl(variant.formId), // Use formId for correct regional sprite
  }));
}

/**
 * Convert Champions Mega data to PokemonListItem format
 * Uses Showdown sprite URLs for animated gifs
 */
function getChampionsMegaListItems(): PokemonListItem[] {
  return getChampionsMegas().map((m) => ({
    id: m.baseNum,
    name: m.name,
    displayName: m.displayName,
    spriteUrl: getShowdownSpriteUrl(m.name),
    isChampionsMega: true,
  }));
}

export function usePokemonList() {
  return useQuery({
    queryKey: ["pokemon-list"],
    queryFn: async (): Promise<PokemonListItem[]> => {
      const data = await fetchPokemonList(1025); // All Pokemon up to Gen 9
      const basePokemon = data.results.map((p) => transformPokemonListItem(p.name, p.url));

      // Add Mega Pokemon to the list
      const megaPokemon = getMegaPokemonListItems();

      // Add Regional Variants to the list
      const regionalVariants = getRegionalVariantListItems();

      // Combine and deduplicate by name (in case of any overlap)
      const combined = [...basePokemon, ...megaPokemon, ...regionalVariants, ...getChampionsMegaListItems()];
      const seen = new Set<string>();
      const deduplicated = combined.filter((p) => {
        if (seen.has(p.name)) return false;
        seen.add(p.name);
        return true;
      });

      return deduplicated;
    },
    staleTime: Infinity, // Pokemon list never goes stale
    gcTime: Infinity,
  });
}
