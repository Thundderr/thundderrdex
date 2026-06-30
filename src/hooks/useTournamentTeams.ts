"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchTournamentTeams } from "@/lib/competitive/limitless";
import type { CompetitiveFormatId } from "@/lib/competitive/formats";

/**
 * Real tournament teams + win rates for a format (latest Limitless event),
 * fetched via our proxy route. Events change at most weekly, so it's
 * effectively static within a session.
 */
export function useTournamentTeams(format: CompetitiveFormatId | null) {
  return useQuery({
    queryKey: ["tournament-teams", format],
    queryFn: () => fetchTournamentTeams(format!),
    enabled: !!format,
    staleTime: 6 * 60 * 60 * 1000, // 6 hours
    gcTime: 7 * 24 * 60 * 60 * 1000,
  });
}
