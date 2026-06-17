// Public entry point for the catch-rate engine: dispatch to the correct
// generation strategy and re-export the catalog/types the UI needs.

import { CatchRateInputs, CatchRateResult, SupportedGen } from "./types";
import { calcGen1 } from "./gen1";
import { calcGen2 } from "./gen2";
import { calcGen34 } from "./gen3_4";
import { calcGen5 } from "./gen5";
import { calcGen67 } from "./gen6_7";
import { calcGen8 } from "./gen8";
import { calcGen9 } from "./gen9";

export function calculateCatchRate(
  gen: SupportedGen,
  inputs: CatchRateInputs
): CatchRateResult {
  switch (gen) {
    case 1:
      return calcGen1(inputs);
    case 2:
      return calcGen2(inputs);
    case 3:
    case 4:
      return calcGen34(inputs, gen);
    case 5:
      return calcGen5(inputs);
    case 6:
    case 7:
      return calcGen67(inputs, gen);
    case 8:
      return calcGen8(inputs);
    case 9:
      return calcGen9(inputs);
  }
}

export { ballsForGeneration, getBall, BALLS } from "./balls";
export { estimateMaxHp, resolveCurrentHp } from "./hp";
export { isUltraBeastSpecies, evolvesByMoonStone, isGen2FastBallSpecies } from "./data";
export type {
  CatchRateInputs,
  CatchRateResult,
  CatchStatus,
  Gender,
  SupportedGen,
} from "./types";
