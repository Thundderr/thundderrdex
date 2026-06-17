// Gen 1 (RBY) capture algorithm — the famous special case with no shake formula.
//
// A ball-specific random R1 in [0, Bv-1] is drawn; a status threshold S gives a
// chance of instant capture; otherwise the species rate gates against R1-S and
// an HP factor F decides the rest. Closed-form capture probability:
//
//   P = S/Bv + (min(C+1, Bv-S)/Bv) * ((F+1)/256)
//
// where F = floor(floor(M*255 / G) / max(1, floor(H/4))), capped at 255,
// G = 8 for Great Ball else 12.

import { CatchRateInputs, CatchRateResult } from "./types";
import { autoCatchResult } from "./shakeModel";

// Ball -> { Bv (random range size), G (HP divisor) }. Balls that don't exist in
// Gen 1 fall back to Poké Ball behavior.
function gen1Ball(ballId: string): { auto?: boolean; bv: number; g: number } {
  switch (ballId) {
    case "master":
      return { auto: true, bv: 0, g: 12 };
    case "great":
      return { bv: 201, g: 8 };
    case "ultra":
    case "safari":
      return { bv: 151, g: 12 };
    default: // poke + anything not in Gen 1
      return { bv: 256, g: 12 };
  }
}

function statusThreshold(status: CatchRateInputs["status"]): number {
  if (status === "sleep" || status === "freeze") return 25;
  if (status === "poison" || status === "burn" || status === "paralysis") return 12;
  return 0;
}

export function calcGen1(i: CatchRateInputs): CatchRateResult {
  const ball = gen1Ball(i.ballId);
  if (ball.auto) return autoCatchResult();

  const { bv, g } = ball;
  const s = statusThreshold(i.status);
  const c = i.captureRate;

  let f = Math.floor((i.maxHp * 255) / g);
  f = Math.floor(f / Math.max(1, Math.floor(i.currentHp / 4)));
  f = Math.min(255, f);

  const statusCatch = s / bv;
  const proceeding = Math.min(c + 1, bv - s) / bv;
  const hpPass = (f + 1) / 256;
  const catchChance = Math.min(1, statusCatch + proceeding * hpPass);

  return {
    catchChance,
    expectedBalls: catchChance > 0 ? 1 / catchChance : Infinity,
    criticalChance: 0,
    guaranteed: false,
    detail: {
      modifiedCatchRate: c,
      shakeThreshold: null,
      shakeChecks: 0,
      notes: [`HP factor F=${f}`, `status threshold S=${s}`, `ball range Bv=${bv}`],
    },
  };
}
