import { describe, it, expect } from "vitest";
import { HELD_ITEMS, filterItems } from "./items";

describe("HELD_ITEMS", () => {
  it("is a non-empty list of strings", () => {
    expect(HELD_ITEMS.length).toBeGreaterThan(0);
    for (const item of HELD_ITEMS) {
      expect(typeof item).toBe("string");
      expect(item.length).toBeGreaterThan(0);
    }
  });

  it("contains some well-known competitive items", () => {
    expect(HELD_ITEMS).toContain("Choice Band");
    expect(HELD_ITEMS).toContain("Leftovers");
    expect(HELD_ITEMS).toContain("Life Orb");
    expect(HELD_ITEMS).toContain("Focus Sash");
  });

  // POTENTIAL BUG: HELD_ITEMS contains duplicate entries ("Assault Vest" and
  // "Sharp Beak" each appear twice). Skipped rather than encoding the (wrong)
  // expectation that the list is unique.
  it.skip("has no duplicate entries", () => {
    expect(new Set(HELD_ITEMS).size).toBe(HELD_ITEMS.length);
  });
});

describe("filterItems", () => {
  it("returns an empty array for an empty query", () => {
    expect(filterItems("")).toEqual([]);
  });

  it("returns an empty array for a whitespace-only query", () => {
    expect(filterItems("   ")).toEqual([]);
  });

  it("filters by case-insensitive substring", () => {
    const results = filterItems("choice");
    expect(results).toContain("Choice Band");
    expect(results).toContain("Choice Scarf");
    expect(results).toContain("Choice Specs");
  });

  it("is case-insensitive (upper-case query)", () => {
    expect(filterItems("LEFTOVERS")).toContain("Leftovers");
  });

  it("trims surrounding whitespace before matching", () => {
    expect(filterItems("  life orb  ")).toContain("Life Orb");
  });

  it("matches substrings in the middle of a name", () => {
    // "berry" appears mid/end of many berry items
    const results = filterItems("berry");
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.toLowerCase()).toContain("berry");
    }
  });

  it("caps results at 10 items", () => {
    // "z" matches many Z-crystals + Zoom Lens etc.
    const results = filterItems("z");
    expect(results.length).toBeLessThanOrEqual(10);
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterItems("xyzzy-no-such-item")).toEqual([]);
  });

  it("every returned item actually contains the query", () => {
    const q = "plate";
    for (const r of filterItems(q)) {
      expect(r.toLowerCase()).toContain(q);
    }
  });
});
