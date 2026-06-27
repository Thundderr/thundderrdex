import type { SmogonSet } from "@/hooks/useSmogonSets";
import type { SlimUsageEntry, UsageDataset } from "@/lib/competitive/types";
import { abilityDisplayName, itemDisplayName, moveDisplayName } from "@/lib/competitive/dexNames";
import type { PoolEntry, SetPool } from "./setPool";

// VGC / Champions are level-50 doubles; usage data carries no level (always 50).
const VGC_LEVEL = 50;

/**
 * Turn a usage entry into its single most-common build: top spread (nature +
 * EVs), top item/ability, and top moves — a realistic "what the field runs"
 * set, at VGC level 50. Returns null if it lacks the data to build a mon.
 */
function entryToSet(entry: SlimUsageEntry, format: string): SmogonSet | null {
  const spread = entry.spreads[0];
  if (!spread) return null;
  const moves = entry.moves.slice(0, 4).map((m) => moveDisplayName(m.name));
  if (moves.length === 0) return null;
  return {
    name: "Meta",
    format,
    formatDisplay: "VGC",
    ability: entry.abilities[0] ? abilityDisplayName(entry.abilities[0].name) : undefined,
    item: entry.items[0] ? itemDisplayName(entry.items[0].name) : undefined,
    nature: spread.nature,
    evs: spread.evs,
    moves,
    level: VGC_LEVEL,
  };
}

// Cache per dataset object — building ~240 sets is cheap but pointless to repeat
// for every question in a session.
const cache = new WeakMap<UsageDataset, SetPool>();

/**
 * A battle-mode pool built from real competitive usage: each in-format mon as
 * its most-common build. Drop-in replacement for the singles `SetPool`, so the
 * Speed / KO modes reflect the actual VGC meta instead of singles tiers.
 */
export function usagePoolFromDataset(dataset: UsageDataset): SetPool {
  const cached = cache.get(dataset);
  if (cached) return cached;
  const pool: SetPool = [];
  for (const entry of dataset.entries) {
    const set = entryToSet(entry, dataset.smogonFormat);
    if (set) {
      pool.push({ species: entry.name, sets: [set], usagePct: entry.usagePct } satisfies PoolEntry);
    }
  }
  cache.set(dataset, pool);
  return pool;
}
