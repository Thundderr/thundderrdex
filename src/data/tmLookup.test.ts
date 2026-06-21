import { describe, it, expect } from "vitest";
import { TM_LOOKUP, getTMNumber } from "./tmLookup";

describe("TM_LOOKUP structure", () => {
  it("is non-empty", () => {
    expect(Object.keys(TM_LOOKUP).length).toBeGreaterThan(0);
  });

  it("move names are lowercase, hyphenated API slugs", () => {
    for (const move of Object.keys(TM_LOOKUP)) {
      expect(move).toBe(move.toLowerCase());
      expect(move).not.toMatch(/\s/);
    }
  });

  it("every generation key is a number 1-9", () => {
    for (const gens of Object.values(TM_LOOKUP)) {
      for (const gen of Object.keys(gens)) {
        const n = Number(gen);
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(9);
      }
    }
  });

  it("every value matches the TM/HM number format", () => {
    for (const gens of Object.values(TM_LOOKUP)) {
      for (const value of Object.values(gens)) {
        expect(value).toMatch(/^(TM|HM)\d{2,3}$/);
      }
    }
  });
});

describe("getTMNumber", () => {
  it("returns the correct TM for a known move/generation", () => {
    // flamethrower Gen 3 -> TM35
    expect(getTMNumber("flamethrower", 3)).toBe("TM35");
    // flamethrower Gen 9 -> TM125
    expect(getTMNumber("flamethrower", 9)).toBe("TM125");
  });

  it("returns HM numbers where applicable (surf Gen 1 -> HM03)", () => {
    expect(getTMNumber("surf", 1)).toBe("HM03");
  });

  it("returns the same move's different number across generations", () => {
    expect(getTMNumber("earthquake", 1)).toBe("TM26");
    expect(getTMNumber("earthquake", 9)).toBe("TM149");
  });

  it("returns null when the move exists but not in that generation", () => {
    // acid-spray only has a Gen 9 entry
    expect(getTMNumber("acid-spray", 1)).toBeNull();
  });

  it("returns null for an unknown move", () => {
    expect(getTMNumber("not-a-real-move", 9)).toBeNull();
  });

  it("returns null for an out-of-range generation", () => {
    expect(getTMNumber("flamethrower", 99)).toBeNull();
  });

  it("matches the underlying TM_LOOKUP table for every entry", () => {
    for (const [move, gens] of Object.entries(TM_LOOKUP)) {
      for (const [gen, value] of Object.entries(gens)) {
        expect(getTMNumber(move, Number(gen))).toBe(value);
      }
    }
  });
});
