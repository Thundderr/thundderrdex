import { describe, it, expect } from "vitest";
import {
  shakeThresholdGen34,
  shakeThresholdGen5,
  shakeThresholdGen6Plus,
  critDexMultiplier,
  resolveShakeCapture,
  autoCatchResult,
  modernStatusMultiplier,
  hpFactor,
} from "./shakeModel";

describe("shake-threshold formulas", () => {
  it("Gen 3/4: floor(1048560 / sqrt(sqrt(16711680/X)))", () => {
    expect(shakeThresholdGen34(15)).toBe(32274);
    expect(shakeThresholdGen34(255)).toBe(
      Math.floor(1048560 / Math.sqrt(Math.sqrt(16711680 / 255)))
    );
  });

  it("Gen 5: floor(65536 / sqrt(sqrt(255/X)))", () => {
    expect(shakeThresholdGen5(15)).toBe(
      Math.floor(65536 / Math.sqrt(Math.sqrt(255 / 15)))
    );
    expect(shakeThresholdGen5(255)).toBe(65536);
  });

  it("Gen 6+: floor(65536 / (255/X)^(3/16))", () => {
    expect(shakeThresholdGen6Plus(15)).toBe(
      Math.floor(65536 / Math.pow(255 / 15, 3 / 16))
    );
    // At X = 255 the ratio is 1, so the threshold caps at 65536.
    expect(shakeThresholdGen6Plus(255)).toBe(65536);
  });

  it("threshold is monotonically increasing in X (all formulas)", () => {
    for (const f of [shakeThresholdGen34, shakeThresholdGen5, shakeThresholdGen6Plus]) {
      let prev = -Infinity;
      for (const x of [1, 5, 15, 50, 100, 200, 254]) {
        const y = f(x);
        expect(y).toBeGreaterThanOrEqual(prev);
        prev = y;
      }
    }
  });
});

describe("critDexMultiplier", () => {
  it("steps by species-caught bucket", () => {
    expect(critDexMultiplier(0)).toBe(0);
    expect(critDexMultiplier(30)).toBe(0);
    expect(critDexMultiplier(31)).toBe(0.5);
    expect(critDexMultiplier(150)).toBe(0.5);
    expect(critDexMultiplier(151)).toBe(1.0);
    expect(critDexMultiplier(300)).toBe(1.0);
    expect(critDexMultiplier(301)).toBe(1.5);
    expect(critDexMultiplier(450)).toBe(1.5);
    expect(critDexMultiplier(451)).toBe(2.0);
    expect(critDexMultiplier(600)).toBe(2.0);
    expect(critDexMultiplier(601)).toBe(2.5);
  });

  it("is non-decreasing", () => {
    let prev = -1;
    for (const c of [0, 31, 151, 301, 451, 601, 1000]) {
      expect(critDexMultiplier(c)).toBeGreaterThanOrEqual(prev);
      prev = critDexMultiplier(c);
    }
  });
});

