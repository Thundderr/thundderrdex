import { describe, it, expect } from "vitest";
import {
  BALLS,
  ballsForGeneration,
  getBall,
  resolveBallGen3Plus,
} from "./balls";
import { CatchRateInputs, SupportedGen } from "./types";

// A neutral input set; each test overrides only the fields its ball cares about.
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

describe("BALLS catalog & availability", () => {
  it("defines unique ids", () => {
    const ids = BALLS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ballsForGeneration only includes balls at or after their minGen", () => {
    for (const gen of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      for (const b of ballsForGeneration(gen)) {
        expect(gen).toBeGreaterThanOrEqual(b.minGen);
      }
    }
  });

  it("Gen 1 has exactly the five basic balls", () => {
    expect(ballsForGeneration(1).map((b) => b.id)).toEqual([
      "poke",
      "great",
      "ultra",
      "master",
      "safari",
    ]);
  });

  it("apricorn balls (Fast/Level/Lure/Heavy/Love/Friend/Moon/Sport) arrive in Gen 2", () => {
    const apricorn = ["fast", "level", "lure", "heavy", "love", "friend", "moon", "sport"];
    const gen1 = new Set(ballsForGeneration(1).map((b) => b.id));
    const gen2 = new Set(ballsForGeneration(2).map((b) => b.id));
    for (const id of apricorn) {
      expect(gen1.has(id)).toBe(false);
      expect(gen2.has(id)).toBe(true);
    }
  });

  it("Net/Dive/Nest/Repeat/Timer arrive in Gen 3, not Gen 2", () => {
    const gen3Balls = ["net", "dive", "nest", "repeat", "timer"];
    const gen2 = new Set(ballsForGeneration(2).map((b) => b.id));
    const gen3 = new Set(ballsForGeneration(3).map((b) => b.id));
    for (const id of gen3Balls) {
      expect(gen2.has(id)).toBe(false);
      expect(gen3.has(id)).toBe(true);
    }
  });

  it("Dusk/Quick/Heal arrive in Gen 4, not before", () => {
    for (const id of ["dusk", "quick", "heal"]) {
      expect(ballsForGeneration(3).some((b) => b.id === id)).toBe(false);
      expect(ballsForGeneration(4).some((b) => b.id === id)).toBe(true);
    }
  });

  it("Dream Ball arrives in Gen 5", () => {
    expect(ballsForGeneration(4).some((b) => b.id === "dream")).toBe(false);
    expect(ballsForGeneration(5).some((b) => b.id === "dream")).toBe(true);
  });

  it("Beast Ball arrives in Gen 7, not Gen 6", () => {
    expect(ballsForGeneration(6).some((b) => b.id === "beast")).toBe(false);
    expect(ballsForGeneration(7).some((b) => b.id === "beast")).toBe(true);
  });

  it("availability is monotonic across generations", () => {
    for (let g = 1; g < 9; g++) {
      const cur = new Set(ballsForGeneration(g).map((b) => b.id));
      const next = ballsForGeneration(g + 1).map((b) => b.id);
      for (const id of cur) expect(next).toContain(id);
    }
  });
});

describe("getBall", () => {
  it("returns the matching definition", () => {
    expect(getBall("ultra")).toMatchObject({ id: "ultra", name: "Ultra Ball" });
  });
  it("returns undefined for an unknown id", () => {
    expect(getBall("nonexistent")).toBeUndefined();
  });
});

describe("resolveBallGen3Plus — auto-catch balls", () => {
  it("Master Ball always auto-catches across gens", () => {
    for (const gen of [3, 4, 5, 6, 7, 8, 9] as const) {
      expect(resolveBallGen3Plus(gen, inputs({ ballId: "master" })).autoCatch).toBe(true);
    }
  });

  it("Park Ball auto-catches", () => {
    expect(resolveBallGen3Plus(4, inputs({ ballId: "park" })).autoCatch).toBe(true);
  });

  it("Master Ball auto-catches even an Ultra Beast in Gen 7", () => {
    expect(
      resolveBallGen3Plus(7, inputs({ ballId: "master", isUltraBeast: true })).autoCatch
    ).toBe(true);
  });
});

