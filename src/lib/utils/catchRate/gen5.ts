// Gen 5 (BW/B2W2) capture math.
//
//   X = floor( floor((3M-2H)*G*C*B/(3M)) * S * E / 100 )   (integer)
//   Y = floor(65536 / sqrt(sqrt(255/X))) ; 3 shakes ; normal P = (Y/65536)^3
//   Critical capture exists (single shake), gated on species-caught count.
// G = dark-grass modifier (only in dark grass; dex-completion scaled).

import { CatchRateInputs, CatchRateResult } from "./types";
import { resolveBallGen3Plus } from "./balls";
import {
  autoCatchResult,
  critDexMultiplier,
  hpFactor,
  modernStatusMultiplier,
  resolveShakeCapture,
  shakeThresholdGen5,
} from "./shakeModel";

// Dark-grass G by species caught (4096-scaled values).
function darkGrassG(caught: number): number {
  if (caught > 600) return 1;
  if (caught >= 451) return 3686 / 4096;
  if (caught >= 301) return 3277 / 4096;
  if (caught >= 151) return 2867 / 4096;
  if (caught >= 31) return 0.5;
  return 1229 / 4096;
}

export function calcGen5(i: CatchRateInputs): CatchRateResult {
  const ball = resolveBallGen3Plus(5, i);
  if (ball.autoCatch) return autoCatchResult();

  const c = Math.max(
    1,
    Math.min(255, Math.floor(i.captureRate * ball.captureRateMul) + ball.captureRateAdd)
  );
  const g = i.darkGrass ? darkGrassG(i.dexCaughtBucket) : 1;
  const status = modernStatusMultiplier(i.status, 2.5, 1.5);
  const e = [100, 110, 120, 130][Math.max(0, Math.min(3, i.oPowerLevel))];

  const inner = Math.floor(hpFactor(i.maxHp, i.currentHp) * g * c * ball.ballBonus);
  const x = Math.max(1, Math.floor((inner * status * e) / 100));

  return resolveShakeCapture({
    x,
    threshold: shakeThresholdGen5,
    shakeChecks: 3,
    critMultiplier: critDexMultiplier(i.dexCaughtBucket),
  });
}
