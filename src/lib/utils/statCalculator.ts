import { PokemonStats } from "@/types/pokemon";
import { Nature, getNatureModifier, StatKey } from "@/data/natures";

export interface StatModifiers {
  level: number;
  ivs: StatValues;
  evs: StatValues;
  nature: string;
  ability: string | null;
  item: string | null;
  moves: (string | null)[];
}

export interface StatValues {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

// Default stat modifiers
export const DEFAULT_STAT_MODIFIERS: StatModifiers = {
  level: 100,
  ivs: {
    hp: 31,
    attack: 31,
    defense: 31,
    specialAttack: 31,
    specialDefense: 31,
    speed: 31,
  },
  evs: {
    hp: 0,
    attack: 0,
    defense: 0,
    specialAttack: 0,
    specialDefense: 0,
    speed: 0,
  },
  nature: "Hardy",
  ability: null,
  item: null,
  moves: [null, null, null, null],
};

// Calculate HP stat (different formula)
// HP = floor((2*base + iv + floor(ev/4)) * level/100) + level + 10
function calculateHpStat(
  base: number,
  iv: number,
  ev: number,
  level: number
): number {
  return (
    Math.floor(
      ((2 * base + iv + Math.floor(ev / 4)) * level) / 100
    ) +
    level +
    10
  );
}

// Calculate other stats
// Stat = floor((floor((2*base + iv + floor(ev/4)) * level/100) + 5) * nature)
function calculateOtherStat(
  base: number,
  iv: number,
  ev: number,
  level: number,
  natureModifier: number
): number {
  return Math.floor(
    (Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5) *
      natureModifier
  );
}

// Input type for stat calculation (only needs core stat fields)
export interface StatCalcInput {
  level: number;
  ivs: StatValues;
  evs: StatValues;
  nature: string;
}

// Calculate all stats with modifiers
export function calculateStats(
  baseStats: PokemonStats,
  modifiers: StatCalcInput,
  nature: Nature
): PokemonStats {
  const { level, ivs, evs } = modifiers;

  return {
    hp: calculateHpStat(baseStats.hp, ivs.hp, evs.hp, level),
    attack: calculateOtherStat(
      baseStats.attack,
      ivs.attack,
      evs.attack,
      level,
      getNatureModifier(nature, "attack")
    ),
    defense: calculateOtherStat(
      baseStats.defense,
      ivs.defense,
      evs.defense,
      level,
      getNatureModifier(nature, "defense")
    ),
    specialAttack: calculateOtherStat(
      baseStats.specialAttack,
      ivs.specialAttack,
      evs.specialAttack,
      level,
      getNatureModifier(nature, "specialAttack")
    ),
    specialDefense: calculateOtherStat(
      baseStats.specialDefense,
      ivs.specialDefense,
      evs.specialDefense,
      level,
      getNatureModifier(nature, "specialDefense")
    ),
    speed: calculateOtherStat(
      baseStats.speed,
      ivs.speed,
      evs.speed,
      level,
      getNatureModifier(nature, "speed")
    ),
    total: 0, // Will recalculate below
  };
}

// Validate EV total (max 510)
export function getEvTotal(evs: StatValues): number {
  return evs.hp + evs.attack + evs.defense + evs.specialAttack + evs.specialDefense + evs.speed;
}

export function isValidEvTotal(evs: StatValues): boolean {
  return getEvTotal(evs) <= 510;
}

// Validate single EV value (0-252)
export function isValidEvValue(value: number): boolean {
  return value >= 0 && value <= 252;
}

// Validate single IV value (0-31)
export function isValidIvValue(value: number): boolean {
  return value >= 0 && value <= 31;
}

// Validate level (1-100)
export function isValidLevel(level: number): boolean {
  return level >= 1 && level <= 100;
}

// Clamp value to valid EV range
export function clampEv(value: number): number {
  return Math.max(0, Math.min(252, Math.floor(value)));
}

// Clamp value to valid IV range
export function clampIv(value: number): number {
  return Math.max(0, Math.min(31, Math.floor(value)));
}

// Clamp value to valid level range
export function clampLevel(level: number): number {
  return Math.max(1, Math.min(100, Math.floor(level)));
}
