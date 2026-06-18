"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchType } from "@/lib/pokeapi/client";

/**
 * Fetch the set of national-dex ids (1–1025) that have the given type.
 * Used by the Pokédex type filter. Pass `null` to skip the request.
 *
 * Matches on the base-species id, so a Pokémon is filtered by its base form's
 * typing — regional variants with different typings aren't fetched separately.
 */
export function usePokemonOfType(typeName: string | null) {
  return useQuery({
    queryKey: ["type-pokemon", typeName],
    enabled: typeName !== null,
    queryFn: async (): Promise<Set<number>> => {
      const data = await fetchType(typeName as string);
      const ids = new Set<number>();
      for (const entry of data.pokemon) {
        const id = parseInt(
          entry.pokemon.url.split("/").filter(Boolean).pop() || "0",
          10
        );
        if (id >= 1 && id <= 1025) ids.add(id);
      }
      return ids;
    },
    staleTime: Infinity, // Type membership never changes
    gcTime: Infinity,
  });
}