describe("resolveBallGen3Plus — basic ball bonuses", () => {
  it("Poké Ball is x1", () => {
    expect(resolveBallGen3Plus(3, inputs({ ballId: "poke" })).ballBonus).toBe(1);
  });
  it("Great Ball is x1.5", () => {
    expect(resolveBallGen3Plus(3, inputs({ ballId: "great" })).ballBonus).toBe(1.5);
  });
  it("Ultra Ball is x2", () => {
    expect(resolveBallGen3Plus(3, inputs({ ballId: "ultra" })).ballBonus).toBe(2);
  });
  it("Safari & Sport balls are x1.5", () => {
    expect(resolveBallGen3Plus(3, inputs({ ballId: "safari" })).ballBonus).toBe(1.5);
    expect(resolveBallGen3Plus(3, inputs({ ballId: "sport" })).ballBonus).toBe(1.5);
  });
  it("Premier/Luxury/Heal/Friend default to x1", () => {
    for (const id of ["premier", "luxury", "heal", "friend"]) {
      expect(resolveBallGen3Plus(4, inputs({ ballId: id })).ballBonus).toBe(1);
    }
  });
});

describe("resolveBallGen3Plus — conditional bonuses", () => {
  it("Net Ball: x3 (gen<=6) / x3.5 (gen7+) on Water or Bug, else x1", () => {
    expect(resolveBallGen3Plus(3, inputs({ ballId: "net", types: ["water"] })).ballBonus).toBe(3);
    expect(resolveBallGen3Plus(6, inputs({ ballId: "net", types: ["bug"] })).ballBonus).toBe(3);
    expect(resolveBallGen3Plus(7, inputs({ ballId: "net", types: ["water"] })).ballBonus).toBe(3.5);
    expect(resolveBallGen3Plus(7, inputs({ ballId: "net", types: ["normal"] })).ballBonus).toBe(1);
  });

  it("Dive Ball: x3.5 in water, else x1", () => {
    expect(resolveBallGen3Plus(3, inputs({ ballId: "dive", inWater: true })).ballBonus).toBe(3.5);
    expect(resolveBallGen3Plus(3, inputs({ ballId: "dive", inWater: false })).ballBonus).toBe(1);
  });

  it("Nest Ball (gen<=4): (40-level)/10, floored at 1", () => {
    expect(resolveBallGen3Plus(3, inputs({ ballId: "nest", targetLevel: 10 })).ballBonus).toBe(3);
    expect(resolveBallGen3Plus(3, inputs({ ballId: "nest", targetLevel: 50 })).ballBonus).toBe(1);
  });

  it("Nest Ball (gen5+): (41-level)/10 clamped 1..4 for level<30, else 1", () => {
    expect(resolveBallGen3Plus(5, inputs({ ballId: "nest", targetLevel: 1 })).ballBonus).toBe(4);
    expect(resolveBallGen3Plus(5, inputs({ ballId: "nest", targetLevel: 11 })).ballBonus).toBe(3);
    expect(resolveBallGen3Plus(5, inputs({ ballId: "nest", targetLevel: 30 })).ballBonus).toBe(1);
  });

  it("Repeat Ball: x3 (gen<=6) / x3.5 (gen7+) if already caught, else x1", () => {
    expect(resolveBallGen3Plus(3, inputs({ ballId: "repeat", alreadyCaught: true })).ballBonus).toBe(3);
    expect(resolveBallGen3Plus(7, inputs({ ballId: "repeat", alreadyCaught: true })).ballBonus).toBe(3.5);
    expect(resolveBallGen3Plus(7, inputs({ ballId: "repeat", alreadyCaught: false })).ballBonus).toBe(1);
  });

  it("Timer Ball ramps with turns and caps at 4", () => {
    // Gen 3/4: min(4, (turns+10)/10)
    expect(resolveBallGen3Plus(3, inputs({ ballId: "timer", turnCount: 0 })).ballBonus).toBe(1);
    expect(resolveBallGen3Plus(3, inputs({ ballId: "timer", turnCount: 10 })).ballBonus).toBe(2);
    expect(resolveBallGen3Plus(3, inputs({ ballId: "timer", turnCount: 100 })).ballBonus).toBe(4);
    // Gen 8: min(4, 1 + turns*0.3)
    expect(resolveBallGen3Plus(8, inputs({ ballId: "timer", turnCount: 0 })).ballBonus).toBe(1);
    expect(resolveBallGen3Plus(8, inputs({ ballId: "timer", turnCount: 10 })).ballBonus).toBe(4);
    // Gen 9: min(4, 1 + turns*1229/4096)
    expect(resolveBallGen3Plus(9, inputs({ ballId: "timer", turnCount: 0 })).ballBonus).toBe(1);
    expect(resolveBallGen3Plus(9, inputs({ ballId: "timer", turnCount: 100 })).ballBonus).toBe(4);
  });

  it("Quick Ball: turn 1 only — x4 (gen<=4) / x5 (gen5+), else x1", () => {
    expect(resolveBallGen3Plus(4, inputs({ ballId: "quick", turnCount: 1 })).ballBonus).toBe(4);
    expect(resolveBallGen3Plus(9, inputs({ ballId: "quick", turnCount: 1 })).ballBonus).toBe(5);
    expect(resolveBallGen3Plus(9, inputs({ ballId: "quick", turnCount: 2 })).ballBonus).toBe(1);
  });

  it("Dusk Ball: x3.5 (gen<=6) / x3 (gen7+) at night/cave, else x1", () => {
    expect(resolveBallGen3Plus(4, inputs({ ballId: "dusk", nightOrCave: true })).ballBonus).toBe(3.5);
    expect(resolveBallGen3Plus(7, inputs({ ballId: "dusk", nightOrCave: true })).ballBonus).toBe(3);
    expect(resolveBallGen3Plus(7, inputs({ ballId: "dusk", nightOrCave: false })).ballBonus).toBe(1);
  });

  it("Fast Ball (gen3+): x4 if base Speed >= 100, else x1", () => {
    expect(resolveBallGen3Plus(4, inputs({ ballId: "fast", baseSpeed: 100 })).ballBonus).toBe(4);
    expect(resolveBallGen3Plus(4, inputs({ ballId: "fast", baseSpeed: 99 })).ballBonus).toBe(1);
  });

  it("Level Ball scales by your-level vs target-level thresholds", () => {
    const ball = (yl: number, tl: number) =>
      resolveBallGen3Plus(4, inputs({ ballId: "level", yourLevel: yl, targetLevel: tl })).ballBonus;
    expect(ball(100, 10)).toBe(8); // your/4 > target
    expect(ball(50, 20)).toBe(4); // your/2 > target
    expect(ball(30, 20)).toBe(2); // your > target
    expect(ball(20, 30)).toBe(1); // your <= target
  });

  it("Love Ball: x8 only for same species AND opposite gender", () => {
    const ok = inputs({
      ballId: "love",
      sameSpeciesAsYours: true,
      yourGender: "male",
      targetGender: "female",
    });
    expect(resolveBallGen3Plus(4, ok).ballBonus).toBe(8);
    // Same gender -> x1
    expect(
      resolveBallGen3Plus(4, { ...ok, targetGender: "male" }).ballBonus
    ).toBe(1);
    // Different species -> x1
    expect(
      resolveBallGen3Plus(4, { ...ok, sameSpeciesAsYours: false }).ballBonus
    ).toBe(1);
  });

  it("Lure Ball: bonus only in water, value differs by era (3/5/4)", () => {
    expect(resolveBallGen3Plus(4, inputs({ ballId: "lure", inWater: true })).ballBonus).toBe(3);
    expect(resolveBallGen3Plus(6, inputs({ ballId: "lure", inWater: true })).ballBonus).toBe(5);
    expect(resolveBallGen3Plus(8, inputs({ ballId: "lure", inWater: true })).ballBonus).toBe(4);
    expect(resolveBallGen3Plus(8, inputs({ ballId: "lure", inWater: false })).ballBonus).toBe(1);
  });

  it("Moon Ball: x4 on Moon-Stone evolvers, else x1", () => {
    expect(resolveBallGen3Plus(4, inputs({ ballId: "moon", evolvesByMoonStone: true })).ballBonus).toBe(4);
    expect(resolveBallGen3Plus(4, inputs({ ballId: "moon", evolvesByMoonStone: false })).ballBonus).toBe(1);
  });

  it("Dream Ball: x4 only Gen 8+ on a sleeping target", () => {
    expect(resolveBallGen3Plus(8, inputs({ ballId: "dream", status: "sleep" })).ballBonus).toBe(4);
    expect(resolveBallGen3Plus(8, inputs({ ballId: "dream", status: "none" })).ballBonus).toBe(1);
    // Gen 5/7 model gives no bonus here (gen >= 8 gate).
    expect(resolveBallGen3Plus(5, inputs({ ballId: "dream", status: "sleep" })).ballBonus).toBe(1);
  });
});

