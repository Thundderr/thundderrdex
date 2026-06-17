// Gen 6 (XY/ORAS) & Gen 7 (SM/USUM) capture math.
//
//   X = ((3M-2H)*G*C*B/(3M)) * S * O                       (real numbers)
//   Y = floor(65536 / (255/X)^(3/16)) ; 4 shakes ; normal P = (Y/65536)^4
//   Critical capture (single shake). Catching Charm (Gen 7+) doubles crit P.
// O = O-Power (Gen 6) / Roto bonus (Gen 7). Ball deltas (Net/Repeat/Dusk/Beast)
// are resolved in balls.ts by generation.

import { CatchRateInputs, CatchRateResult } from "./types";
import { resolveBallGen3Plus } from "./balls";
import {
  autoCatchResult,
  critDexMultiplier,
  hpFactor,
  modernStatusMultiplier,
  resolveShakeCapture,
  shakeThresholdGen6Plus,
} from "./shakeModel";

export function calcGen67(i: CatchRateInputs, gen: 6 | 7): CatchRateResult {
  const ball = resolveBallGen3Plus(gen, i);
  if (ball.autoCatch) return autoCatchResult();

  const c = Math.max(
    1,
    Math.min(255, i.captureRate * ball.captureRateMul + ball.captureRateAdd)
  );
  const status = modernStatusMultiplier(i.status, 2.5, 1.5);
  // O-Power (Gen 6): 1 / 1.5 / 2 / 2.5. Roto Catch (Gen 7): only lv3 = 2.5.
  const o = gen === 6
    ? [1, 1.5, 2, 2.5][Math.max(0, Math.min(3, i.oPowerLevel))]
    : i.oPowerLevel >= 3
      ? 2.5
      : 1;

  const x = hpFactor(i.maxHp, i.currentHp) * c * ball.ballBonus * status * o;
  const charm = gen >= 7 && i.catchingCharm ? 2 : 1;

  return resolveShakeCapture({
    x,
    threshold: shakeThresholdGen6Plus,
    shakeChecks: 4,
    critMultiplier: critDexMultiplier(i.dexCaughtBucket) * charm,
  });
}
