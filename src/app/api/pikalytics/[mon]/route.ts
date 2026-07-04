import { extractChampionsCode, parsePikalyticsMon } from "@/lib/competitive/pikalytics";

export const revalidate = 86400;

const PIKA = "https://www.pikalytics.com";
const DAY = 86400;

/** Resolve the current Champions season code from Pikalytics' /ai hub (cached daily). */
async function currentCode(): Promise<string> {
  try {
    const res = await fetch(`${PIKA}/ai`, { next: { revalidate: DAY } });
    if (res.ok) {
      const c = extractChampionsCode(await res.text());
      if (c) return c.code;
    }
  } catch {
    // fall through to the pinned fallback
  }
  return "battledataregmbs3";
}

/**
 * GET /api/pikalytics/<mon>
 * <mon> is the Pikalytics slug (Showdown display name, already resolved client-side).
 * Fetches the per-mon /ai markdown, parses it to a PikalyticsEntry. A 404 (mon not
 * charted) returns a notCharted entry with 200 so the UI degrades gracefully.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ mon: string }> }
) {
  const { mon } = await params;
  const code = await currentCode();
  const url = `${PIKA}/ai/pokedex/${code}/${encodeURIComponent(mon)}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "thundderrdex (+https://www.pikalytics.com)" },
      next: { revalidate: DAY },
    });
    if (res.status === 404) {
      return Response.json(parsePikalyticsMon(mon, ""), { status: 200 });
    }
    if (!res.ok) {
      return Response.json({ error: `Pikalytics returned ${res.status}` }, { status: 502 });
    }
    const entry = parsePikalyticsMon(mon, await res.text());
    return Response.json(entry, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch (err) {
    return Response.json({ error: `Failed to fetch Pikalytics: ${(err as Error).message}` }, { status: 502 });
  }
}
