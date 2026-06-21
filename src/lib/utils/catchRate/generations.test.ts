import { describe, it, expect } from "vitest";
import { calcGen1 } from "./gen1";
import { calcGen2 } from "./gen2";
import { calcGen34 } from "./gen3_4";
import { calcGen5 } from "./gen5";
import { calcGen67 } from "./gen6_7";
import { calcGen8 } from "./gen8";
import { calcGen9 } from "./gen9";
import { CatchRateInputs } from "./types";

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

const hpFactor = (M: number, H: number) => (3 * M - 2 * H) / (3 * M);

describe("Gen 1 — RBY special-case algorithm (no shake formula)", () => {
  it("reports no shake threshold and zero crit", () => {
    const r = calcGen1(inputs());
    expect(r.detail.shakeThreshold).toBeNull();
    expect(r.detail.shakeChecks).toBe(0);
    expect(r.criticalChance).toBe(0);
  });

  it("Master Ball auto-catches", () => {
    const r = calcGen1(inputs({ ballId: "master" }));
    expect(r.guaranteed).toBe(true);
    expect(r.catchChance).toBe(1);
  });

  it("matches the closed-form P for the Poké Ball at full HP", () => {
    // F = floor(floor(150*255/12)/floor(150/4)) = floor(3187/37) = 86
    // P = 0/256 + min(46, 256)/256 * (87/256)
    const r = calcGen1(inputs());
    expect(r.catchChance).toBeCloseTo((46 / 256) * (87 / 256), 9);
    expect(r.detail.notes).toContain("HP factor F=86");
  });

  it("status (sleep/freeze threshold 25) raises catch chance over poison (12)", () => {
    const sleep = calcGen1(inputs({ status: "sleep" }));
    const poison = calcGen1(inputs({ status: "poison" }));
    const none = calcGen1(inputs({ status: "none" }));
    expect(sleep.catchChance).toBeGreaterThan(poison.catchChance);
    expect(poison.catchChance).toBeGreaterThan(none.catchChance);
  });

  it("Great Ball uses a different HP divisor (G=8) and range (Bv=201)", () => {
    const r = calcGen1(inputs({ ballId: "great" }));
    expect(r.detail.notes).toContain("ball range Bv=201");
  });

  it("Ultra Ball uses Bv=151", () => {
    const r = calcGen1(inputs({ ballId: "ultra" }));
    expect(r.detail.notes).toContain("ball range Bv=151");
  });

  it("lower HP improves catch chance", () => {
    const full = calcGen1(inputs());
    const low = calcGen1(inputs({ currentHp: 4 }));
    expect(low.catchChance).toBeGreaterThan(full.catchChance);
  });
});

describe("Gen 2 — GSC capture rate (single check, no shake)", () => {
  it("no shake threshold / crit", () => {
    const r = calcGen2(inputs());
    expect(r.detail.shakeThreshold).toBeNull();
    expect(r.criticalChance).toBe(0);
  });

  it("P = (X+1)/256 with X = floor(hpFactor*C) at full HP", () => {
    // X = floor(1/3 * 45) = 15 ; P = 16/256
    const r = calcGen2(inputs());
    expect(r.detail.modifiedCatchRate).toBe(15);
    expect(r.catchChance).toBeCloseTo(16 / 256, 9);
  });

  it("sleep/freeze add +10 to X; poison/burn/paralysis are inert (GSC bug)", () => {
    const sleep = calcGen2(inputs({ status: "sleep" }));
    const poison = calcGen2(inputs({ status: "poison" }));
    const none = calcGen2(inputs({ status: "none" }));
    expect(sleep.detail.modifiedCatchRate).toBe(25); // 15 + 10
    expect(poison.detail.modifiedCatchRate).toBe(15); // unchanged
    expect(none.detail.modifiedCatchRate).toBe(15);
  });

  it("Level Ball bypasses the HP calculation entirely (X = C)", () => {
    // Level Ball with your/4 > target -> mul 8, capped at 255 -> C=255 but
    // here use neutral levels so mul=1; X should equal C (45) not floor(hp*C).
    const r = calcGen2(inputs({ ballId: "level", yourLevel: 50, targetLevel: 50 }));
    expect(r.detail.modifiedCatchRate).toBe(45);
    expect(r.catchChance).toBeCloseTo(46 / 256, 9);
  });

  it("Fast Ball only boosts the GSC fast-ball species", () => {
    const onFlagged = calcGen2(inputs({ ballId: "fast", isGen2FastBallSpecies: true }));
    const onOther = calcGen2(inputs({ ballId: "fast", isGen2FastBallSpecies: false }));
    expect(onFlagged.catchChance).toBeGreaterThan(onOther.catchChance);
  });

  it("X is clamped to at most 255 and a near-max rate gives a near-certain catch", () => {
    // The HP factor (3M-2H)/3M is strictly < 1, so floor(C*factor) tops out at
    // 254 for the standard inputs here; X is clamped to [1,255] regardless.
    const r = calcGen2(inputs({ captureRate: 255, ballId: "ultra", currentHp: 1 }));
    expect(r.detail.modifiedCatchRate).toBeLessThanOrEqual(255);
    expect(r.detail.modifiedCatchRate).toBeGreaterThanOrEqual(253);
    expect(r.catchChance).toBeGreaterThan(0.99);
  });

  it("Master Ball auto-catches", () => {
    expect(calcGen2(inputs({ ballId: "master" })).guaranteed).toBe(true);
  });
});

