import type { CompetitiveFormatId } from "./formats";
import type { SlimUsageEntry, StatsCutoff, UsageDataset } from "./types";

/**
 * Client access to competitive usage data. Hits our own proxy route
 * (/api/usage/<format>), which fetches + slims the Smogon chaos file
 * server-side, so the browser only ever receives the small dataset.
 */
export async function fetchUsageDataset(
  format: CompetitiveFormatId,
  opts: { cutoff?: StatsCutoff; month?: string } = {}
): Promise<UsageDataset> {
  const params = new URLSearchParams();
  if (opts.cutoff) params.set("cutoff", String(opts.cutoff));
  if (opts.month) params.set("month", opts.month);
  const qs = params.toString();
  const res = await fetch(`/api/usage/${format}${qs ? `?${qs}` : ""}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Usage fetch failed (${res.status})`);
  }
  return (await res.json()) as UsageDataset;
}

/** Index a dataset's entries by app kebab species id for O(1) lookups. */
export function indexBySpecies(dataset: UsageDataset): Map<string, SlimUsageEntry> {
  return new Map(dataset.entries.map((e) => [e.species, e]));
}

// Session-lifetime cache so a competitive mode loads a format's usage once.
// Caches the promise to dedupe concurrent loads; evicts on failure so a
// transient error doesn't pin a rejected promise.
const usageCache = new Map<string, Promise<UsageDataset>>();

export function loadUsage(
  format: CompetitiveFormatId,
  opts: { cutoff?: StatsCutoff; month?: string } = {}
): Promise<UsageDataset> {
  const key = `${format}:${opts.cutoff ?? 1760}:${opts.month ?? "latest"}`;
  let p = usageCache.get(key);
  if (!p) {
    p = fetchUsageDataset(format, opts).catch((err) => {
      usageCache.delete(key);
      throw err;
    });
    usageCache.set(key, p);
  }
  return p;
}
