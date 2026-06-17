import { describe, it, expect } from "vitest";
import { calculateCatchRate } from "./index";
import { ballsForGeneration } from "./balls";
import { CatchRateInputs } from "./types";

// Baseline: capture rate 45, full HP (currentHp === maxHp so the HP factor is
// exactly 1/3), Poké Ball, no status, neutral everything.
function inputs(over: Partial<CatchRateInputs> = {}): CatchRateInputs {
  return {
    captureRate: 45,
    maxHp: 150,
    currentHp: 150,
    baseSpeed: 50,
    weightKg: 10,
    types: ["normal"],
    targetGender: "male",
    isUltraBeast: false,
    evolvesByMoonStone: false,
    isGen2FastBallSpecies: false,
    sameSpeciesAsYours: false,
    ballId: "poke",
    status: "none",
    turnCount: 1,
    targetLevel: 50,
    inWater: false,
    nightOrCave: false,
    alreadyCaught: false,
    yourLevel: 50,
    yourGender: "male",
    capturePower: 0,
    oPowerLevel: 0,
    caughtOffGuard: false,
    catchingCharm: false,
    badgeCount: 8,
    hasEighthBadge: true,
    dexCaughtBucket: 0,
    darkGrass: false,
    ...over,
  };
}

describe("hand-computed reference values (rate 45, full HP, Poké Ball)", () => {
  it("Gen 1", () => {
    // F = floor(floor(150*255/12)/floor(150/4)) = floor(3187/37) = 86
    // P = 0 + min(46,256)/256 * 87/256
    const r = calculateCatchRate(1, inputs());
    expect(r.catchChance).toBeCloseTo((46 / 256) * (87 / 256), 5);
  });

  it("Gen 2", () => {
    // X = floor(1/3 * 45) = 15 ; P = 16/256
    const r = calculateCatchRate(2, inputs());
    expect(r.catchChance).toBeCloseTo(16 / 256, 6);
  });

  it("Gen 3/4", () => {
    // X = 15 ; Y = floor(1048560/sqrt(sqrt(16711680/15))) = 32274
    const r = calculateCatchRate(3, inputs());
    expect(r.detail.modifiedCatchRate).toBe(15);
    expect(r.detail.shakeThreshold).toBe(32274);
    expect(r.catchChance).toBeCloseTo(Math.pow(32274 / 65536, 4), 6);
    // Gen 4 shares the same formula for a standard ball.
    expect(calculateCatchRate(4, inputs()).catchChance).toBeCloseTo(r.catchChance, 9);
  });

  it("Gen 9", () => {
    // X = 1/3 * 45 = 15 ; Y = floor(65536/(255/15)^(3/16))
    const r = calculateCatchRate(9, inputs());
    expect(r.detail.modifiedCatchRate).toBeCloseTo(15, 9);
    const y = Math.floor(65536 / Math.pow(255 / 15, 3 / 16));
    expect(r.detail.shakeThreshold).toBe(y);
    expect(r.catchChance).toBeCloseTo(Math.pow(y / 65536, 4), 6);
  });
});

describe("ball conditions", () => {
  it("Master Ball always catches", () => {
    for (const gen of [1, 2, 3, 5, 7, 9] as const) {
      expect(calculateCatchRate(gen, inputs({ ballId: "master" })).guaranteed).toBe(true);
    }
  });

  it("Net Ball boosts Water/Bug targets only", () => {
    const onWater = calculateCatchRate(9, inputs({ ballId: "net", types: ["water"] }));
    const onNormal = calculateCatchRate(9, inputs({ ballId: "net", types: ["normal"] }));
    expect(onWater.catchChance).toBeGreaterThan(onNormal.catchChance);
  });

  it("Quick Ball only helps on turn 1", () => {
    const t1 = calculateCatchRate(9, inputs({ ballId: "quick", turnCount: 1 }));
    const t5 = calculateCatchRate(9, inputs({ ballId: "quick", turnCount: 5 }));
    expect(t1.catchChance).toBeGreaterThan(t5.catchChance);
  });

  it("Beast Ball: x5 on Ultra Beasts, ~0.1 otherwise", () => {
    const ub = calculateCatchRate(9, inputs({ ballId: "beast", isUltraBeast: true }));
    const notUb = calculateCatchRate(9, inputs({ ballId: "beast", isUltraBeast: false }));
    expect(ub.catchChance).toBeGreaterThan(notUb.catchChance);
    // Non-Beast ball on a UB is penalized vs. on a normal Pokémon.
    const ultraOnUb = calculateCatchRate(9, inputs({ ballId: "ultra", isUltraBeast: true }));
    const ultraOnNormal = calculateCatchRate(9, inputs({ ballId: "ultra" }));
    expect(ultraOnUb.catchChance).toBeLessThan(ultraOnNormal.catchChance);
  });
});

describe("conditions", () => {
  it("lower HP and status raise the catch chance (Gen 9)", () => {
    const full = calculateCatchRate(9, inputs());
    const lowHp = calculateCatchRate(9, inputs({ currentHp: 1 }));
    const asleep = calculateCatchRate(9, inputs({ currentHp: 1, status: "sleep" }));
    expect(lowHp.catchChance).toBeGreaterThan(full.catchChance);
    expect(asleep.catchChance).toBeGreaterThan(lowHp.catchChance);
  });

  it("a high catch rate at 1 HP is guaranteed (X >= 255)", () => {
    const r = calculateCatchRate(9, inputs({ captureRate: 255, currentHp: 1, ballId: "ultra" }));
    expect(r.guaranteed).toBe(true);
    expect(r.catchChance).toBe(1);
  });

  it("critical capture only appears Gen 5+ with dex progress", () => {
    expect(calculateCatchRate(3, inputs({ dexCaughtBucket: 700 })).criticalChance).toBe(0);
    expect(
      calculateCatchRate(9, inputs({ dexCaughtBucket: 700, currentHp: 1 })).criticalChance
    ).toBeGreaterThan(0);
  });
});

describe("ball availability", () => {
  it("expands over generations", () => {
    expect(ballsForGeneration(1).map((b) => b.id)).toEqual([
      "poke",
      "great",
      "ultra",
      "master",
      "safari",
    ]);
    expect(ballsForGeneration(2).some((b) => b.id === "fast")).toBe(true);
    expect(ballsForGeneration(6).some((b) => b.id === "beast")).toBe(false);
    expect(ballsForGeneration(7).some((b) => b.id === "beast")).toBe(true);
  });
});
