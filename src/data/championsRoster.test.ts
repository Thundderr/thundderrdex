import { describe, it, expect } from "vitest";
import {
  isSpeciesInChampions,
  isFormInChampions,
  isMegaInChampions,
  CHAMPIONS_SPECIES_COUNT,
} from "./championsRoster";

describe("championsRoster", () => {
  it("reports the snapshot species count", () => {
    expect(CHAMPIONS_SPECIES_COUNT).toBe(209);
  });

  describe("isSpeciesInChampions", () => {
    it("includes a known-eligible species (Charizard #6)", () => {
      expect(isSpeciesInChampions(6)).toBe(true);
    });

    it("excludes a species not in the roster (Bulbasaur #1)", () => {
      expect(isSpeciesInChampions(1)).toBe(false);
    });
  });

  describe("isFormInChampions", () => {
    it("treats a bare id as the base form", () => {
      expect(isFormInChampions("80")).toBe(true); // base Slowbro
      expect(isFormInChampions("1")).toBe(false); // Bulbasaur, not in roster
    });

    it("matches an eligible regional form by its catchKey", () => {
      expect(isFormInChampions("80-galar")).toBe(true); // Galarian Slowbro
    });

    it("rejects a regional form that is not eligible", () => {
      expect(isFormInChampions("52-alola")).toBe(false); // Alolan Meowth
    });

    it("rejects a non-numeric key", () => {
      expect(isFormInChampions("nope")).toBe(false);
    });
  });

  describe("isMegaInChampions", () => {
    it("includes a species with an eligible Mega (Charizard #6)", () => {
      expect(isMegaInChampions(6)).toBe(true);
    });

    it("excludes a species without an eligible Mega (Pikachu #25)", () => {
      expect(isMegaInChampions(25)).toBe(false);
    });
  });
});