describe("resolveShakeCapture", () => {
  it("X <= 0 is impossible to catch", () => {
    const r = resolveShakeCapture({ x: 0, threshold: shakeThresholdGen34, shakeChecks: 4 });
    expect(r.catchChance).toBe(0);
    expect(r.guaranteed).toBe(false);
    expect(r.expectedBalls).toBe(Infinity);
    expect(r.criticalChance).toBe(0);
    expect(r.detail.shakeThreshold).toBe(0);
  });

  it("X >= 255 is a guaranteed catch", () => {
    const r = resolveShakeCapture({ x: 255, threshold: shakeThresholdGen6Plus, shakeChecks: 4 });
    expect(r.guaranteed).toBe(true);
    expect(r.catchChance).toBe(1);
    expect(r.expectedBalls).toBe(1);
    expect(r.criticalChance).toBe(0);
    // Guaranteed result records the threshold at X = 255.
    expect(r.detail.shakeThreshold).toBe(shakeThresholdGen6Plus(255));
  });

  it("X over 255 is also guaranteed", () => {
    const r = resolveShakeCapture({ x: 9999, threshold: shakeThresholdGen6Plus, shakeChecks: 4 });
    expect(r.guaranteed).toBe(true);
    expect(r.catchChance).toBe(1);
  });

  it("normal chance is (Y/65536)^shakeChecks without crit", () => {
    const x = 15;
    const y = shakeThresholdGen34(x);
    const per = Math.min(1, y / 65536);
    const r = resolveShakeCapture({ x, threshold: shakeThresholdGen34, shakeChecks: 4 });
    expect(r.catchChance).toBeCloseTo(Math.pow(per, 4), 9);
    expect(r.criticalChance).toBe(0);
    expect(r.detail.modifiedCatchRate).toBe(x);
    expect(r.detail.shakeThreshold).toBe(y);
    expect(r.expectedBalls).toBeCloseTo(1 / r.catchChance, 6);
  });

  it("3-shake gens (Gen 5 style) cube the per-check probability", () => {
    const x = 15;
    const per = Math.min(1, shakeThresholdGen5(x) / 65536);
    const r = resolveShakeCapture({ x, threshold: shakeThresholdGen5, shakeChecks: 3 });
    expect(r.catchChance).toBeCloseTo(Math.pow(per, 3), 9);
  });

  it("higher X => higher catch chance (monotonic)", () => {
    let prev = -1;
    for (const x of [1, 10, 50, 120, 200, 254]) {
      const c = resolveShakeCapture({ x, threshold: shakeThresholdGen6Plus, shakeChecks: 4 }).catchChance;
      expect(c).toBeGreaterThan(prev);
      prev = c;
    }
  });

  it("a very low X yields a very low probability", () => {
    const r = resolveShakeCapture({ x: 1, threshold: shakeThresholdGen6Plus, shakeChecks: 4 });
    expect(r.catchChance).toBeGreaterThan(0);
    expect(r.catchChance).toBeLessThan(0.05);
  });

  it("critical capture: P = min(1, floor(min(255,X)*mult/6)/256) and blends in one check", () => {
    const x = 200;
    const mult = 2.5;
    const cc = Math.floor((Math.min(255, x) * mult) / 6); // 83
    const expectedCrit = Math.min(1, cc / 256);
    const per = Math.min(1, shakeThresholdGen6Plus(x) / 65536);
    const normal = Math.pow(per, 4);
    const r = resolveShakeCapture({
      x,
      threshold: shakeThresholdGen6Plus,
      shakeChecks: 4,
      critMultiplier: mult,
    });
    expect(r.criticalChance).toBeCloseTo(expectedCrit, 9);
    expect(r.catchChance).toBeCloseTo(
      expectedCrit * per + (1 - expectedCrit) * normal,
      9
    );
  });

  it("crit caps X at 255 inside the crit formula", () => {
    const r = resolveShakeCapture({
      x: 1000,
      threshold: shakeThresholdGen6Plus,
      shakeChecks: 4,
      critMultiplier: 2.5,
    });
    // X >= 255 short-circuits to guaranteed before crit math runs.
    expect(r.guaranteed).toBe(true);
  });

  it("zero crit multiplier still produces a crit probability of 0 but is reported", () => {
    const r = resolveShakeCapture({
      x: 100,
      threshold: shakeThresholdGen6Plus,
      shakeChecks: 4,
      critMultiplier: 0,
    });
    expect(r.criticalChance).toBe(0);
    // With crit defined-but-zero the catch chance equals the plain normal chance.
    const per = Math.min(1, shakeThresholdGen6Plus(100) / 65536);
    expect(r.catchChance).toBeCloseTo(Math.pow(per, 4), 9);
  });

  it("passes notes through to detail", () => {
    const r = resolveShakeCapture({
      x: 50,
      threshold: shakeThresholdGen34,
      shakeChecks: 4,
      notes: ["hello"],
    });
    expect(r.detail.notes).toEqual(["hello"]);
  });
});

describe("autoCatchResult", () => {
  it("always catches with infinite modified rate and null threshold", () => {
    const r = autoCatchResult();
    expect(r).toMatchObject({
      catchChance: 1,
      expectedBalls: 1,
      criticalChance: 0,
      guaranteed: true,
    });
    expect(r.detail.modifiedCatchRate).toBe(Infinity);
    expect(r.detail.shakeThreshold).toBeNull();
    expect(r.detail.shakeChecks).toBe(0);
  });
});

describe("modernStatusMultiplier", () => {
  it("returns the sleep/freeze multiplier for sleep & freeze", () => {
    expect(modernStatusMultiplier("sleep", 2.5, 1.5)).toBe(2.5);
    expect(modernStatusMultiplier("freeze", 2.5, 1.5)).toBe(2.5);
  });
  it("returns the other-ailment multiplier for poison/burn/paralysis", () => {
    expect(modernStatusMultiplier("poison", 2.5, 1.5)).toBe(1.5);
    expect(modernStatusMultiplier("burn", 2.5, 1.5)).toBe(1.5);
    expect(modernStatusMultiplier("paralysis", 2.5, 1.5)).toBe(1.5);
  });
  it("returns 1 for no status", () => {
    expect(modernStatusMultiplier("none", 2.5, 1.5)).toBe(1);
  });
  it("honors gen-specific multiplier values (Gen 3/4 sleep=2)", () => {
    expect(modernStatusMultiplier("sleep", 2, 1.5)).toBe(2);
  });
});

describe("hpFactor (3M - 2H) / 3M", () => {
  it("equals 1/3 at full HP", () => {
    expect(hpFactor(150, 150)).toBeCloseTo(1 / 3, 9);
  });
  it("approaches 1 at minimal HP", () => {
    expect(hpFactor(150, 1)).toBeCloseTo((450 - 2) / 450, 9);
    expect(hpFactor(150, 1)).toBeGreaterThan(hpFactor(150, 150));
  });
  it("decreases as current HP increases", () => {
    expect(hpFactor(150, 30)).toBeGreaterThan(hpFactor(150, 75));
    expect(hpFactor(150, 75)).toBeGreaterThan(hpFactor(150, 150));
  });
});
