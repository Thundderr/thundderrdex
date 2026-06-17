// Gen 3 (RSE/FRLG) & Gen 4 (DPPt/HGSS) capture math. Identical formula; Gen 4
// adds Dusk/Quick balls and HGSS apricorn balls (handled in balls.ts).
//
//   X = floor( floor((3M-2H)*C*B/(3M)) * S )      (integer math throughout)
//   Y = floor(1048560 / sqrt(sqrt(16711680 / X))) ; 4 shakes ; P = (Y/65536)^4
// No critical capture in these gens.

import { CatchRateInputs, CatchRateResult } from "./types";
import { resolveBallGen3Plus } from "./balls";
import {
  autoCatchResult,
  hpFactor,
  modernStatusMultiplier,
  resolveShakeCapture,
  shakeThresholdGen34,
} from "./shakeModel";

export function calcGen34(i: CatchRateInputs, gen: 3 | 4): CatchRateResult {
  const ball = resolveBallGen3Plus(gen, i);
  if (ball.autoCatch) return autoCatchResult();

  const c = Math.max(
    1,
    Math.min(255, Math.floor(i.captureRate * ball.captureRateMul) + ball.captureRateAdd)
  );
  const status = modernStatusMultiplier(i.status, 2, 1.5);

  const inner = Math.floor(hpFactor(i.maxHp, i.currentHp) * c * ball.ballBonus);
  const x = Math.max(1, Math.floor(inner * status));

  return resolveShakeCapture({ x, threshold: shakeThresholdGen34, shakeChecks: 4 });
}
