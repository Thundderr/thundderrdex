/**
 * Verified response types for the competitive data sources, plus the app-facing
 * normalized shapes. Shapes confirmed by probing the live endpoints (June 2026);
 * see docs/data-pathways.md.
 */

// ---------------------------------------------------------------------------
// Smogon usage statistics ("chaos" JSON)
//   https://www.smogon.com/stats/<YYYY-MM>/chaos/<format>-<cutoff>.json
// ---------------------------------------------------------------------------

/** Map of option → WEIGHTED COUNT (not a percentage — see normalizeChaosEntry). */
export type WeightedCounts = Record<string, number>;

export interface SmogonChaosInfo {
  metagame: string;
  cutoff: number;
  "cutoff deviation": number;
  "team type": string | null;
  "number of battles": number;
}

export interface SmogonChaosEntry {
  "Raw count": number;
  "Viability Ceiling": number[];
  /** Fraction of teams running this Pokémon (already a proportion, ×100 for %). */
  usage: number;
  Abilities: WeightedCounts;
  Items: WeightedCounts;
  /** Keyed by "Nature:hp/atk/def/spa/spd/spe". */
  Spreads: WeightedCounts;
  Moves: WeightedCounts;
  /** `{ "nothing": n }` in formats without Tera (Champions). */
  "Tera Types": WeightedCounts;
  Teammates: WeightedCounts;
  Happiness?: WeightedCounts;
  /** Effectively empty (`[]`) for VGC formats — do not rely on it. */
  "Checks and Counters": unknown;
}

export interface SmogonChaos {
  info: SmogonChaosInfo;
  data: Record<string, SmogonChaosEntry>;
}

/** Smogon stats ELO cutoffs (high ladder = 1760). */
export type StatsCutoff = 0 | 1500 | 1630 | 1760;

// ---------------------------------------------------------------------------
// Limitless VGC API
//   https://play.limitlesstcg.com/api
// ---------------------------------------------------------------------------

export interface LimitlessTournament {
  game: string; // "VGC"
  name: string;
  date: string; // ISO
  format: string; // short tag, e.g. "M-B", "I"
  id: string;
  players: number;
  organizerId: number;
}

export interface LimitlessRecord {
  wins: number;
  losses: number;
  ties: number;
}

/** One Pokémon in a published tournament team. NOTE: no EV spread is provided. */
export interface LimitlessDecklistMon {
  id: string; // kebab species id, e.g. "urshifu-rapid-strike"
  name: string;
  item: string | null;
  ability: string | null;
  attacks: string[]; // up to 4 moves
  nature: string | null;
  tera: string | null;
}

export interface LimitlessStanding {
  name: string;
  country: string | null;
  placing: number;
  player: string;
  record: LimitlessRecord;
  decklist: LimitlessDecklistMon[];
  deck?: unknown;
  drop?: boolean;
}

// ---------------------------------------------------------------------------
// App-facing normalized shapes (what the rest of the app should consume)
// ---------------------------------------------------------------------------

/** A single weighted option converted to a percentage of the Pokémon's usage. */
export interface UsageOption {
  name: string;
  /** 0–100 (single-select fields cap at 100; move slots can exceed via 4 slots). */
  pct: number;
}

/** A parsed EV spread option. */
export interface SpreadOption {
  nature: string;
  evs: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
  pct: number;
}

/** Normalized per-Pokémon usage, source-agnostic. */
export interface UsageEntry {
  /** Smogon display name, e.g. "Urshifu-Rapid-Strike". */
  name: string;
  /** 0–100 headline usage. */
  usagePct: number;
  rawCount: number;
  abilities: UsageOption[];
  items: UsageOption[];
  moves: UsageOption[];
  tera: UsageOption[];
  teammates: UsageOption[];
  spreads: SpreadOption[];
}

/**
 * A `UsageEntry` with its option lists capped to the top-N (the shape the proxy
 * route ships to the client). Adds the app kebab `species` id for convenience.
 */
export interface SlimUsageEntry extends UsageEntry {
  /** App kebab-case species id, e.g. "urshifu-rapid-strike". */
  species: string;
}

/** Per-list caps applied when slimming a chaos file for the client. */
export interface UsageCaps {
  abilities: number;
  items: number;
  moves: number;
  tera: number;
  teammates: number;
  spreads: number;
}

/** The full normalized, slimmed dataset for one format/month — what the app consumes. */
export interface UsageDataset {
  smogonFormat: string;
  month: string;
  cutoff: number;
  battles: number;
  /** Entries sorted by usage descending. */
  entries: SlimUsageEntry[];
}
