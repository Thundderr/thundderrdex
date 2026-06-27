"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchUsageDataset } from "@/lib/competitive/smogonStats";
import type { CompetitiveFormatId } from "@/lib/competitive/formats";
import type { StatsCutoff } from "@/lib/competitive/types";

/**
 * Competitive usage data for a format (usage %, spreads, moves, items, Tera,
 * teammates), fetched via our proxy route and cached like the rest of the app.
 * Monthly-published data, so it's effectively static within a session.
 */
export function useUsageStats(
  format: CompetitiveFormatId | null,
  opts: { cutoff?: StatsCutoff; month?: string } = {}
) {
  return useQuery({
    queryKey: ["usage-stats", format, opts.cutoff ?? 1760, opts.month ?? "latest"],
    queryFn: () => fetchUsageDataset(format!, opts),
    enabled: !!format,
    staleTime: 24 * 60 * 60 * 1000, // 1 day — stats refresh monthly
    gcTime: 7 * 24 * 60 * 60 * 1000,
  });
}
