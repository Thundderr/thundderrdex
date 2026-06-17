// Gen 9 (Scarlet/Violet) capture math — the reference calculator.
//
//   X = (((3M-2H)*G*C*B*BP)/(3M)) * L * S * D              (real numbers)
//   Y = floor(65536 / (255/X)^(3/16)) ; 4 shakes ; normal P = (Y/65536)^4
//   BP = 0.8 per missing obedience badge
//   L  = low-level modifier (lv<=13 -> (36-2*lv)/10, else 1)
//   D  = capture power (1/1.1/1.25/2.0) * 2 if "caught off guard"
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

// Obedience badges required at a given level (SV).
function badgesNeeded(level: number): number {
  if (level <= 25) return 0;
  if (level <= 30) return 1;
  if (level <= 35) return 2;
  if (level <= 40) return 3;
  if (level <= 45) return 4;
  if (level <= 50) return 5;
  if (level <= 55) return 6;
  if (level <= 60) return 7;
  return 8;
}

export function calcGen9(i: CatchRateInputs): CatchRateResult {
  const ball = resolveBallGen3Plus(9, i);
  if (ball.autoCatch) return autoCatchResult();

  const c = Math.max(
    1,
    Math.min(255, i.captureRate * ball.captureRateMul + ball.captureRateAdd)
  );
  const missingBadges = Math.max(0, badgesNeeded(i.targetLevel) - i.badgeCount);
  const badgePenalty = Math.pow(0.8, missingBadges);
  const lowLevel = i.targetLevel <= 13 ? (36 - 2 * i.targetLevel) / 10 : 1;
  const status = modernStatusMultiplier(i.status, 2.5, 1.5);
  const power = [1, 1.1, 1.25, 2.0][Math.max(0, Math.min(3, i.capturePower))];
  const difficulty = power * (i.caughtOffGuard ? 2 : 1);

  const x =
    hpFactor(i.maxHp, i.currentHp) *
    c *
    ball.ballBonus *
    badgePenalty *
    lowLevel *
    status *
    difficulty;
  const charm = i.catchingCharm ? 2 : 1;

  return resolveShakeCapture({
    x,
    threshold: shakeThresholdGen6Plus,
    shakeChecks: 4,
    critMultiplier: critDexMultiplier(i.dexCaughtBucket) * charm,
  });
}
