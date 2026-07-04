"use client";

import { useQuery } from "@tanstack/react-query";
import { pikalyticsSlug, type PikalyticsEntry } from "@/lib/competitive/pikalytics";

/**
 * Official-ranked (Pikalytics) usage for one scouted Pokémon, fetched lazily via
 * our proxy. `megaForm` requests the mega's own page instead of the base species.
 */
export function usePikalyticsMon(appName: string | null, opts: { megaForm?: boolean } = {}) {
  const slug = appName ? pikalyticsSlug(appName, opts) : null;
  return useQuery({
    queryKey: ["pikalytics", slug],
    queryFn: async (): Promise<PikalyticsEntry> => {
      const res = await fetch(`/api/pikalytics/${encodeURIComponent(slug!)}`);
      if (!res.ok) throw new Error(`Pikalytics fetch failed (${res.status})`);
      return res.json();
    },
    enabled: !!slug,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
  });
}