describe("Gen 3/4 — shared shake formula", () => {
  it("X = floor(hpFactor * C * B * status); 4 shakes", () => {
    const r = calcGen34(inputs(), 3);
    expect(r.detail.modifiedCatchRate).toBe(15);
    expect(r.detail.shakeChecks).toBe(4);
    expect(r.detail.shakeThreshold).toBe(32274);
  });

  it("Gen 3 and Gen 4 produce the same result for a standard ball", () => {
    expect(calcGen34(inputs(), 4).catchChance).toBeCloseTo(
      calcGen34(inputs(), 3).catchChance,
      9
    );
  });

  it("sleep/freeze multiplier is 2 in Gen 3/4 (not 2.5)", () => {
    // inner = floor(1/3*45)=15; X = floor(15*2)=30
    const r = calcGen34(inputs({ status: "sleep" }), 3);
    expect(r.detail.modifiedCatchRate).toBe(30);
  });

  it("no critical capture in Gen 3/4", () => {
    expect(calcGen34(inputs({ dexCaughtBucket: 700 }), 4).criticalChance).toBe(0);
  });
});

describe("Gen 5 — dark grass, 3 shakes, critical capture", () => {
  it("uses 3 shakes and the Gen 5 threshold", () => {
    const r = calcGen5(inputs());
    expect(r.detail.shakeChecks).toBe(3);
  });

  it("sleep/freeze multiplier is 2.5", () => {
    // inner = floor(1/3*45)=15; X = floor(15*2.5)=37 (E=100)
    const r = calcGen5(inputs({ status: "sleep" }));
    expect(r.detail.modifiedCatchRate).toBe(37);
  });

  it("dark grass lowers the modified catch rate for low dex completion", () => {
    // With dexCaughtBucket 0, G = 1229/4096 (~0.3), so X is much lower.
    const dark = calcGen5(inputs({ darkGrass: true, dexCaughtBucket: 0 }));
    const normal = calcGen5(inputs({ darkGrass: false }));
    expect(dark.detail.modifiedCatchRate).toBeLessThan(normal.detail.modifiedCatchRate);
    expect(dark.detail.modifiedCatchRate).toBe(4); // floor(1/3 * 1229/4096 * 45)
  });

  it("dark-grass penalty disappears once enough species are caught (>600 -> G=1)", () => {
    const darkHighDex = calcGen5(inputs({ darkGrass: true, dexCaughtBucket: 700 }));
    const noDark = calcGen5(inputs({ darkGrass: false, dexCaughtBucket: 700 }));
    expect(darkHighDex.detail.modifiedCatchRate).toBe(noDark.detail.modifiedCatchRate);
  });

  it("O-Power (Entralink) E multiplier raises X", () => {
    const e0 = calcGen5(inputs({ oPowerLevel: 0, currentHp: 1 }));
    const e3 = calcGen5(inputs({ oPowerLevel: 3, currentHp: 1 }));
    expect(e3.detail.modifiedCatchRate).toBeGreaterThan(e0.detail.modifiedCatchRate);
  });

  it("critical capture appears Gen 5 with enough dex progress", () => {
    expect(calcGen5(inputs({ dexCaughtBucket: 0 })).criticalChance).toBe(0);
    expect(
      calcGen5(inputs({ dexCaughtBucket: 700, currentHp: 1, captureRate: 200 })).criticalChance
    ).toBeGreaterThan(0);
  });
});

describe("Gen 6/7 — real-number X, 4 shakes, Catching Charm", () => {
  it("O-Power scales X in Gen 6 (1/1.5/2/2.5)", () => {
    const x = (lvl: number) =>
      calcGen67(inputs({ oPowerLevel: lvl, currentHp: 1 }), 6).detail.modifiedCatchRate;
    expect(x(1)).toBeCloseTo(x(0) * 1.5, 4);
    expect(x(2)).toBeCloseTo(x(0) * 2, 4);
    expect(x(3)).toBeCloseTo(x(0) * 2.5, 4);
  });

  it("Gen 7 Roto Catch only applies at level 3 (=2.5)", () => {
    const x = (lvl: number) =>
      calcGen67(inputs({ oPowerLevel: lvl, currentHp: 1 }), 7).detail.modifiedCatchRate;
    expect(x(2)).toBeCloseTo(x(0), 6); // no effect below lvl3
    expect(x(3)).toBeCloseTo(x(0) * 2.5, 4);
  });

  it("Catching Charm doubles critical chance in Gen 7 but not Gen 6", () => {
    const g7charm = calcGen67(
      inputs({ catchingCharm: true, dexCaughtBucket: 700, currentHp: 1 }),
      7
    );
    const g7none = calcGen67(
      inputs({ catchingCharm: false, dexCaughtBucket: 700, currentHp: 1 }),
      7
    );
    expect(g7charm.criticalChance).toBeGreaterThan(g7none.criticalChance);

    const g6charm = calcGen67(
      inputs({ catchingCharm: true, dexCaughtBucket: 700, currentHp: 1 }),
      6
    );
    const g6none = calcGen67(
      inputs({ catchingCharm: false, dexCaughtBucket: 700, currentHp: 1 }),
      6
    );
    expect(g6charm.criticalChance).toBeCloseTo(g6none.criticalChance, 9);
  });
});

