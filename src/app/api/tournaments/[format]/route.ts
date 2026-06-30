import { COMPETITIVE_FORMATS, type CompetitiveFormatId } from "@/lib/competitive/formats";
import {
  limitlessTournamentsUrl,
  limitlessStandingsUrl,
  pickLatestTournament,
  buildTournamentTeams,
  DEFAULT_TEAM_CAP,
} from "@/lib/competitive/sources";
import type { LimitlessTournament, LimitlessStanding } from "@/lib/competitive/types";

// Tournaments are added through the week and decklists are immutable once an
// event finishes, so a few hours of staleness is fine.
export const revalidate = 21600; // 6h

const FETCH_LIMIT = 50; // recent events to scan for one matching the format

function isFormatId(id: string): id is CompetitiveFormatId {
  return id in COMPETITIVE_FORMATS;
}

/**
 * GET /api/tournaments/<format>
 *
 * Finds the most recent Limitless event matching the format's tags, fetches its
 * standings, and returns the top teams (with real win rates) as a small
 * normalized `TournamentTeamsDataset`. See docs/data-pathways.md §3.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ format: string }> }
) {
  const { format } = await params;
  if (!isFormatId(format)) {
    return Response.json({ error: `Unknown format "${format}"` }, { status: 400 });
  }
  const tags = COMPETITIVE_FORMATS[format].limitlessFormatTags;

  try {
    const tRes = await fetch(limitlessTournamentsUrl({ limit: FETCH_LIMIT }), {
      next: { revalidate },
    });
    if (!tRes.ok) {
      return Response.json(
        { error: `Limitless returned ${tRes.status} for tournaments` },
        { status: 502 }
      );
    }
    const tournaments = (await tRes.json()) as LimitlessTournament[];
    const latest = pickLatestTournament(tournaments, tags);
    if (!latest) {
      return Response.json(
        { error: `No ${format} tournaments found on Limitless yet` },
        { status: 404 }
      );
    }

    const sRes = await fetch(limitlessStandingsUrl(latest.id), { next: { revalidate } });
    if (!sRes.ok) {
      return Response.json(
        { error: `Limitless returned ${sRes.status} for standings` },
        { status: 502 }
      );
    }
    const standings = (await sRes.json()) as LimitlessStanding[];
    // Drop players who didn't publish a team sheet — an empty team is useless.
    const withTeams = standings.filter((s) => s.decklist && s.decklist.length > 0);
    const dataset = buildTournamentTeams(latest, withTeams, { topN: DEFAULT_TEAM_CAP });

    return Response.json(dataset, {
      headers: {
        "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    return Response.json(
      { error: `Failed to fetch tournament data: ${(err as Error).message}` },
      { status: 502 }
    );
  }
}
