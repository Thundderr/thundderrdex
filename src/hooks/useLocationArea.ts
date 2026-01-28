"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchLocationArea, getSpriteUrl } from "@/lib/pokeapi/client";
import { formatEncounterMethod, getVersionGeneration, formatLocationName } from "@/lib/pokeapi/transformers";
import { PokeAPILocationArea } from "@/types/api";

// Encounter method grouping and priority
const ENCOUNTER_METHOD_GROUPS: Record<string, { display: string; priority: number }> = {
  walk: { display: "Walking", priority: 0 },
  "dark-grass": { display: "Dark Grass", priority: 1 },
  "grass-spots": { display: "Rustling Grass", priority: 2 },
  surf: { display: "Surfing", priority: 10 },
  "surf-spots": { display: "Rippling Water", priority: 11 },
  "old-rod": { display: "Old Rod", priority: 20 },
  "good-rod": { display: "Good Rod", priority: 21 },
  "super-rod": { display: "Super Rod", priority: 22 },
  "super-rod-spots": { display: "Fishing Spot", priority: 23 },
  "rock-smash": { display: "Rock Smash", priority: 30 },
  headbutt: { display: "Headbutt", priority: 31 },
  "headbutt-low": { display: "Headbutt (Low)", priority: 32 },
  "headbutt-normal": { display: "Headbutt (Normal)", priority: 33 },
  "headbutt-high": { display: "Headbutt (High)", priority: 34 },
  gift: { display: "Gift", priority: 40 },
  "gift-egg": { display: "Gift Egg", priority: 41 },
  "only-one": { display: "Static Encounter", priority: 50 },
  "cave-spots": { display: "Dust Cloud", priority: 60 },
  "bridge-spots": { display: "Bridge Shadow", priority: 61 },
  seaweed: { display: "Seaweed", priority: 70 },
  "yellow-flowers": { display: "Yellow Flowers", priority: 80 },
  "purple-flowers": { display: "Purple Flowers", priority: 81 },
  "red-flowers": { display: "Red Flowers", priority: 82 },
  "rough-terrain": { display: "Rough Terrain", priority: 83 },
  "sos-encounter": { display: "SOS Battle", priority: 90 },
  "bubbling-spots": { display: "Bubbling Spots", priority: 91 },
};

export interface LocationPokemonEncounter {
  pokemonName: string;
  pokemonDisplayName: string;
  pokemonId: number;
  spriteUrl: string;
  minLevel: number;
  maxLevel: number;
  chance: number;
  conditions: string[];
}

export interface MethodEncounters {
  method: string;
  methodDisplay: string;
  priority: number;
  pokemon: LocationPokemonEncounter[];
}

export interface VersionInfo {
  version: string;
  versionDisplay: string;
}

export interface VersionEncounters {
  versions: VersionInfo[];
  generation: number;
  methods: MethodEncounters[];
}

export interface LocationAreaData {
  name: string;
  displayName: string;
  locationName: string;
  locationDisplayName: string;
  versionEncounters: VersionEncounters[];
}

