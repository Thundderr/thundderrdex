// Static encounter data for Gen 8/9 (scraped from Serebii.net)
// PokeAPI doesn't have location data for these generations

import gen8Data from "@/data/gen8-encounters.json";
import gen9Data from "@/data/gen9-encounters.json";
import { getSpriteUrl } from "./pokeapi/client";

// Static data types (matching the JSON structure)
interface StaticEncounterPokemon {
  pokemonName: string;
  pokemonDisplayName: string;
  pokemonId: number;
  minLevel: number;
  maxLevel: number;
  chance: number;
  conditions: string[];
}

interface StaticMethodEncounters {
  method: string;
  methodDisplay: string;
  pokemon: StaticEncounterPokemon[];
}

interface StaticLocationData {
  name: string;
  displayName: string;
  region: string;
  versions: string[];
  generation: number;
  methods: StaticMethodEncounters[];
}

// Version display names for Gen 8/9
const VERSION_DISPLAY: Record<string, string> = {
  sword: "Sword",
  shield: "Shield",
  scarlet: "Scarlet",
  violet: "Violet",
};

// Region display names
const REGION_DISPLAY: Record<string, string> = {
  galar: "Galar",
  paldea: "Paldea",
  kitakami: "Kitakami",
  terarium: "Blueberry Academy",
};

// Combine all static data
const allStaticData: StaticLocationData[] = [
  ...(gen8Data as StaticLocationData[]),
  ...(gen9Data as StaticLocationData[]),
];

// Build lookup map for O(1) access
const locationLookup = new Map<string, StaticLocationData>();
for (const location of allStaticData) {
  locationLookup.set(location.name, location);
}

/**
 * Get static encounter data for a location if available
 */
export function getStaticLocationData(locationName: string): StaticLocationData | null {
  return locationLookup.get(locationName) || null;
}

/**
 * Check if a location has static data (Gen 8/9)
 */
export function hasStaticData(locationName: string): boolean {
  return locationLookup.has(locationName);
}

/**
 * Get all static locations for the location list
 */
export function getAllStaticLocations(): Array<{ name: string; displayName: string }> {
  return allStaticData.map((loc) => ({
    name: loc.name,
    displayName: loc.displayName,
  }));
}

/**
 * Find all locations where a specific Pokemon can be encountered (Gen 8/9)
 * Returns data in LocationEncounter format for compatibility with useEncounters
 */
export function findPokemonInStaticData(pokemonName: string): Array<{
  locationName: string;
  locationDisplayName: string;
  versionDetails: Array<{
    version: string;
    generation: number;
    maxChance: number;
    encounters: Array<{
      chance: number;
      method: string;
      minLevel: number;
      maxLevel: number;
      conditions: string[];
    }>;
  }>;
}> {
  const normalizedName = pokemonName.toLowerCase();
  const results: Array<{
    locationName: string;
    locationDisplayName: string;
    versionDetails: Array<{
      version: string;
      generation: number;
      maxChance: number;
      encounters: Array<{
        chance: number;
        method: string;
        minLevel: number;
        maxLevel: number;
        conditions: string[];
      }>;
    }>;
  }> = [];

  for (const location of allStaticData) {
    // Check each method for this Pokemon
    const encounters: Array<{
      chance: number;
      method: string;
      minLevel: number;
      maxLevel: number;
      conditions: string[];
    }> = [];

    for (const method of location.methods) {
      const pokemon = method.pokemon.find(
        (p) => p.pokemonName.toLowerCase() === normalizedName
      );

      if (pokemon) {
        encounters.push({
          chance: pokemon.chance,
          method: method.methodDisplay,
          minLevel: pokemon.minLevel,
          maxLevel: pokemon.maxLevel,
          conditions: pokemon.conditions,
        });
      }
    }

    // If Pokemon found in this location, add to results
    if (encounters.length > 0) {
      const maxChance = Math.max(...encounters.map((e) => e.chance));

      // Create version details for each version this location appears in
      const versionDetails = location.versions.map((version) => ({
        version,
        generation: location.generation,
        maxChance,
        encounters,
      }));

      results.push({
        locationName: location.name,
        locationDisplayName: location.displayName,
        versionDetails,
      });
    }
  }

  return results;
}

/**
 * Transform static data to match LocationAreaData format expected by useLocationArea
 */
export function transformStaticToLocationAreaData(staticData: StaticLocationData): {
  name: string;
  displayName: string;
  locationName: string;
  locationDisplayName: string;
  versionEncounters: Array<{
    versions: Array<{ version: string; versionDisplay: string }>;
    generation: number;
    methods: Array<{
      method: string;
      methodDisplay: string;
      priority: number;
      pokemon: Array<{
        pokemonName: string;
        pokemonDisplayName: string;
        pokemonId: number;
        spriteUrl: string;
        minLevel: number;
        maxLevel: number;
        chance: number;
        conditions: string[];
      }>;
    }>;
  }>;
} {
  // Method priority mapping
  const METHOD_PRIORITY: Record<string, number> = {
    walking: 0,
    overworld: 1,
    surf: 10,
    "old-rod": 20,
    "good-rod": 21,
    "super-rod": 22,
  };

  return {
    name: staticData.name,
    displayName: staticData.displayName,
    locationName: staticData.region,
    locationDisplayName: REGION_DISPLAY[staticData.region] || staticData.region,
    versionEncounters: [
      {
        versions: staticData.versions.map((v) => ({
          version: v,
          versionDisplay: VERSION_DISPLAY[v] || v,
        })),
        generation: staticData.generation,
        methods: staticData.methods.map((method) => {
          // Normalize spawn rates to add up to 100%
          const totalChance = method.pokemon.reduce((sum, p) => sum + p.chance, 0);

          const normalizedPokemon = method.pokemon.map((poke) => ({
            ...poke,
            spriteUrl: getSpriteUrl(poke.pokemonId),
            // Normalize chance if total > 0, otherwise keep original
            chance: totalChance > 0 ? Math.round((poke.chance / totalChance) * 100) : poke.chance,
          }));

          // Sort by chance (descending), then by level
          normalizedPokemon.sort((a, b) => {
            if (b.chance !== a.chance) return b.chance - a.chance;
            return a.minLevel - b.minLevel;
          });

          return {
            method: method.method,
            methodDisplay: method.methodDisplay,
            priority: METHOD_PRIORITY[method.method] ?? 50,
            pokemon: normalizedPokemon,
          };
        }),
      },
    ],
  };
}
