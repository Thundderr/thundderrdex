import {
  Pokemon,
  PokemonListItem,
  PokemonStats,
  PokemonType,
  PokemonTypeName,
  PokemonAbility,
  PastTypeEntry,
  PastAbilityEntry,
} from "@/types/pokemon";
import { LearnsetEntry, Move, LearnMethod, DamageClass } from "@/types/moves";
import { PokeAPIPokemon, PokeAPIAbility, PokeAPIMoveDetail, PokeAPIMove } from "@/types/api";
import { TYPE_COLORS } from "@/data/typeChart";
import { getGenerationFromId, getGenerationFromVersionGroup } from "@/data/generations";
import { getSpriteUrl, getOfficialArtworkUrl, fetchAbility, fetchMove } from "./client";

// Pokemon name formatting with special cases
const SPECIAL_NAMES: Record<string, string> = {
  "mr-mime": "Mr. Mime",
  "mime-jr": "Mime Jr.",
  "mr-rime": "Mr. Rime",
  "nidoran-f": "Nidoran\u2640",
  "nidoran-m": "Nidoran\u2642",
  "farfetchd": "Farfetch'd",
  "sirfetchd": "Sirfetch'd",
  "type-null": "Type: Null",
  "ho-oh": "Ho-Oh",
  "porygon-z": "Porygon-Z",
  "jangmo-o": "Jangmo-o",
  "hakamo-o": "Hakamo-o",
  "kommo-o": "Kommo-o",
  "tapu-koko": "Tapu Koko",
  "tapu-lele": "Tapu Lele",
  "tapu-bulu": "Tapu Bulu",
  "tapu-fini": "Tapu Fini",
  "wo-chien": "Wo-Chien",
  "chien-pao": "Chien-Pao",
  "ting-lu": "Ting-Lu",
  "chi-yu": "Chi-Yu",
};

