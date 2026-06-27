/**
 * Pure data-pathway helpers: URL builders for every competitive source, plus the
 * transforms that turn raw responses into the app-facing shapes. No fetching, no
 * caching, no app wiring — those land in the per-source clients later.
 *
 * See docs/data-pathways.md for the full reference.
 */

import type {
  SmogonChaos,
  SmogonChaosEntry,
  SlimUsageEntry,
  SpreadOption,
  StatsCutoff,
  UsageCaps,
  UsageDataset,
  UsageEntry,
  UsageOption,
  WeightedCounts,
} from "./types";

/**
 * Fallback floor for the Smogon stats month (YYYY-MM). The route resolves the
 * real latest month from the live index daily; this is only used if that fetch
 * fails. Safe to bump occasionally but no longer required for freshness.
 */
export const LATEST_STATS_MONTH = "2026-05";

// --- Smogon usage stats URLs ----------------------------------------------

const SMOGON_STATS_BASE = "https://www.smogon.com/stats";

/** The stats directory index (lists every published YYYY-MM month folder). */
export function smogonStatsIndexUrl(): string {
  return `${SMOGON_STATS_BASE}/`;
}

/** Parse the latest YYYY-MM month folder from the Smogon stats index HTML. */
export function parseLatestStatsMonth(html: string): string | null {
  const months = html.match(/\d{4}-\d{2}(?=\/)/g);
  if (!months || months.length === 0) return null;
  // YYYY-MM sorts lexicographically, so the max string is the newest month.
  return months.reduce((a, b) => (b > a ? b : a));
}

/** The month before a YYYY-MM (for falling back when a month isn't published yet). */
export function previousMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

/** Full structured chaos JSON (large: 2–7 MB). */
export function smogonChaosUrl(format: string, cutoff: StatsCutoff = 1760, month = LATEST_STATS_MONTH): string {
  return `${SMOGON_STATS_BASE}/${month}/chaos/${format}-${cutoff}.json`;
}

/** Human-readable moveset detail (~85 KB) — same fields as chaos, text format. */
export function smogonMovesetTxtUrl(format: string, cutoff: StatsCutoff = 1760, month = LATEST_STATS_MONTH): string {
  return `${SMOGON_STATS_BASE}/${month}/moveset/${format}-${cutoff}.txt`;
}

/** Plain usage ranking only (~6 KB). */
export function smogonUsageTxtUrl(format: string, cutoff: StatsCutoff = 1760, month = LATEST_STATS_MONTH): string {
  return `${SMOGON_STATS_BASE}/${month}/${format}-${cutoff}.txt`;
}

// --- Pikalytics /ai URLs ---------------------------------------------------

const PIKALYTICS_AI_BASE = "https://www.pikalytics.com/ai";

export function pikalyticsFormatUrl(code: string): string {
  return `${PIKALYTICS_AI_BASE}/pokedex/${code}`;
}

export function pikalyticsPokemonUrl(code: string, pokemon: string): string {
  return `${PIKALYTICS_AI_BASE}/pokedex/${code}/${pokemon}`;
}

// --- Limitless VGC API URLs ------------------------------------------------

const LIMITLESS_API_BASE = "https://play.limitlesstcg.com/api";

export function limitlessTournamentsUrl(opts: { game?: string; limit?: number } = {}): string {
  const params = new URLSearchParams();
  params.set("game", opts.game ?? "VGC");
  if (opts.limit) params.set("limit", String(opts.limit));
  return `${LIMITLESS_API_BASE}/tournaments?${params.toString()}`;
}

export function limitlessStandingsUrl(tournamentId: string): string {
  return `${LIMITLESS_API_BASE}/tournaments/${tournamentId}/standings`;
}

// --- Transforms ------------------------------------------------------------

/**
 * Sum of a Pokémon's ability weights = its total weighted appearances, the
 * correct denominator for converting every other weighted-count field to a %.
 * (Each Pokémon has exactly one ability counted per appearance.)
 */
export function entryWeight(entry: SmogonChaosEntry): number {
  return Object.values(entry.Abilities).reduce((a, b) => a + b, 0);
}

