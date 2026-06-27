import type { PokemonTypeName } from "@/types/pokemon";
import type { UsageDataset } from "@/lib/competitive/types";
import { moveDisplayName, moveInfo, speciesTypes } from "@/lib/competitive/dexNames";
import { pickWeighted } from "./random";

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

/** One side of a concrete meta matchup. */
export interface ScenarioSide {
  /** Smogon display name (matches the usage-built set pool's species key). */
  name: string;
  /** App kebab-case species id. */
  species: string;
  /** The mon's *own* typing (used for the defender; informational for the attacker). */
  types: PokemonTypeName[];
}

/**
 * A concrete "who hits whom" matchup sampled from the live meta: a real attacker
 * running one of its real damaging moves into a real defender. The attacking type
 * is the *move's* type — deliberately decoupled from the attacker's own typing,
 * since coverage moves routinely differ from STAB.
 */
export interface MetaTypeScenario {
  attacker: ScenarioSide;
  move: { name: string; type: PokemonTypeName };
  defender: ScenarioSide;
}

interface AttackOption {
  side: ScenarioSide;
  move: { name: string; type: PokemonTypeName };
  weight: number;
}

interface DefendOption {
  side: ScenarioSide;
  weight: number;
}

export type DefenderKind = "mono" | "dual" | "both";

/**
 * Sample a concrete matchup from the meta: an attacker + a damaging move it
 * actually runs (weighted by usage × move frequency), and a defender (weighted by
 * usage). Restricted to types that exist in the active generation via `inChart`,
 * and to the requested defender shape. Returns null when nothing qualifies, so
 * the caller can fall back to a random sweep.
 */
export function metaTypeScenario(
  dataset: UsageDataset,
  rng: () => number,
  opts: { defenderKind?: DefenderKind; inChart?: (t: PokemonTypeName) => boolean } = {}
): MetaTypeScenario | null {
  const kind = opts.defenderKind ?? "both";
  const inChart = opts.inChart ?? (() => true);

  const attacks: AttackOption[] = [];
  const defends: DefendOption[] = [];

  for (const entry of dataset.entries) {
    const rawTypes = speciesTypes(entry.species);
    if (!rawTypes) continue;
    const types = [...new Set(rawTypes)] as PokemonTypeName[];
    const side: ScenarioSide = { name: entry.name, species: entry.species, types };

    if (types.every(inChart)) {
      const shapeOk = kind === "both" || (kind === "mono" ? types.length === 1 : types.length === 2);
      if (shapeOk) defends.push({ side, weight: entry.usagePct });
    }

    // Attacking move drawn from what the mon actually runs — type from the MOVE,
    // not the species, so a non-Fire mon's Fire Blast registers as a Fire attack.
    for (const mv of entry.moves) {
      const info = moveInfo(mv.name);
      if (!info || !info.damaging) continue;
      const moveType = info.type as PokemonTypeName;
      if (!inChart(moveType)) continue;
      attacks.push({
        side,
        move: { name: moveDisplayName(mv.name), type: moveType },
        weight: entry.usagePct * (mv.pct / 100),
      });
    }
  }

  if (attacks.length === 0 || defends.length === 0) return null;

  const attacker = pickWeighted(rng, attacks, attacks.map((a) => a.weight));
  // Prefer a defender that isn't the attacker itself (mon-vs-itself reads oddly),
  // but fall back to the full list if excluding it empties the pool.
  const distinct = defends.filter((d) => d.side.species !== attacker.side.species);
  const pool = distinct.length ? distinct : defends;
  const defender = pickWeighted(rng, pool, pool.map((d) => d.weight));

  return { attacker: attacker.side, move: attacker.move, defender: defender.side };
}
