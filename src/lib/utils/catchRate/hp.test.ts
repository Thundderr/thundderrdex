import { describe, it, expect } from "vitest";
import { estimateMaxHp, resolveCurrentHp } from "./hp";
import { hpFactor } from "./shakeModel";

// Reference HP formula: floor(((2*base + iv) * level)/100) + level + 10,
// with iv = 15 for gens 1-2 and 31 for gen 3+.
const refHp = (base: number, level: number, iv: number) =>
  Math.floor(((2 * base + iv) * level) / 100) + level + 10;

describe("estimateMaxHp", () => {
  it("uses DV cap of 15 for Gen 1-2", () => {
    expect(estimateMaxHp(45, 50, 1)).toBe(refHp(45, 50, 15));
    expect(estimateMaxHp(45, 50, 2)).toBe(refHp(45, 50, 15));
  });

  it("uses IV cap of 31 for Gen 3+", () => {
    expect(estimateMaxHp(45, 50, 3)).toBe(refHp(45, 50, 31));
    expect(estimateMaxHp(45, 50, 9)).toBe(refHp(45, 50, 31));
  });

  it("matches a hand-computed value (base 45, level 50, Gen 3)", () => {
    // floor((2*45 + 31)*50/100) + 50 + 10 = floor(60.5) + 60 = 60 + 60 = 120
    expect(estimateMaxHp(45, 50, 3)).toBe(120);
  });

  it("matches a hand-computed value (base 100, level 100, Gen 9)", () => {
    // floor((200 + 31)*100/100) + 100 + 10 = 231 + 110 = 341
    expect(estimateMaxHp(100, 100, 9)).toBe(341);
  });

  it("Gen 3+ HP >= Gen 1-2 HP for the same base/level (higher IV cap)", () => {
    expect(estimateMaxHp(60, 50, 3)).toBeGreaterThanOrEqual(estimateMaxHp(60, 50, 1));
  });

  it("increases with level and with base HP", () => {
    expect(estimateMaxHp(45, 100, 3)).toBeGreaterThan(estimateMaxHp(45, 50, 3));
    expect(estimateMaxHp(120, 50, 3)).toBeGreaterThan(estimateMaxHp(45, 50, 3));
  });

  it("returns an integer", () => {
    expect(Number.isInteger(estimateMaxHp(73, 37, 5))).toBe(true);
  });
});

describe("resolveCurrentHp", () => {
  it("returns full HP at 100%", () => {
    expect(resolveCurrentHp(150, 100, false)).toBe(150);
  });

  it("returns a percentage of max HP, rounded", () => {
    expect(resolveCurrentHp(150, 50, false)).toBe(75);
    expect(resolveCurrentHp(200, 25, false)).toBe(50);
    // Rounding: 33% of 150 = 49.5 -> 50
    expect(resolveCurrentHp(150, 33, false)).toBe(50);
  });

  it("the exactlyOneHp override forces 1 HP regardless of percentage", () => {
    expect(resolveCurrentHp(150, 100, true)).toBe(1);
    expect(resolveCurrentHp(999, 50, true)).toBe(1);
  });

  it("never returns below 1 HP", () => {
    // 1% of 50 = 0.5 -> rounds to 1 (and the floor at 1 holds anyway).
    expect(resolveCurrentHp(50, 1, false)).toBeGreaterThanOrEqual(1);
    expect(resolveCurrentHp(10, 1, false)).toBe(1);
  });

  it("clamps a percentage above 100 to full HP", () => {
    expect(resolveCurrentHp(150, 250, false)).toBe(150);
  });

  it("clamps a percentage at or below 0 up to the 1% floor", () => {
    // hpPercent is clamped to [1,100], so 0% behaves like 1%.
    expect(resolveCurrentHp(150, 0, false)).toBe(resolveCurrentHp(150, 1, false));
    expect(resolveCurrentHp(150, -50, false)).toBe(resolveCurrentHp(150, 1, false));
  });
});

describe("HP modifier factor at full vs low HP", () => {
  it("the catch HP factor is exactly 1/3 at full HP", () => {
    const max = estimateMaxHp(45, 50, 3);
    const cur = resolveCurrentHp(max, 100, false);
    expect(hpFactor(max, cur)).toBeCloseTo(1 / 3, 9);
  });

  it("the catch HP factor is near 1 at 1 HP", () => {
    const max = estimateMaxHp(45, 50, 3);
    const cur = resolveCurrentHp(max, 100, true); // 1 HP
    expect(hpFactor(max, cur)).toBeGreaterThan(0.99);
  });

  it("lower current HP yields a larger HP factor", () => {
    const max = estimateMaxHp(45, 50, 3);
    const full = hpFactor(max, resolveCurrentHp(max, 100, false));
    const half = hpFactor(max, resolveCurrentHp(max, 50, false));
    const oneHp = hpFactor(max, resolveCurrentHp(max, 100, true));
    expect(half).toBeGreaterThan(full);
    expect(oneHp).toBeGreaterThan(half);
  });
});
