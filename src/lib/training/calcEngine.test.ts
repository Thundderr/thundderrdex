import { describe, it, expect } from "vitest";
import { koBucket, KO_BUCKETS, moveName, toCalcSpecies } from "./calcEngine";

describe("koBucket", () => {
  it("treats a guaranteed full-HP min roll as an OHKO", () => {
    expect(koBucket(100)).toBe("OHKO");
    expect(koBucket(150)).toBe("OHKO"); // overkill still OHKOs
  });

  it("buckets by guaranteed (worst-roll) number of hits", () => {
    expect(koBucket(60)).toBe("2HKO"); // ceil(100/60) = 2
    expect(koBucket(50)).toBe("2HKO");
    expect(koBucket(40)).toBe("3HKO"); // ceil(100/40) = 3
    expect(koBucket(34)).toBe("3HKO");
    expect(koBucket(33)).toBe("4HKO+"); // ceil(100/33) = 4
    expect(koBucket(25)).toBe("4HKO+");
  });

  it("treats zero or negative damage as 4HKO+", () => {
    expect(koBucket(0)).toBe("4HKO+");
    expect(koBucket(-5)).toBe("4HKO+");
  });

  it("exposes exactly four ordered buckets", () => {
    expect(KO_BUCKETS).toEqual(["OHKO", "2HKO", "3HKO", "4HKO+"]);
  });
});

describe("moveName", () => {
  it("returns a plain string move unchanged", () => {
    expect(moveName("Close Combat")).toBe("Close Combat");
  });

  it("takes the first option of a slashed move list", () => {
    expect(moveName(["Earthquake", "Stone Edge"])).toBe("Earthquake");
  });
});

describe("toCalcSpecies (Smogon display → PokéAPI slug)", () => {
  it("maps gendered and base forms to fetchable PokéAPI slugs", () => {
    expect(toCalcSpecies("Basculegion-F")).toBe("basculegion-female");
    expect(toCalcSpecies("Urshifu")).toBe("urshifu-single-strike");
    expect(toCalcSpecies("Incineroar")).toBe("incineroar");
    expect(toCalcSpecies("Tapu Koko")).toBe("tapu-koko");
  });
});
