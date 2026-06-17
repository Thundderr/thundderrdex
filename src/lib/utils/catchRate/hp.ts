// HP estimation for the catch-rate engine.
//
// The capture formulas use max HP (M) and current HP (H). Modern gens only care
// about the ratio H/M, but Gen 1's algorithm uses the raw integers, so we
// estimate a concrete max HP from the species base HP at the target level.
//
// We assume a representative wild Pokémon: max IV/DV, 0 EV. The reference
// calculator treats HP% as an approximation too, so this is faithful enough and
// surfaced in the detailed report.

import { SupportedGen } from "./types";

// Standard HP stat formula. Gen 1-2 cap "IV" (the DV) at 15; Gen 3+ at 31.
export function estimateMaxHp(baseHp: number, level: number, gen: SupportedGen): number {
  const iv = gen <= 2 ? 15 : 31;
  // Shedinja-style 1-HP species aren't worth special-casing here.
  return Math.floor(((2 * baseHp + iv) * level) / 100) + level + 10;
}

// Resolve current HP from the UI control. exactlyOneHp wins; otherwise take the
// percentage of max HP (never below 1).
export function resolveCurrentHp(
  maxHp: number,
  hpPercent: number,
  exactlyOneHp: boolean
): number {
  if (exactlyOneHp) return 1;
  const pct = Math.max(1, Math.min(100, hpPercent));
  return Math.max(1, Math.round((maxHp * pct) / 100));
}
