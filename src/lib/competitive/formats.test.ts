import { describe, it, expect } from "vitest";
import {
  COMPETITIVE_FORMATS,
  COMPETITIVE_FORMAT_LIST,
  getCompetitiveFormat,
} from "./formats";

describe("competitive format registry", () => {
  it("includes both target formats", () => {
    expect(Object.keys(COMPETITIVE_FORMATS).sort()).toEqual(["champions-regma", "vgc-regi"]);
    expect(COMPETITIVE_FORMAT_LIST).toHaveLength(2);
  });

  it("encodes the key divergence: VGC has Tera, Champions does not", () => {
    expect(getCompetitiveFormat("vgc-regi").hasTera).toBe(true);
    expect(getCompetitiveFormat("champions-regma").hasTera).toBe(false);
  });

  it("maps to the correct Smogon format ids", () => {
    expect(getCompetitiveFormat("vgc-regi").smogonFormat).toBe("gen9vgc2026regi");
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