/** Convert a weighted-count map to sorted `{ name, pct }`, normalised by `weight`. */
export function toUsageOptions(counts: WeightedCounts, weight: number): UsageOption[] {
  if (weight <= 0) return [];
  return Object.entries(counts)
    .map(([name, count]) => ({ name, pct: (count / weight) * 100 }))
    .sort((a, b) => b.pct - a.pct);
}

/** Parse a Smogon spread key "Careful:252/4/12/0/164/76" → nature + EVs. */
export function parseSpreadKey(key: string): { nature: string; evs: SpreadOption["evs"] } | null {
  const [nature, evStr] = key.split(":");
  if (!nature || !evStr) return null;
  const parts = evStr.split("/").map((n) => Number(n));
  if (parts.length !== 6 || parts.some((n) => Number.isNaN(n))) return null;
  const [hp, atk, def, spa, spd, spe] = parts;
  return { nature, evs: { hp, atk, def, spa, spd, spe } };
}

function toSpreadOptions(counts: WeightedCounts, weight: number): SpreadOption[] {
  if (weight <= 0) return [];
  return Object.entries(counts)
    .map(([key, count]) => {
      const parsed = parseSpreadKey(key);
      return parsed ? { ...parsed, pct: (count / weight) * 100 } : null;
    })
    .filter((s): s is SpreadOption => s !== null)
    .sort((a, b) => b.pct - a.pct);
}

/**
 * Normalise one raw chaos entry into the app-facing `UsageEntry` (weighted counts
 * → percentages, spreads parsed), so the rest of the app never sees raw counts.
 */
export function normalizeChaosEntry(name: string, entry: SmogonChaosEntry): UsageEntry {
  const weight = entryWeight(entry);
  return {
    name,
    usagePct: entry.usage * 100,
    rawCount: entry["Raw count"],
    abilities: toUsageOptions(entry.Abilities, weight),
    items: toUsageOptions(entry.Items, weight),
    moves: toUsageOptions(entry.Moves, weight),
    tera: toUsageOptions(entry["Tera Types"], weight),
    teammates: toUsageOptions(entry.Teammates, weight),
    spreads: toSpreadOptions(entry.Spreads, weight),
  };
}

/** Smogon display species ("Urshifu-Rapid-Strike") → app kebab id. */
export function toAppSpecies(name: string): string {
  return name.toLowerCase().replace(/[\s_]+/g, "-");
}

/**
 * Per-list caps when slimming a chaos file for the client. Keeps the proxied
 * payload small (~150 KB for ~270 mons) while retaining the meaningful options.
 */
export const DEFAULT_USAGE_CAPS: UsageCaps = {
  abilities: 4,
  items: 6,
  moves: 8,
  tera: 6,
  teammates: 8,
  spreads: 8,
};

function slimEntry(name: string, entry: SmogonChaosEntry, caps: UsageCaps): SlimUsageEntry {
  const full = normalizeChaosEntry(name, entry);
  return {
    ...full,
    species: toAppSpecies(name),
    abilities: full.abilities.slice(0, caps.abilities),
    items: full.items.slice(0, caps.items),
    moves: full.moves.slice(0, caps.moves),
    tera: full.tera.slice(0, caps.tera),
    teammates: full.teammates.slice(0, caps.teammates),
    spreads: full.spreads.slice(0, caps.spreads),
  };
}

/**
 * Turn a raw Smogon chaos file into the app-facing, slimmed `UsageDataset`
 * (normalised to %, option lists capped, entries sorted by usage desc). Pure —
 * the proxy route runs this server-side before shipping to the client.
 */
export function buildUsageDataset(
  chaos: SmogonChaos,
  opts: { month: string; caps?: UsageCaps }
): UsageDataset {
  const caps = opts.caps ?? DEFAULT_USAGE_CAPS;
  const entries = Object.entries(chaos.data)
    .map(([name, entry]) => slimEntry(name, entry, caps))
    .sort((a, b) => b.usagePct - a.usagePct);
  return {
    smogonFormat: chaos.info.metagame,
    month: opts.month,
    cutoff: chaos.info.cutoff,
    battles: chaos.info["number of battles"],
    entries,
  };
}

/**
 * The set of legal/played species in a format, derived from its usage data
 * (every Pokémon in the dataset is in-format). App kebab ids.
 */
export function legalSpeciesFromUsage(dataset: UsageDataset): Set<string> {
  return new Set(dataset.entries.map((e) => e.species));
}
