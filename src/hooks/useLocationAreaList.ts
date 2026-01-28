"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchLocationAreaList } from "@/lib/pokeapi/client";
import { formatLocationName } from "@/lib/pokeapi/transformers";
import { getAllStaticLocations } from "@/lib/staticEncounters";

export interface LocationAreaListItem {
  name: string;
  displayName: string;
}

export function useLocationAreaList() {
  return useQuery({
    queryKey: ["location-area-list"],
    queryFn: async (): Promise<LocationAreaListItem[]> => {
      // Fetch all location areas from PokeAPI (Gen 1-7, ~1089 locations)
      const data = await fetchLocationAreaList(1200, 0);

      const apiLocations = data.results.map((item) => ({
        name: item.name,
        displayName: formatLocationName(item.name),
      }));

      // Add static Gen 8/9 locations (from Serebii scraping)
      const staticLocations = getAllStaticLocations();

      // Combine and sort alphabetically by display name
      const allLocations = [...apiLocations, ...staticLocations];
      allLocations.sort((a, b) => a.displayName.localeCompare(b.displayName));

      return allLocations;
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - this list rarely changes
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}