describe("Gen 8 — low-level modifier and badge-difficulty penalty", () => {
  it("low-level (<21) modifier raises X: (30-lv)/10", () => {
    const lv10 = calcGen8(inputs({ targetLevel: 10, currentHp: 1 }));
    const lv50 = calcGen8(inputs({ targetLevel: 50, currentHp: 1 }));
    expect(lv10.detail.modifiedCatchRate).toBeGreaterThan(lv50.detail.modifiedCatchRate);
    // lv10 factor is x2 vs lv50 baseline x1.
    expect(lv10.detail.modifiedCatchRate).toBeCloseTo(lv50.detail.modifiedCatchRate * 2, 4);
  });

  it("difficulty penalty (x0.1) applies without 8th badge when underleveled", () => {
    const penalised = calcGen8(
      inputs({ hasEighthBadge: false, yourLevel: 10, targetLevel: 50, currentHp: 1 })
    );
    const normal = calcGen8(
      inputs({ hasEighthBadge: true, yourLevel: 10, targetLevel: 50, currentHp: 1 })
    );
    expect(penalised.detail.modifiedCatchRate).toBeCloseTo(
      normal.detail.modifiedCatchRate * 0.1,
      4
    );
  });

  it("no penalty when you out-level the target even without the 8th badge", () => {
    const r = calcGen8(
      inputs({ hasEighthBadge: false, yourLevel: 80, targetLevel: 50, currentHp: 1 })
    );
    const baseline = calcGen8(
      inputs({ hasEighthBadge: true, yourLevel: 80, targetLevel: 50, currentHp: 1 })
    );
    expect(r.detail.modifiedCatchRate).toBeCloseTo(baseline.detail.modifiedCatchRate, 6);
  });
});

describe("Gen 9 — Capture Power, obedience badges, low-level rule", () => {
  it("Capture Power D multiplier raises X (1/1.1/1.25/2.0)", () => {
    const x = (p: number) =>
      calcGen9(inputs({ capturePower: p, currentHp: 1 })).detail.modifiedCatchRate;
    expect(x(1)).toBeCloseTo(x(0) * 1.1, 4);
    expect(x(2)).toBeCloseTo(x(0) * 1.25, 4);
    expect(x(3)).toBeCloseTo(x(0) * 2.0, 4);
  });

  it("'caught off guard' doubles the capture-power difficulty term", () => {
    const off = calcGen9(inputs({ caughtOffGuard: true, currentHp: 1 }));
    const on = calcGen9(inputs({ caughtOffGuard: false, currentHp: 1 }));
    expect(off.detail.modifiedCatchRate).toBeCloseTo(on.detail.modifiedCatchRate * 2, 4);
  });

  it("missing obedience badges apply a 0.8^missing penalty", () => {
    // Level 50 needs 5 badges. badgeCount 0 -> missing 5 -> 0.8^5.
    const noBadges = calcGen9(inputs({ targetLevel: 50, badgeCount: 0, currentHp: 1 }));
    const allBadges = calcGen9(inputs({ targetLevel: 50, badgeCount: 8, currentHp: 1 }));
    expect(noBadges.detail.modifiedCatchRate).toBeCloseTo(
      allBadges.detail.modifiedCatchRate * Math.pow(0.8, 5),
      4
    );
  });

  it("no badge penalty for a low-level target that needs no badges", () => {
    // Level <= 25 needs 0 badges regardless of badge count.
    const r = calcGen9(inputs({ targetLevel: 20, badgeCount: 0, currentHp: 1 }));
    const baseline = calcGen9(inputs({ targetLevel: 20, badgeCount: 8, currentHp: 1 }));
    expect(r.detail.modifiedCatchRate).toBeCloseTo(baseline.detail.modifiedCatchRate, 4);
  });

  it("Gen 9 low-level rule uses (36-2*lv)/10 for lv<=13", () => {
    // lv 10 -> 1.6; lv 20 -> 1. So lv10 X ~ 1.6x lv20 baseline (badges 0 at both).
    const lv10 = calcGen9(inputs({ targetLevel: 10, badgeCount: 8, currentHp: 1 }));
    const lv20 = calcGen9(inputs({ targetLevel: 20, badgeCount: 8, currentHp: 1 }));
    expect(lv10.detail.modifiedCatchRate).toBeCloseTo(lv20.detail.modifiedCatchRate * 1.6, 3);
  });

  it("hand-computed baseline X equals hpFactor*C at full HP, neutral mods", () => {
    const r = calcGen9(inputs());
    expect(r.detail.modifiedCatchRate).toBeCloseTo(hpFactor(150, 150) * 45, 9);
  });
});
