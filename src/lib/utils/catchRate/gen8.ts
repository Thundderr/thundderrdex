// Gen 8 (SwSh/BDSP) capture math.
//
//   X = ((3M-2H)*G*C*B/(3M)) * L * S * D                   (real numbers)
//   Y = floor(65536 / (255/X)^(3/16)) ; 4 shakes ; normal P = (Y/65536)^4
//   L = low-level modifier (lv<21 -> (30-lv)/10, else 1)
//   D = 0.1 if no 8th badge AND your level < target, else 1
//   Critical capture (single shake); Catching Charm doubles crit P.

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

export function calcGen8(i: CatchRateInputs): CatchRateResult {
  const ball = resolveBallGen3Plus(8, i);
  if (ball.autoCatch) return autoCatchResult();

  const c = Math.max(
    1,
    Math.min(255, i.captureRate * ball.captureRateMul + ball.captureRateAdd)
  );
  const lowLevel = i.targetLevel < 21 ? (30 - i.targetLevel) / 10 : 1;
  const status = modernStatusMultiplier(i.status, 2.5, 1.5);
  const difficulty = !i.hasEighthBadge && i.yourLevel < i.targetLevel ? 0.1 : 1;

  const x =
    hpFactor(i.maxHp, i.currentHp) * c * ball.ballBonus * lowLevel * status * difficulty;
  const charm = i.catchingCharm ? 2 : 1;

  return resolveShakeCapture({
    x,
    threshold: shakeThresholdGen6Plus,
    shakeChecks: 4,
    critMultiplier: critDexMultiplier(i.dexCaughtBucket) * charm,
  });
}
