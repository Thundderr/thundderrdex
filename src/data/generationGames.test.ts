import { describe, it, expect } from "vitest";
import { GENERATION_CONFIG } from "./generationGames";

describe("GENERATION_CONFIG", () => {
  it("covers generations 1–9 in order", () => {
    expect(GENERATION_CONFIG.map((c) => c.gen)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("gives every generation at least one letter with char, color, and title", () => {
    for (const config of GENERATION_CONFIG) {
      expect(config.letters.length).toBeGreaterThan(0);
      for (const letter of config.letters) {
        expect(letter.char.length).toBeGreaterThan(0);
        expect(letter.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(letter.title.length).toBeGreaterThan(0);
      }
    }
  });
});
