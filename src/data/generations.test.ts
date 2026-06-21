import { describe, it, expect } from "vitest";
import {
  GENERATIONS,
  getGenerationFromId,
  getGenerationFromVersionGroup,
} from "./generations";

describe("GENERATIONS list", () => {
  it("has 9 generations", () => {
    expect(GENERATIONS).toHaveLength(9);
  });

  it("ids run 1..9 in order", () => {
    expect(GENERATIONS.map((g) => g.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("pokemonRanges are contiguous and non-overlapping", () => {
    for (let i = 0; i < GENERATIONS.length; i++) {
      const g = GENERATIONS[i];
      expect(g.pokemonRange.start).toBeLessThanOrEqual(g.pokemonRange.end);
      if (i > 0) {
        const prev = GENERATIONS[i - 1];
        expect(g.pokemonRange.start).toBe(prev.pokemonRange.end + 1);
      }
    }
  });

  it("Gen 1 starts at 1 and Gen 9 ends at 1025", () => {
    expect(GENERATIONS[0].pokemonRange.start).toBe(1);
    expect(GENERATIONS[8].pokemonRange.end).toBe(1025);
  });

  it("each generation has a non-empty versionGroups list", () => {
    for (const g of GENERATIONS) {
      expect(g.versionGroups.length).toBeGreaterThan(0);
    }
  });

  it("version-group slugs are globally unique", () => {
    const all = GENERATIONS.flatMap((g) => g.versionGroups);
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("getGenerationFromId", () => {
  const cases: Array<[number, number]> = [
    [1, 1],
    [151, 1],
    [152, 2],
    [251, 2],
    [252, 3],
    [386, 3],
    [387, 4],
    [493, 4],
    [494, 5],
    [649, 5],
    [650, 6],
    [721, 6],
    [722, 7],
    [809, 7],
    [810, 8],
    [905, 8],
    [906, 9],
    [1025, 9],
  ];

  it.each(cases)("national id %i -> gen %i", (id, gen) => {
    expect(getGenerationFromId(id)).toBe(gen);
  });

  it("defaults to gen 9 for ids beyond the known range", () => {
    expect(getGenerationFromId(99999)).toBe(9);
  });

  it("returns gen 9 fallback for an id of 0 (out of all ranges)", () => {
    // 0 is below Gen 1's start, so find() returns undefined -> fallback 9
    expect(getGenerationFromId(0)).toBe(9);
  });
});

describe("getGenerationFromVersionGroup", () => {
  const cases: Array<[string, number]> = [
    ["red-blue", 1],
    ["yellow", 1],
    ["gold-silver", 2],
    ["crystal", 2],
    ["ruby-sapphire", 3],
    ["firered-leafgreen", 3],
    ["diamond-pearl", 4],
    ["black-white", 5],
    ["x-y", 6],
    ["sun-moon", 7],
    ["sword-shield", 8],
    ["legends-arceus", 8],
    ["scarlet-violet", 9],
  ];

  it.each(cases)("version group %s -> gen %i", (vg, gen) => {
    expect(getGenerationFromVersionGroup(vg)).toBe(gen);
  });

  it("returns 0 for an unknown version group", () => {
    expect(getGenerationFromVersionGroup("not-a-real-game")).toBe(0);
  });

  it("returns 0 for an empty string", () => {
    expect(getGenerationFromVersionGroup("")).toBe(0);
  });
});
