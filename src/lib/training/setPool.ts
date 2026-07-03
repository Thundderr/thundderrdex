import type { SmogonSet } from "@/hooks/useSmogonSets";

/** A species paired with its real competitive sets, the unit the battle modes sample. */
export interface PoolEntry {
  /** Showdown display name (e.g. "Basculegion-F", "Tapu Koko"), not the app kebab id. */
  species: string;
  sets: SmogonSet[];
  /** Format usage % when the pool is built from usage data; absent for singles sets. */
  usagePct?: number;
}

export type SetPool = PoolEntry[];

// Live mirror of Smogon set data, kept current and (unlike the bundled
// @smogon/sets package) covering Gen 9. Same JSON shape as the package.
const MIRROR_BASE = "https://data.pkmn.cc/sets/";

// Formats sampled per generation, widest-usage first. We pull a few tiers so the
// pool spans more than just the top metagame, giving questions variety.
const POOL_FORMATS: Record<number, string[]> = {
  1: ["ou", "uu"],
  2: ["ou", "uu"],
  3: ["ou", "uu", "ubers"],
  4: ["ou", "uu", "ubers"],
  5: ["ou", "uu", "ubers"],
  6: ["ou", "uu", "ubers"],
  7: ["ou", "uu", "ubers"],
  8: ["ou", "uu", "ubers"],
  9: ["ou", "uu", "ubers"],
};

function firstOf<T>(v: T | T[] | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v;
}

type RawDex = Record<string, Record<string, unknown>>;
type RawSet = {
  moves?: (string | string[])[];
  ability?: string | string[];
  item?: string | string[];
  nature?: string | string[];
  evs?: SmogonSet["evs"];
  ivs?: SmogonSet["ivs"];
  level?: number;
};

/** Pull the species→set map out of either `{ dex }` or a bare dex object. */
function asDex(data: unknown): RawDex | null {
  if (!data || typeof data !== "object") return null;
  const maybe = (data as { dex?: unknown }).dex ?? data;
  return maybe && typeof maybe === "object" ? (maybe as RawDex) : null;
}

/** Fetch a format's dex from the live mirror. Returns null on any failure. */
async function fetchMirror(formatId: string): Promise<RawDex | null> {
  try {
    const res = await fetch(`${MIRROR_BASE}${formatId}.json`);
    if (!res.ok) return null;
    return asDex(await res.json());
  } catch {
    return null;
  }
}

/** Offline fallback: the bundled @smogon/sets package (Gens 1–8 only). */
async function fromPackage(formatId: string): Promise<RawDex | null> {
  try {
    const { forFormat } = await import("@smogon/sets");
    return asDex(await forFormat(formatId));
  } catch {
    return null;
  }
}

function mergeDex(dex: RawDex, formatLabel: string, formatId: string, into: Map<string, SmogonSet[]>): void {
  for (const [species, setMap] of Object.entries(dex)) {
    if (!setMap || typeof setMap !== "object") continue;
    const existing = into.get(species) ?? [];
    for (const [setName, raw] of Object.entries(setMap)) {
      const s = raw as RawSet;
      existing.push({
        name: setName,
        format: formatId,
        formatDisplay: formatLabel,
        ability: firstOf(s.ability),
        item: firstOf(s.item),
        nature: firstOf(s.nature),
        evs: s.evs,
        ivs: s.ivs,
        moves: s.moves ?? [],
        level: s.level,
      });
    }
    into.set(species, existing);
  }
}

const poolCache = new Map<number, SetPool>();

/**
 * Load and cache a pool of species-with-sets for a generation, built from real
 * Smogon set data. Tries the live mirror first (covers Gen 9), falling back to
 * the bundled package when offline. Cached per generation for the session.
 * Returns [] only when no source has any data (caller shows an empty state).
 */
export async function loadSetPool(generation: number): Promise<SetPool> {
  const cached = poolCache.get(generation);
  if (cached) return cached;

  const formats = POOL_FORMATS[generation] ?? POOL_FORMATS[9];
  const bySpecies = new Map<string, SmogonSet[]>();

  for (const format of formats) {
    const formatId = `gen${generation}${format}`;
    const dex = (await fetchMirror(formatId)) ?? (await fromPackage(formatId));
    if (dex) mergeDex(dex, format.toUpperCase(), formatId, bySpecies);
  }

  const pool: SetPool = [...bySpecies.entries()]
    .filter(([, sets]) => sets.length > 0)
    .map(([species, sets]) => ({ species, sets }));

  // Only cache a non-empty result so a transient offline failure doesn't pin an
  // empty pool for the rest of the session.
  if (pool.length > 0) poolCache.set(generation, pool);
  return pool;
}
