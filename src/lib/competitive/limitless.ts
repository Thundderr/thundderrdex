import type { CompetitiveFormatId } from "./formats";
import type { TournamentTeamsDataset } from "./types";

/**
 * Client access to real tournament teams + win rates. Hits our own proxy route
 * (/api/tournaments/<format>), which fetches the latest Limitless event for the
 * format and its standings server-side, so the browser only receives the small
 * normalized dataset (and we avoid Limitless CORS).
 */
export async function fetchTournamentTeams(
  format: CompetitiveFormatId
): Promise<TournamentTeamsDataset> {
  const res = await fetch(`/api/tournaments/${format}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Tournament fetch failed (${res.status})`);
  }
  return (await res.json()) as TournamentTeamsDataset;
}