export function formatPokemonName(name: string): string {
  if (SPECIAL_NAMES[name]) {
    return SPECIAL_NAMES[name];
  }

  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatMoveName(name: string): string {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatAbilityName(name: string): string {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function transformPokemonListItem(
  name: string,
  url: string
): PokemonListItem {
  const id = parseInt(url.split("/").filter(Boolean).pop() || "0", 10);
  return {
    id,
    name,
    displayName: formatPokemonName(name),
    spriteUrl: getSpriteUrl(id),
  };
}

export function transformStats(
  stats: PokeAPIPokemon["stats"]
): PokemonStats {
  const statMap: Record<string, number> = {};
  stats.forEach((s) => {
    statMap[s.stat.name] = s.base_stat;
  });

  return {
    hp: statMap["hp"] || 0,
    attack: statMap["attack"] || 0,
    defense: statMap["defense"] || 0,
    specialAttack: statMap["special-attack"] || 0,
    specialDefense: statMap["special-defense"] || 0,
    speed: statMap["speed"] || 0,
    total: stats.reduce((sum, s) => sum + s.base_stat, 0),
  };
}

export function transformTypes(
  types: PokeAPIPokemon["types"]
): PokemonType[] {
  return types
    .sort((a, b) => a.slot - b.slot)
    .map((t) => ({
      name: t.type.name as PokemonTypeName,
      color: TYPE_COLORS[t.type.name as PokemonTypeName] || "#888888",
    }));
}

// Parse generation name like "generation-v" to number 5
function parseGenerationName(genName: string): number {
  const romanNumerals: Record<string, number> = {
    i: 1, ii: 2, iii: 3, iv: 4, v: 5,
    vi: 6, vii: 7, viii: 8, ix: 9,
  };
  const match = genName.match(/generation-(\w+)/);
  if (match && romanNumerals[match[1]]) {
    return romanNumerals[match[1]];
  }
  return 0;
}

// Transform past_types from API response
export function transformPastTypes(
  pastTypes: PokeAPIPokemon["past_types"]
): PastTypeEntry[] {
  if (!pastTypes || pastTypes.length === 0) return [];

  return pastTypes.map((pt) => ({
    generation: parseGenerationName(pt.generation.name),
    types: pt.types
      .sort((a, b) => a.slot - b.slot)
      .map((t) => ({
        name: t.type.name as PokemonTypeName,
        color: TYPE_COLORS[t.type.name as PokemonTypeName] || "#888888",
      })),
  }));
}

// Transform past_abilities from API response
export function transformPastAbilities(
  pastAbilities: PokeAPIPokemon["past_abilities"]
): PastAbilityEntry[] {
  if (!pastAbilities || pastAbilities.length === 0) return [];

  return pastAbilities.map((pa) => ({
    generation: parseGenerationName(pa.generation.name),
    abilities: pa.abilities
      .sort((a, b) => a.slot - b.slot)
      .map((a) => {
        if (!a.ability) return null;
        return {
          name: a.ability.name,
          displayName: formatAbilityName(a.ability.name),
          description: "", // Will be populated if needed
          isHidden: a.is_hidden,
        };
      }),
  }));
}

export async function transformAbilities(
  abilities: PokeAPIPokemon["abilities"]
): Promise<PokemonAbility[]> {
  const transformed: PokemonAbility[] = [];

  for (const a of abilities.sort((x, y) => x.slot - y.slot)) {
    try {
      const abilityData = await fetchAbility(a.ability.name);
      const englishEntry = abilityData.effect_entries.find(
        (e) => e.language.name === "en"
      );
      const englishFlavor = abilityData.flavor_text_entries.find(
        (e) => e.language.name === "en"
      );

      transformed.push({
        name: a.ability.name,
        displayName: formatAbilityName(a.ability.name),
        description:
          englishEntry?.short_effect ||
          englishFlavor?.flavor_text ||
          "No description available.",
        isHidden: a.is_hidden,
      });
    } catch {
      transformed.push({
        name: a.ability.name,
        displayName: formatAbilityName(a.ability.name),
        description: "Description unavailable.",
        isHidden: a.is_hidden,
      });
    }
  }

  return transformed;
}

export function transformBasicPokemon(data: PokeAPIPokemon): Pokemon {
  return {
    id: data.id,
    name: data.name,
    displayName: formatPokemonName(data.name),
    types: transformTypes(data.types),
    stats: transformStats(data.stats),
    abilities: [], // Will be populated separately
    sprites: {
      front_default: data.sprites.front_default,
      front_shiny: data.sprites.front_shiny,
      official_artwork: getOfficialArtworkUrl(data.id),
    },
    generation: getGenerationFromId(data.id),
    pastTypes: transformPastTypes(data.past_types),
    pastAbilities: transformPastAbilities(data.past_abilities),
  };
}

export async function transformFullPokemon(
  data: PokeAPIPokemon
): Promise<Pokemon> {
  const basic = transformBasicPokemon(data);
  const abilities = await transformAbilities(data.abilities);
  return { ...basic, abilities };
}

// Helper function to get types for a specific generation
export function getTypesForGeneration(
  pokemon: Pokemon,
  generation: number
): PokemonType[] {
  // No past types means current types apply to all generations
  if (pokemon.pastTypes.length === 0) {
    return pokemon.types;
  }

  // Find the past type entry for the highest generation <= selected gen
  // past_types contains types BEFORE a certain gen, so we need to check carefully
  // E.g., Clefairy has past_types for gen-v meaning it was Normal in gen 1-5
  const relevantPastType = pokemon.pastTypes.find(
    (pt) => generation <= pt.generation
  );

  if (relevantPastType) {
    return relevantPastType.types;
  }

  // If selected generation is higher than any past type entry, use current types
  return pokemon.types;
}

// Helper function to check if abilities existed in a generation
export function abilitiesExistInGeneration(generation: number): boolean {
  // Abilities were introduced in Generation 3
  return generation >= 3;
}

// Helper function to get abilities for a specific generation
export function getAbilitiesForGeneration(
  pokemon: Pokemon,
  generation: number
): PokemonAbility[] {
  // Abilities didn't exist before Gen 3
  if (generation < 3) {
    return [];
  }

  // Check if there's a past_abilities entry for this generation
  const relevantPastAbility = pokemon.pastAbilities.find(
    (pa) => generation <= pa.generation
  );

  if (relevantPastAbility) {
    // Filter out null abilities and return
    return relevantPastAbility.abilities.filter(
      (a): a is PokemonAbility => a !== null
    );
  }

  // Return current abilities
  return pokemon.abilities;
}

// Move transformers
export async function transformMove(
  data: PokeAPIMoveDetail
): Promise<Move> {
  const englishEffect = data.effect_entries.find(
    (e) => e.language.name === "en"
  );

  return {
    id: data.id,
    name: data.name,
    displayName: formatMoveName(data.name),
    type: data.type.name as PokemonTypeName,
    damageClass: data.damage_class.name as DamageClass,
    power: data.power,
    accuracy: data.accuracy,
    pp: data.pp,
    description: englishEffect?.short_effect || "No description available.",
    priority: data.priority,
  };
}

function getPreferredLearnMethod(
  details: PokeAPIMove["version_group_details"]
): LearnMethod {
  const methods = details.map((d) => d.move_learn_method.name);
  if (methods.includes("level-up")) return "level-up";
  if (methods.includes("machine")) return "machine";
  if (methods.includes("egg")) return "egg";
  return "tutor";
}

function getEarliestLevel(
  details: PokeAPIMove["version_group_details"]
): number | null {
  const levels = details
    .filter((d) => d.move_learn_method.name === "level-up")
    .map((d) => d.level_learned_at);

  return levels.length > 0 ? Math.min(...levels) : null;
}

export async function transformLearnset(
  moves: PokeAPIMove[]
): Promise<LearnsetEntry[]> {
  const entries: LearnsetEntry[] = [];
  const moveCache = new Map<string, Move>();

  for (const moveEntry of moves) {
    const moveName = moveEntry.move.name;

    try {
      let move = moveCache.get(moveName);
      if (!move) {
        const moveData = await fetchMove(moveName);
        move = await transformMove(moveData);
        moveCache.set(moveName, move);
      }

      const generations = [
        ...new Set(
          moveEntry.version_group_details.map((d) =>
            getGenerationFromVersionGroup(d.version_group.name)
          )
        ),
      ].filter((g) => g > 0);

      entries.push({
        move,
        learnMethod: getPreferredLearnMethod(moveEntry.version_group_details),
        levelLearned: getEarliestLevel(moveEntry.version_group_details),
        generations,
      });
    } catch {
      // Skip moves that fail to load
      console.warn(`Failed to load move: ${moveName}`);
    }
  }

  return entries;
}
