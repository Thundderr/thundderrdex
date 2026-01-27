"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchEncounters } from "@/lib/pokeapi/client";
import {
  formatLocationName,
  formatEncounterMethod,
  formatVersionName,
  getVersionGeneration,
} from "@/lib/pokeapi/transformers";
import { LocationEncounter, VersionEncounter, EncounterDetail } from "@/types/pokemon";
import { PokeAPILocationEncounter } from "@/types/api";

function transformEncounters(data: PokeAPILocationEncounter[]): LocationEncounter[] {
  return data.map((location) => ({
    locationName: location.location_area.name,
    locationDisplayName: formatLocationName(location.location_area.name),
    versionDetails: location.version_details.map((vd): VersionEncounter => ({
      version: vd.version.name,
      generation: getVersionGeneration(vd.version.name),
      maxChance: vd.max_chance,
      encounters: vd.encounter_details.map((ed): EncounterDetail => ({
        chance: ed.chance,
        method: formatEncounterMethod(ed.method.name),
        minLevel: ed.min_level,
        maxLevel: ed.max_level,
        conditions: ed.condition_values.map((c) => c.name),
      })),
    })),
  }));
}

export function useEncounters(pokemonName: string | null) {
  return useQuery({
    queryKey: ["encounters", pokemonName],
    queryFn: async (): Promise<LocationEncounter[]> => {
      if (!pokemonName) throw new Error("No Pokemon specified");
      const data = await fetchEncounters(pokemonName);
      return transformEncounters(data);
    },
    enabled: !!pokemonName,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
  });
}
