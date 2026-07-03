import { calculate, Generations, Pokemon, Move, Field, type GenerationNum } from "@smogon/calc";
import type { SmogonSet } from "@/hooks/useSmogonSets";
import { getNatureByName } from "@/data/natures";
import { toPokeApiName } from "@/lib/pokemon/names";
import type { CalcSetup } from "./types";

export type KoBucket = "OHKO" | "2HKO" | "3HKO" | "4HKO+";

/** The four buckets, in order, used as the multiple-choice options. */
export const KO_BUCKETS: KoBucket[] = ["OHKO", "2HKO", "3HKO", "4HKO+"];

/**
 * Map a minimum-roll damage percentage to a *guaranteed* KO bucket. Using the
 * min roll makes the answer unambiguous: "how many hits to guarantee the KO?".
 */
export function koBucket(minPercent: number): KoBucket {
  if (minPercent <= 0) return "4HKO+";
  const hits = Math.ceil(100 / minPercent);
  if (hits <= 1) return "OHKO";
  if (hits === 2) return "2HKO";
  if (hits === 3) return "3HKO";
  return "4HKO+";
}

function firstOf<T>(v: T | T[] | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v;
}

type Gen = ReturnType<typeof Generations.get>;

export function getGen(generation: number): Gen {
  return Generations.get(generation as GenerationNum);
}

/** Build a @smogon/calc Pokemon from a real Smogon set. Returns null on failure. */
export function buildPokemon(gen: Gen, species: string, set: SmogonSet): Pokemon | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const opts: Record<string, any> = {
      level: set.level ?? 100,
    };
    const nature = firstOf(set.nature);
    if (nature) opts.nature = nature;
    if (set.evs) opts.evs = set.evs;
    if (set.ivs) opts.ivs = set.ivs;
    const ability = firstOf(set.ability);
    if (ability) opts.ability = ability;
    const item = firstOf(set.item);
    if (item) opts.item = item;
    return new Pokemon(gen, species, opts);
  } catch {
    return null;
  }
}

/** Final Speed stat of a built Pokemon. */
export function speedOf(pokemon: Pokemon): number {
  return pokemon.stats.spe;
}

export interface SpeedBreakdown {
  base: number;
  ev: number;
  iv: number;
  level: number;
  nature: string;
  /** "+10%", "−10%", or "neutral" — the nature's effect on Speed. */
  natureEffect: string;
  final: number;
}

/** Decompose a built Pokemon's Speed so the quiz can show how it's derived. */
export function speedBreakdown(pokemon: Pokemon, set: SmogonSet): SpeedBreakdown {
  const nature = (Array.isArray(set.nature) ? set.nature[0] : set.nature) ?? "Serious";
  const n = getNatureByName(nature);
  const effect =
    n?.increasedStat === "speed" ? "+10%" : n?.decreasedStat === "speed" ? "−10%" : "neutral";
  return {
    base: pokemon.species.baseStats.spe,
    ev: set.evs?.spe ?? 0,
    iv: set.ivs?.spe ?? 31,
    level: set.level ?? 100,
    nature,
    natureEffect: effect,
    final: pokemon.stats.spe,
  };
}

export interface KoResult {
  minPercent: number;
  maxPercent: number;
  bucket: KoBucket;
  /** @smogon/calc's human-readable line, e.g. "… 240-283 (78.4 - 92.5%)". */
  fullDesc: string;
  /** KO-chance text, e.g. "guaranteed 2HKO" or "56.3% chance to 2HKO". */
  koText: string;
}

function parseKoText(result: ReturnType<typeof calculate>): string {
  try {
    const ko = result.kochance();
    if (!ko || typeof ko !== "object" || !("n" in ko)) return "";
    const chance = (ko.chance as number) * 100;
    const n = ko.n as number;
    const label = n === 1 ? "OHKO" : `${n}HKO`;
    if (chance >= 100) return `guaranteed ${label}`;
    if (chance > 0) return `${chance.toFixed(1)}% chance to ${label}`;
    return `${n + 1}HKO`;
  } catch {
    return "";
  }
}

/** Run a single damage calc and return KO bucketing, or null if the move is invalid/non-damaging. */
export function computeKo(
  gen: Gen,
  attacker: Pokemon,
  defender: Pokemon,
  moveName: string
): KoResult | null {
  try {
    const move = new Move(gen, moveName);
    const result = calculate(gen, attacker, defender, move, new Field());
    const range = result.range();
    const maxHp = defender.maxHP();
    if (!maxHp) return null;
    const minDamage = range[0];
    const maxDamage = range[1];
    if (maxDamage <= 0) return null; // status / immune / non-damaging
    const minPercent = (minDamage / maxHp) * 100;
    const maxPercent = (maxDamage / maxHp) * 100;
    let fullDesc = "";
    try {
      fullDesc = result.fullDesc();
    } catch {
      fullDesc = "";
    }
    return {
      minPercent,
      maxPercent,
      bucket: koBucket(minPercent),
      fullDesc,
      koText: parseKoText(result),
    };
  } catch {
    return null;
  }
}

/** Convert a Smogon display species ("Basculegion-F") to the app's PokéAPI slug. */
export function toCalcSpecies(species: string): string {
  return toPokeApiName(species).pokeApiName;
}

/** Build a Damage Calculator setup from a real set, for the deep-link. */
export function toCalcSetup(species: string, set: SmogonSet): CalcSetup {
  return {
    species: toCalcSpecies(species),
    level: set.level ?? 100,
    nature: Array.isArray(set.nature) ? set.nature[0] : set.nature,
    item: Array.isArray(set.item) ? set.item[0] : set.item,
    ability: Array.isArray(set.ability) ? set.ability[0] : set.ability,
    evs: set.evs,
    ivs: set.ivs,
  };
}

/** A move entry from a set may be slashed alternatives; take the first option. */
export function moveName(entry: string | string[]): string {
  return Array.isArray(entry) ? entry[0] : entry;
}