describe("resolveBallGen3Plus — Heavy Ball (additive)", () => {
  it("adds to capture rate by weight band (gen<=4)", () => {
    const add = (w: number) =>
      resolveBallGen3Plus(4, inputs({ ballId: "heavy", weightKg: w })).captureRateAdd;
    expect(add(500)).toBe(40); // >= 409.6
    expect(add(350)).toBe(30); // >= 307.2
    expect(add(250)).toBe(20); // >= 204.8
    expect(add(150)).toBe(0); // >= 102.4
    expect(add(10)).toBe(-20); // light
    // ballBonus stays neutral; Heavy works via captureRateAdd.
    expect(resolveBallGen3Plus(4, inputs({ ballId: "heavy", weightKg: 500 })).ballBonus).toBe(1);
  });

  it("uses the gen7+ weight bands", () => {
    const add = (w: number) =>
      resolveBallGen3Plus(7, inputs({ ballId: "heavy", weightKg: w })).captureRateAdd;
    expect(add(300)).toBe(30);
    expect(add(200)).toBe(20);
    expect(add(100)).toBe(0);
    expect(add(50)).toBe(-20);
  });
});

describe("resolveBallGen3Plus — Beast Ball & Ultra Beast penalty", () => {
  it("Beast Ball: x5 on an Ultra Beast (Gen 7+), tiny otherwise", () => {
    expect(
      resolveBallGen3Plus(7, inputs({ ballId: "beast", isUltraBeast: true })).ballBonus
    ).toBe(5);
    expect(
      resolveBallGen3Plus(7, inputs({ ballId: "beast", isUltraBeast: false })).ballBonus
    ).toBeCloseTo(410 / 4096, 6);
  });

  it("non-Beast ball on an Ultra Beast (Gen 7+) is crippled to 410/4096", () => {
    const eff = resolveBallGen3Plus(7, inputs({ ballId: "ultra", isUltraBeast: true }));
    expect(eff.ballBonus).toBeCloseTo(410 / 4096, 6);
  });

  it("Ultra-Beast penalty does not apply before Gen 7", () => {
    expect(
      resolveBallGen3Plus(5, inputs({ ballId: "ultra", isUltraBeast: true })).ballBonus
    ).toBe(2);
  });

  function autoCatchBeats(gen: SupportedGen) {
    return resolveBallGen3Plus(gen, inputs({ ballId: "beast", isUltraBeast: true }));
  }
  it("Beast Ball before Gen 7 gives no UB bonus (tiny multiplier)", () => {
    expect(autoCatchBeats(5).ballBonus).toBeCloseTo(410 / 4096, 6);
  });
});
