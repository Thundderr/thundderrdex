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
import { LearnsetEntry, Move, LearnMethod } from "@/types/moves";
import { PokeAPIPokemon, PokeAPIMove } from "@/types/api";
import { TYPE_COLORS } from "@/data/typeChart";
import { getGenerationFromId, getGenerationFromVersionGroup } from "@/data/generations";
import { getTMNumber } from "@/data/tmLookup";
import { getSpriteUrl, getOfficialArtworkUrl } from "./client";
import { moveFromDex, abilityDescriptionFromDex } from "./battleData";

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

export function transformAbilities(
  abilities: PokeAPIPokemon["abilities"]
): PokemonAbility[] {
  // Descriptions come from the offline @pkmn/dex (no per-ability network
  // fan-out). The ability *list* and hidden flags still come from the parent
  // /pokemon response. Copy before sorting so we never mutate the caller's array.
  return [...abilities]
    .sort((x, y) => x.slot - y.slot)
    .map((a) => ({
      name: a.ability.name,
      displayName: formatAbilityName(a.ability.name),
      description: abilityDescriptionFromDex(a.ability.name),
      isHidden: a.is_hidden,
    }));
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
  const abilities = transformAbilities(data.abilities);
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
// Normalize learn method names from PokeAPI to our LearnMethod type
function normalizeLearnMethod(method: string): LearnMethod {
  if (method === "level-up") return "level-up";
  if (method === "machine") return "machine";
  if (method === "egg") return "egg";
  return "tutor";
}

export function transformLearnset(moves: PokeAPIMove[]): LearnsetEntry[] {
  // Resolve each *unique* move's battle data once from the offline @pkmn/dex —
  // this used to be the app's largest network fan-out (a full movepool is 20+
  // /move requests); now it's zero requests. A move the dex doesn't know
  // resolves to null and is skipped below. The learn method/level/generation
  // structure still comes from PokéAPI's version_group_details.
  const moveByName = new Map<string, Move | null>();
  for (const name of new Set(moves.map((m) => m.move.name))) {
    moveByName.set(name, moveFromDex(name));
  }

  const entries: LearnsetEntry[] = [];
  for (const moveEntry of moves) {
    const moveName = moveEntry.move.name;
    const move = moveByName.get(moveName);
    if (!move) continue; // failed to load — skip

    // Create entries per (generation, learnMethod) combination, de-duping
    // multiple version groups that fall in the same generation.
    const seenCombos = new Set<string>();
    for (const detail of moveEntry.version_group_details) {
      const gen = getGenerationFromVersionGroup(detail.version_group.name);
      if (gen === 0) continue;

      const method = normalizeLearnMethod(detail.move_learn_method.name);
      const comboKey = `${gen}-${method}`;
      if (seenCombos.has(comboKey)) continue;
      seenCombos.add(comboKey);

      const levelLearned = method === "level-up" ? detail.level_learned_at : null;
      const machineNumber = method === "machine" ? getTMNumber(moveName, gen) : null;

      entries.push({
        move,
        learnMethod: method,
        levelLearned,
        generation: gen,
        machineNumber,
      });
    }
  }

  return entries;
}

// Version to generation mapping for encounters
const VERSION_GENERATIONS: Record<string, number> = {
  red: 1,
  blue: 1,
  yellow: 1,
  gold: 2,
  silver: 2,
  crystal: 2,
  ruby: 3,
  sapphire: 3,
  emerald: 3,
  firered: 3,
  leafgreen: 3,
  diamond: 4,
  pearl: 4,
  platinum: 4,
  heartgold: 4,
  soulsilver: 4,
  black: 5,
  white: 5,
  "black-2": 5,
  "white-2": 5,
  x: 6,
  y: 6,
  "omega-ruby": 6,
  "alpha-sapphire": 6,
  sun: 7,
  moon: 7,
  "ultra-sun": 7,
  "ultra-moon": 7,
  "lets-go-pikachu": 7,
  "lets-go-eevee": 7,
  sword: 8,
  shield: 8,
  "brilliant-diamond": 8,
  "shining-pearl": 8,
  "legends-arceus": 8,
  scarlet: 9,
  violet: 9,
};

export function getVersionGeneration(version: string): number {
  return VERSION_GENERATIONS[version] || 0;
}

export function formatLocationName(name: string): string {
  return name
    .replace(/-area$/, "")
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatVersionName(name: string): string {
  const VERSION_DISPLAY: Record<string, string> = {
    red: "Red",
    blue: "Blue",
    yellow: "Yellow",
    gold: "Gold",
    silver: "Silver",
    crystal: "Crystal",
    ruby: "Ruby",
    sapphire: "Sapphire",
    emerald: "Emerald",
    firered: "FireRed",
    leafgreen: "LeafGreen",
    diamond: "Diamond",
    pearl: "Pearl",
    platinum: "Platinum",
    heartgold: "HeartGold",
    soulsilver: "SoulSilver",
    black: "Black",
    white: "White",
    "black-2": "Black 2",
    "white-2": "White 2",
    x: "X",
    y: "Y",
    "omega-ruby": "Omega Ruby",
    "alpha-sapphire": "Alpha Sapphire",
    sun: "Sun",
    moon: "Moon",
    "ultra-sun": "Ultra Sun",
    "ultra-moon": "Ultra Moon",
    "lets-go-pikachu": "Let's Go Pikachu",
    "lets-go-eevee": "Let's Go Eevee",
    sword: "Sword",
    shield: "Shield",
    "brilliant-diamond": "Brilliant Diamond",
    "shining-pearl": "Shining Pearl",
    "legends-arceus": "Legends: Arceus",
    scarlet: "Scarlet",
    violet: "Violet",
  };
  return VERSION_DISPLAY[name] || formatPokemonName(name);
}

export function formatEncounterMethod(method: string): string {
  const METHOD_DISPLAY: Record<string, string> = {
    walk: "Walking",
    "old-rod": "Old Rod",
    "good-rod": "Good Rod",
    "super-rod": "Super Rod",
    surf: "Surfing",
    "rock-smash": "Rock Smash",
    headbutt: "Headbutt",
    "dark-grass": "Dark Grass",
    "grass-spots": "Rustling Grass",
    "cave-spots": "Dust Cloud",
    "bridge-spots": "Bridge Shadow",
    "super-rod-spots": "Fishing Spot",
    "surf-spots": "Rippling Water",
    "yellow-flowers": "Yellow Flowers",
    "purple-flowers": "Purple Flowers",
    "red-flowers": "Red Flowers",
    "rough-terrain": "Rough Terrain",
    gift: "Gift",
    "gift-egg": "Gift Egg",
    "only-one": "Static Encounter",
    "pokeflute": "Poké Flute",
    "squirt-bottle": "Squirt Bottle",
    "wailmer-pail": "Wailmer Pail",
    seaweed: "Seaweed",
    "sos-encounter": "SOS Battle",
    "bubbling-spots": "Bubbling Spots",
    "roaming-grass": "Roaming (Grass)",
    "roaming-water": "Roaming (Water)",
  };
  return METHOD_DISPLAY[method] || formatPokemonName(method);
}
