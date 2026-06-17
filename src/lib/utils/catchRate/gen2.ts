// Gen 2 (GSC) capture math. Ball effects modify the capture rate C (not a
// separate B multiplier), and there's no shake-threshold formula — capture is a
// single check against X.
//
//   X = max(floor((3M-2H)*C / 3M), 1) + S     (Level Ball quirk: X = C)
//   capture if random[0,255] <= X  =>  P = (X+1)/256
//   S = +10 only for sleep/freeze (GSC bug: poison/burn/paralysis are inert).

import { CatchRateInputs, CatchRateResult } from "./types";
import { autoCatchResult, hpFactor } from "./shakeModel";

function levelBallMul(yourLevel: number, targetLevel: number): number {
  if (yourLevel / 4 > targetLevel) return 8;
  if (yourLevel / 2 > targetLevel) return 4;
  if (yourLevel > targetLevel) return 2;
  return 1;
}

function heavyAdd(weightKg: number): number {
  if (weightKg >= 409.6) return 40;
  if (weightKg >= 307.2) return 30;
  if (weightKg >= 204.8) return 20;
  if (weightKg >= 102.4) return 0;
  return -20;
}

// Returns the modified capture rate C for the chosen ball (clamped 1..255), or
// { auto } for the Master Ball.
function gen2CaptureRate(i: CatchRateInputs): { auto?: boolean; c: number } {
  const r = i.captureRate;
  let c = r;
  switch (i.ballId) {
    case "master":
      return { auto: true, c: r };
    case "great":
      c = r * 1.5;
      break;
    case "ultra":
      c = r * 2;
      break;
    case "fast":
      c = i.isGen2FastBallSpecies ? r * 4 : r;
      break;
    case "level":
      c = r * levelBallMul(i.yourLevel, i.targetLevel);
      break;
    case "lure":
      c = i.inWater ? r * 3 : r;
      break;
    case "love":
      c =
        i.sameSpeciesAsYours &&
        ((i.yourGender === "male" && i.targetGender === "female") ||
          (i.yourGender === "female" && i.targetGender === "male"))
          ? r * 8
          : r;
      break;
    case "moon":
      c = i.evolvesByMoonStone ? r * 4 : r;
      break;
    case "heavy":
      c = r + heavyAdd(i.weightKg);
      break;
    // poke, friend, sport, and anything else -> x1
    default:
      c = r;
  }
  return { c: Math.max(1, Math.min(255, Math.floor(c))) };
}

export function calcGen2(i: CatchRateInputs): CatchRateResult {
  const resolved = gen2CaptureRate(i);
  if (resolved.auto) return autoCatchResult();

  const c = resolved.c;
  const s = i.status === "sleep" || i.status === "freeze" ? 10 : 0;

  // Level Ball bypasses the HP calculation entirely (a GSC quirk).
  const hpModified =
    i.ballId === "level" ? c : Math.max(1, Math.floor(hpFactor(i.maxHp, i.currentHp) * c));
  const x = Math.min(255, hpModified + s);

  const catchChance = Math.min(1, (x + 1) / 256);
  return {
    catchChance,
    expectedBalls: catchChance > 0 ? 1 / catchChance : Infinity,
    criticalChance: 0,
    guaranteed: x >= 255,
    detail: {
      modifiedCatchRate: x,
      shakeThreshold: null,
      shakeChecks: 0,
      notes: s ? ["+10 status bonus (sleep/freeze)"] : undefined,
    },
  };
}
