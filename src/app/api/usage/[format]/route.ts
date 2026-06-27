import { COMPETITIVE_FORMATS, type CompetitiveFormatId } from "@/lib/competitive/formats";
import {
  buildUsageDataset,
  smogonChaosUrl,
  smogonStatsIndexUrl,
  parseLatestStatsMonth,
  previousMonth,
  LATEST_STATS_MONTH,
} from "@/lib/competitive/sources";
import type { SmogonChaos, StatsCutoff } from "@/lib/competitive/types";

// Re-run the route daily so a newly-published month is picked up within a day —
// cheaply, because the heavy chaos file is cached per-month (see CHAOS_TTL) and
// only re-downloaded when the month actually changes.
export const revalidate = 86400;

const DAY = 86400;
const MONTH = 60 * 60 * 24 * 30;

const VALID_CUTOFFS: StatsCutoff[] = [0, 1500, 1630, 1760];

function isFormatId(id: string): id is CompetitiveFormatId {
  return id in COMPETITIVE_FORMATS;
}

/** Resolve the newest published stats month from the live index (cached daily). */
async function latestMonth(): Promise<string> {
  try {
    const res = await fetch(smogonStatsIndexUrl(), { next: { revalidate: DAY } });
    if (res.ok) {
      const month = parseLatestStatsMonth(await res.text());
      if (month) return month;
    }
  } catch {
    // fall through to the floor
  }
  return LATEST_STATS_MONTH;
}

// A month's chaos file never changes once published, so cache it for a long time;
// the daily route re-run reuses it until the resolved month flips.
function fetchChaos(format: string, cutoff: StatsCutoff, month: string) {
  return fetch(smogonChaosUrl(format, cutoff, month), { next: { revalidate: MONTH } });
}

/**
 * GET /api/usage/<format>?cutoff=1760&month=2026-05
 *
 * Fetches a format's Smogon chaos JSON server-side, normalises + slims it to a
 * small `UsageDataset`, and returns that. The month auto-resolves to the latest
 * published one (overridable via ?month=). See docs/data-pathways.md.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ format: string }> }
) {
  const { format } = await params;
  if (!isFormatId(format)) {
    return Response.json({ error: `Unknown format "${format}"` }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const cutoffParam = Number(searchParams.get("cutoff") ?? 1760) as StatsCutoff;
  const cutoff = VALID_CUTOFFS.includes(cutoffParam) ? cutoffParam : 1760;
  const smogonFormat = COMPETITIVE_FORMATS[format].smogonFormat;

  let month = searchParams.get("month") ?? (await latestMonth());

  let chaos: SmogonChaos;
  try {
    let upstream = await fetchChaos(smogonFormat, cutoff, month);
    // The newest month may not carry this format yet (or just rolled over);
    // fall back one month before giving up.
    if (!upstream.ok && !searchParams.get("month")) {
      month = previousMonth(month);
      upstream = await fetchChaos(smogonFormat, cutoff, month);
    }
    if (!upstream.ok) {
      // A 404 means that month/format simply has no stats (often an explicit
      // ?month= that isn't published) — surface that as 404, not a gateway error.
      const notFound = upstream.status === 404;
      return Response.json(
        {
          error: notFound
            ? `No usage stats for ${smogonFormat} in ${month}`
            : `Smogon returned ${upstream.status} for ${smogonFormat} (${month})`,
        },
        { status: notFound ? 404 : 502 }
      );
    }
    chaos = (await upstream.json()) as SmogonChaos;
  } catch (err) {
    return Response.json(
      { error: `Failed to fetch Smogon stats: ${(err as Error).message}` },
      { status: 502 }
    );
  }

  const dataset = buildUsageDataset(chaos, { month });
  return Response.json(dataset, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
