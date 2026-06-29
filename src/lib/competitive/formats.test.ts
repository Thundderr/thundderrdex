import { describe, it, expect } from "vitest";
import {
  COMPETITIVE_FORMATS,
  COMPETITIVE_FORMAT_LIST,
  getCompetitiveFormat,
} from "./formats";

describe("competitive format registry", () => {
  it("targets Pokémon Champions (the retired SV VGC format is gone)", () => {
    expect(Object.keys(COMPETITIVE_FORMATS).sort()).toEqual(["champions-regma"]);
    expect(COMPETITIVE_FORMAT_LIST).toHaveLength(1);
  });

  it("encodes that Champions has no Tera", () => {
    expect(getCompetitiveFormat("champions-regma").hasTera).toBe(false);
  });

  it("maps to the correct Smogon format id", () => {
    expect(getCompetitiveFormat("champions-regma").smogonFormat).toBe("gen9championsvgc2026regma");
  });

  it("keeps each entry's id consistent with its registry key", () => {
    for (const [key, fmt] of Object.entries(COMPETITIVE_FORMATS)) {
      expect(fmt.id).toBe(key);
      expect(fmt.generation).toBe(9);
      expect(fmt.pikalyticsCode).toBe(fmt.smogonFormat);
    }
  });
});
