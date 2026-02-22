"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchLocationArea, getSpriteUrl } from "@/lib/pokeapi/client";
import { formatEncounterMethod, getVersionGeneration, formatLocationName } from "@/lib/pokeapi/transformers";
import { PokeAPILocationArea } from "@/types/api";
import { getStaticLocationData, transformStaticToLocationAreaData } from "@/lib/staticEncounters";

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

// Format condition values for display (e.g., "season-winter" -> "Winter")
function formatConditionName(condition: string): string {
  const CONDITION_DISPLAY: Record<string, string> = {
    "season-spring": "Spring",
    "season-summer": "Summer",
    "season-autumn": "Autumn",
    "season-winter": "Winter",
    "time-morning": "Morning",
    "time-day": "Day",
    "time-night": "Night",
    "swarm-yes": "Swarm",
    "swarm-no": "No Swarm",
    "radar-on": "Poké Radar",
    "radar-off": "No Poké Radar",
    "radio-off": "No Radio",
    "radio-hoenn": "Hoenn Sound",
    "radio-sinnoh": "Sinnoh Sound",
    "slot2-none": "No Dual-Slot",
    "slot2-ruby": "Ruby in Slot 2",
    "slot2-sapphire": "Sapphire in Slot 2",
    "slot2-emerald": "Emerald in Slot 2",
    "slot2-firered": "FireRed in Slot 2",
    "slot2-leafgreen": "LeafGreen in Slot 2",
  };
  if (CONDITION_DISPLAY[condition]) return CONDITION_DISPLAY[condition];
  // Fallback: remove category prefix and title-case
  const parts = condition.split("-");
  if (parts.length > 1) parts.shift();
  return parts.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function transformLocationArea(data: PokeAPILocationArea): LocationAreaData {
  // Build version -> method -> mergeKey -> pokemon mapping
  // mergeKey includes conditions so seasonal/time-based entries stay separate
  const versionMap = new Map<string, Map<string, Map<string, LocationPokemonEncounter>>>();

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
          methodMap.set(method, new Map());
        }
        const encounterMap = methodMap.get(method)!;

        // Build merge key from pokemon name + sorted conditions
        const rawConditions = encounter.condition_values.map(c => c.name).sort();
        const mergeKey = `${pokemonName}::${rawConditions.join(",")}`;

        const existing = encounterMap.get(mergeKey);
        if (existing) {
          // Same pokemon + same conditions: sum chances, merge level range
          existing.minLevel = Math.min(existing.minLevel, encounter.min_level);
          existing.maxLevel = Math.max(existing.maxLevel, encounter.max_level);
          existing.chance += encounter.chance;
        } else {
          encounterMap.set(mergeKey, {
            pokemonName,
            pokemonDisplayName: formatPokemonName(pokemonName),
            pokemonId,
            spriteUrl: getSpriteUrl(pokemonId),
            minLevel: encounter.min_level,
            maxLevel: encounter.max_level,
            chance: encounter.chance,
            conditions: rawConditions.map(formatConditionName),
          });
        }
      }
    }
  }

  // Build methods array for each version and create fingerprints for grouping
  const versionData = new Map<string, { methods: MethodEncounters[]; fingerprint: string; generation: number }>();

  for (const [version, methodMap] of versionMap) {
    const methods: MethodEncounters[] = [];

    for (const [method, encounterMap] of methodMap) {
      const methodInfo = ENCOUNTER_METHOD_GROUPS[method] || { display: formatEncounterMethod(method), priority: 100 };
      const pokemon = Array.from(encounterMap.values());

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
    // Include conditions in fingerprint so versions with different seasonal data aren't grouped
    const fingerprint = methods.map(m =>
      `${m.method}:${m.pokemon.map(p => `${p.pokemonName}|${p.minLevel}|${p.maxLevel}|${p.chance}|${p.conditions.join("+")}`).join(",")}`
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

      // Check for static Gen 8/9 data first (PokeAPI doesn't have this)
      const staticData = getStaticLocationData(locationAreaName);
      if (staticData) {
        return transformStaticToLocationAreaData(staticData) as LocationAreaData;
      }

      // Fall back to PokeAPI for Gen 1-7
      const data = await fetchLocationArea(locationAreaName);
      return transformLocationArea(data);
    },
    enabled: !!locationAreaName,
    staleTime: 10 * 60 * 1000, // 10 minutes - location data doesn't change
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days - location data is static
    retry: 1,
  });
}
