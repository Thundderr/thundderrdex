"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchLocationAreaList } from "@/lib/pokeapi/client";
import { formatLocationName } from "@/lib/pokeapi/transformers";

export interface LocationAreaListItem {
  name: string;
  displayName: string;
}

export function useLocationAreaList() {
  return useQuery({
    queryKey: ["location-area-list"],
    queryFn: async (): Promise<LocationAreaListItem[]> => {
      // Fetch all location areas (there are ~1089)
      const data = await fetchLocationAreaList(1200, 0);

      return data.results.map((item) => ({
        name: item.name,
        displayName: formatLocationName(item.name),
      }));
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - this list rarely changes
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}
