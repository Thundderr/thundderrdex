import type { PokemonTypeName } from "@/types/pokemon";
import type { UsageDataset } from "@/lib/competitive/types";
import { moveInfo, speciesTypes } from "@/lib/competitive/dexNames";

/**
 * Usage-weighted type distributions for a format, so the type-matchup mode can
 * offer *representative* scenarios — defending typings and attacking types show
 * up in proportion to how often you'd actually face them. Derived from the live
 * usage data, so it evolves with the metagame.
 */
export interface MetaTypeDistributions {
  /** One entry per meta mon (kept separate so callers can filter mono vs dual). */
  defenders: { types: PokemonTypeName[]; weight: number }[];
  /** Attacking types weighted by how much damaging-move usage they represent. */
  attackers: { type: PokemonTypeName; weight: number }[];
}

const cache = new WeakMap<UsageDataset, MetaTypeDistributions>();

export function metaTypeDistributions(dataset: UsageDataset): MetaTypeDistributions {
  const cached = cache.get(dataset);
  if (cached) return cached;

  const defenders: MetaTypeDistributions["defenders"] = [];
  const attackWeights = new Map<string, number>();

  for (const entry of dataset.entries) {
    const types = speciesTypes(entry.species);
    if (types) {
      defenders.push({ types: types as PokemonTypeName[], weight: entry.usagePct });
    }
    // Attacking-type weight: usage of the mon × how often it runs each damaging move.
    for (const mv of entry.moves) {
      const info = moveInfo(mv.name);
      if (!info || !info.damaging) continue;
      const w = entry.usagePct * (mv.pct / 100);
      attackWeights.set(info.type, (attackWeights.get(info.type) ?? 0) + w);
    }
  }

  const attackers = [...attackWeights.entries()]
    .map(([type, weight]) => ({ type: type as PokemonTypeName, weight }))
    .sort((a, b) => b.weight - a.weight);

  const result = { defenders, attackers };
  cache.set(dataset, result);
  return result;
}