// Format Pokemon name for display
function formatPokemonName(name: string): string {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Version display names
const VERSION_DISPLAY: Record<string, string> = {
  red: "Red", blue: "Blue", yellow: "Yellow",
  gold: "Gold", silver: "Silver", crystal: "Crystal",
  ruby: "Ruby", sapphire: "Sapphire", emerald: "Emerald",
  firered: "FireRed", leafgreen: "LeafGreen",
  diamond: "Diamond", pearl: "Pearl", platinum: "Platinum",
  heartgold: "HeartGold", soulsilver: "SoulSilver",
  black: "Black", white: "White", "black-2": "Black 2", "white-2": "White 2",
  x: "X", y: "Y", "omega-ruby": "Omega Ruby", "alpha-sapphire": "Alpha Sapphire",
  sun: "Sun", moon: "Moon", "ultra-sun": "Ultra Sun", "ultra-moon": "Ultra Moon",
  "lets-go-pikachu": "Let's Go Pikachu", "lets-go-eevee": "Let's Go Eevee",
  sword: "Sword", shield: "Shield",
  "brilliant-diamond": "Brilliant Diamond", "shining-pearl": "Shining Pearl",
  "legends-arceus": "Legends: Arceus",
  scarlet: "Scarlet", violet: "Violet",
};

function transformLocationArea(data: PokeAPILocationArea): LocationAreaData {
  // Build version -> method -> pokemon mapping
  const versionMap = new Map<string, Map<string, LocationPokemonEncounter[]>>();

  for (const pokemonEncounter of data.pokemon_encounters) {
    const pokemonName = pokemonEncounter.pokemon.name;
    const pokemonId = parseInt(pokemonEncounter.pokemon.url.split("/").filter(Boolean).pop() || "0", 10);

    for (const versionDetail of pokemonEncounter.version_details) {
      const version = versionDetail.version.name;

      if (!versionMap.has(version)) {
        versionMap.set(version, new Map());
      }
      const methodMap = versionMap.get(version)!;

      for (const encounter of versionDetail.encounter_details) {
        const method = encounter.method.name;

        if (!methodMap.has(method)) {
          methodMap.set(method, []);
        }

        // Check if this Pokemon is already in this method's list
        const existingPokemon = methodMap.get(method)!.find(p => p.pokemonName === pokemonName);

        if (existingPokemon) {
          // Update level range if needed
          existingPokemon.minLevel = Math.min(existingPokemon.minLevel, encounter.min_level);
          existingPokemon.maxLevel = Math.max(existingPokemon.maxLevel, encounter.max_level);
          existingPokemon.chance = Math.max(existingPokemon.chance, encounter.chance);
        } else {
          methodMap.get(method)!.push({
            pokemonName,
            pokemonDisplayName: formatPokemonName(pokemonName),
            pokemonId,
            spriteUrl: getSpriteUrl(pokemonId),
            minLevel: encounter.min_level,
            maxLevel: encounter.max_level,
            chance: encounter.chance,
            conditions: encounter.condition_values.map(c => c.name),
          });
        }
      }
    }
  }

  // Build methods array for each version and create fingerprints for grouping
  const versionData = new Map<string, { methods: MethodEncounters[]; fingerprint: string; generation: number }>();

  for (const [version, methodMap] of versionMap) {
    const methods: MethodEncounters[] = [];

    for (const [method, pokemon] of methodMap) {
      const methodInfo = ENCOUNTER_METHOD_GROUPS[method] || { display: formatEncounterMethod(method), priority: 100 };

      // Normalize chances so they add up to 100%
      const totalChance = pokemon.reduce((sum, p) => sum + p.chance, 0);
      if (totalChance > 0) {
        for (const p of pokemon) {
          p.chance = Math.round((p.chance / totalChance) * 100);
        }
      }

      // Sort Pokemon by encounter rate (descending), then by level
      pokemon.sort((a, b) => {
        if (b.chance !== a.chance) return b.chance - a.chance;
        return a.minLevel - b.minLevel;
      });

      methods.push({
        method,
        methodDisplay: methodInfo.display,
        priority: methodInfo.priority,
        pokemon,
      });
    }

    // Sort methods by priority
    methods.sort((a, b) => a.priority - b.priority);

    // Create fingerprint from encounter data for grouping identical versions
    const fingerprint = methods.map(m =>
      `${m.method}:${m.pokemon.map(p => `${p.pokemonName}|${p.minLevel}|${p.maxLevel}|${p.chance}`).join(",")}`
    ).join(";");

    versionData.set(version, {
      methods,
      fingerprint,
      generation: getVersionGeneration(version),
    });
  }

  // Group versions with identical fingerprints (within same generation)
  const fingerprintGroups = new Map<string, string[]>();
  for (const [version, data] of versionData) {
    const groupKey = `${data.generation}|${data.fingerprint}`;
    if (!fingerprintGroups.has(groupKey)) {
      fingerprintGroups.set(groupKey, []);
    }
    fingerprintGroups.get(groupKey)!.push(version);
  }

  // Build final version encounters array
  const versionEncounters: VersionEncounters[] = [];

  for (const [, versions] of fingerprintGroups) {
    // Sort versions alphabetically for consistent display
    versions.sort();

    const firstVersion = versions[0];
    const data = versionData.get(firstVersion)!;

    versionEncounters.push({
      versions: versions.map(v => ({
        version: v,
        versionDisplay: VERSION_DISPLAY[v] || v,
      })),
      generation: data.generation,
      methods: data.methods,
    });
  }

  // Sort by generation, then by first version name
  versionEncounters.sort((a, b) => {
    if (a.generation !== b.generation) return a.generation - b.generation;
    return a.versions[0].version.localeCompare(b.versions[0].version);
  });

  return {
    name: data.name,
    displayName: formatLocationName(data.name),
    locationName: data.location.name,
    locationDisplayName: formatLocationName(data.location.name),
    versionEncounters,
  };
}

export function useLocationArea(locationAreaName: string | null) {
  return useQuery({
    queryKey: ["location-area", locationAreaName],
    queryFn: async (): Promise<LocationAreaData> => {
      if (!locationAreaName) throw new Error("No location area specified");
      const data = await fetchLocationArea(locationAreaName);
      return transformLocationArea(data);
    },
    enabled: !!locationAreaName,
    staleTime: 10 * 60 * 1000, // 10 minutes - location data doesn't change
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 1,
  });
}
