import { isMegaPokemon, getRegionalVariantInfo } from "@/lib/utils/generationConfig";
import { isChampionsMega } from "@/lib/pokemon/championsMega";

/**
 * The generation range a Pokémon (incl. Megas, regional variants, and Pokémon
 * Champions Megas) is available in. Single source of truth — every search /
 * dex / calc surface must use this so availability gating is consistent.
 */
export function getPokemonGenerationRange(
  pokemonName: string,
  pokedexId: number
): { minGen: number; maxGen: number | null } {
  if (isChampionsMega(pokemonName)) return { minGen: 9, maxGen: null };
  if (isMegaPokemon(pokemonName)) return { minGen: 6, maxGen: 7 };
  const regionalInfo = getRegionalVariantInfo(pokemonName);
  if (regionalInfo) return { minGen: regionalInfo.minGeneration, maxGen: null };
  if (pokedexId <= 151) return { minGen: 1, maxGen: null };
  if (pokedexId <= 251) return { minGen: 2, maxGen: null };
  if (pokedexId <= 386) return { minGen: 3, maxGen: null };
  if (pokedexId <= 493) return { minGen: 4, maxGen: null };
  if (pokedexId <= 649) return { minGen: 5, maxGen: null };
  if (pokedexId <= 721) return { minGen: 6, maxGen: null };
  if (pokedexId <= 809) return { minGen: 7, maxGen: null };
  if (pokedexId <= 905) return { minGen: 8, maxGen: null };
  return { minGen: 9, maxGen: null };
}
