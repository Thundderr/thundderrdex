// Shared machinery for the shake-based capture model used by Gens 3-9.
//
// All of these gens compute a modified catch rate X, then a shake threshold Y,
// then capture succeeds if every shake check passes. They differ in: how X is
// built (which modifiers, what order), the Y formula, the number of shakes, and
// whether critical captures exist. Each gen strategy supplies those pieces.

import { CatchRateInputs, CatchRateResult } from "./types";

// Gen 3/4 shake threshold.
export function shakeThresholdGen34(x: number): number {
  return Math.floor(1048560 / Math.sqrt(Math.sqrt(16711680 / x)));
}

// Gen 5 shake threshold: 65536 / (255/X)^(1/4).
export function shakeThresholdGen5(x: number): number {
  return Math.floor(65536 / Math.sqrt(Math.sqrt(255 / x)));
}

// Gen 6+ shake threshold: 65536 / (255/X)^(3/16).
export function shakeThresholdGen6Plus(x: number): number {
  return Math.floor(65536 / Math.pow(255 / x, 3 / 16));
}

// Critical-capture P multiplier from the number of species caught (Gen 5+).
export function critDexMultiplier(caught: number): number {
  if (caught > 600) return 2.5;
  if (caught >= 451) return 2.0;
  if (caught >= 301) return 1.5;
  if (caught >= 151) return 1.0;
  if (caught >= 31) return 0.5;
  return 0;
}

interface ShakeOptions {
  x: number; // modified catch rate
  threshold: (x: number) => number;
  shakeChecks: number; // normal-capture shakes (3 for Gen 5, else 4)
  critMultiplier?: number; // P * Ch for critical capture; undefined => no crit
  notes?: string[];
}

// Assemble a CatchRateResult from a modified catch rate and a gen's shake rules.
export function resolveShakeCapture(opts: ShakeOptions): CatchRateResult {
  const { x, threshold, shakeChecks, critMultiplier, notes } = opts;

  if (x <= 0) {
    return {
      catchChance: 0,
      expectedBalls: Infinity,
      criticalChance: 0,
      guaranteed: false,
      detail: { modifiedCatchRate: x, shakeThreshold: 0, shakeChecks, notes },
    };
  }

  if (x >= 255) {
    return guaranteed(x, threshold(255), shakeChecks, notes);
  }

  const y = threshold(x);
  const perCheck = Math.min(1, y / 65536);
  const normalChance = Math.pow(perCheck, shakeChecks);

  let criticalChance = 0;
  if (critMultiplier !== undefined) {
    const cc = Math.floor((Math.min(255, x) * critMultiplier) / 6);
    criticalChance = Math.min(1, cc / 256);
  }

  // On a critical capture there's a single shake check; otherwise the full set.
  const catchChance =
    criticalChance * perCheck + (1 - criticalChance) * normalChance;

  return {
    catchChance,
    expectedBalls: catchChance > 0 ? 1 / catchChance : Infinity,
    criticalChance,
    guaranteed: false,
    detail: { modifiedCatchRate: x, shakeThreshold: y, shakeChecks, notes },
  };
}

function guaranteed(
  x: number,
  y: number,
  shakeChecks: number,
  notes?: string[]
): CatchRateResult {
  return {
    catchChance: 1,
    expectedBalls: 1,
    criticalChance: 0,
    guaranteed: true,
    detail: { modifiedCatchRate: x, shakeThreshold: y, shakeChecks, notes },
  };
}

// Result for balls that always catch (Master / Park).
export function autoCatchResult(): CatchRateResult {
  return {
    catchChance: 1,
    expectedBalls: 1,
    criticalChance: 0,
    guaranteed: true,
    detail: {
      modifiedCatchRate: Infinity,
      shakeThreshold: null,
      shakeChecks: 0,
      notes: ["Guaranteed catch"],
    },
  };
}

// Status multiplier shared by Gens 3-9 (the multiplier value differs by era).
export function modernStatusMultiplier(
  status: CatchRateInputs["status"],
  sleepFreeze: number,
  otherAilment: number
): number {
  if (status === "sleep" || status === "freeze") return sleepFreeze;
  if (status === "poison" || status === "burn" || status === "paralysis") {
    return otherAilment;
  }
  return 1;
}

// (3M - 2H) / 3M — the HP factor common to every shake-based gen.
export function hpFactor(maxHp: number, currentHp: number): number {
  return (3 * maxHp - 2 * currentHp) / (3 * maxHp);
}
