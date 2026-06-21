import { describe, it, expect } from "vitest";
import {
  calculateDualTypeEffectiveness,
  getTypeEffectivenessMultiplier,
  DualTypeEffectiveness,
} from "@/lib/utils/typeEffectiveness";
import { PokemonTypeName } from "@/types/pokemon";

// --- getTypeEffectivenessMultiplier (single attacker vs single defender) ----

describe("getTypeEffectivenessMultiplier", () => {
  it("returns 2 for a super-effective matchup (Water -> Fire)", () => {
    expect(getTypeEffectivenessMultiplier("water", "fire")).toBe(2);
  });

  it("returns 0.5 for a not-very-effective matchup (Fire -> Water)", () => {
    expect(getTypeEffectivenessMultiplier("fire", "water")).toBe(0.5);
  });

  it("returns 0 for an immunity (Normal -> Ghost)", () => {
    expect(getTypeEffectivenessMultiplier("normal", "ghost")).toBe(0);
  });

  it("returns 0 for Ground -> Flying immunity", () => {
    expect(getTypeEffectivenessMultiplier("ground", "flying")).toBe(0);
  });

  it("returns 0 for Electric -> Ground immunity", () => {
    expect(getTypeEffectivenessMultiplier("electric", "ground")).toBe(0);
  });

  it("returns 1 for a neutral matchup (Normal -> Normal)", () => {
    expect(getTypeEffectivenessMultiplier("normal", "normal")).toBe(1);
  });

  it("returns 1 for Fire -> Electric (no relationship in chart)", () => {
    expect(getTypeEffectivenessMultiplier("fire", "electric")).toBe(1);
  });

  it("handles Fairy -> Dragon as super-effective (modern type)", () => {
    expect(getTypeEffectivenessMultiplier("fairy", "dragon")).toBe(2);
  });

  it("handles Dragon -> Fairy as immune (modern type)", () => {
    expect(getTypeEffectivenessMultiplier("dragon", "fairy")).toBe(0);
  });

  it("is consistent across the full chart for a sampling of stat-relevant pairs", () => {
    expect(getTypeEffectivenessMultiplier("fighting", "normal")).toBe(2);
    expect(getTypeEffectivenessMultiplier("psychic", "steel")).toBe(0.5);
    expect(getTypeEffectivenessMultiplier("fighting", "ghost")).toBe(0);
  });
});

// --- calculateDualTypeEffectiveness -----------------------------------------

// Helper: look up the resulting multiplier for one attacking type against a
// defender by reading the categorized output.
function multiplierFor(
  result: DualTypeEffectiveness,
  attacking: PokemonTypeName
): number {
  if (result.immunities.includes(attacking)) return 0;
  const weak = result.weaknesses.find((m) => m.type === attacking);
  if (weak) return weak.multiplier;
  const resist = result.resistances.find((m) => m.type === attacking);
  if (resist) return resist.multiplier;
  return 1; // neutral (omitted from all three buckets)
}

describe("calculateDualTypeEffectiveness", () => {
  describe("single-type defenders", () => {
    it("lists Fire's weaknesses, resistances, and (lack of) immunities", () => {
      const result = calculateDualTypeEffectiveness(["fire"]);
      expect(result.types).toEqual(["fire"]);
      // Fire is weak to water/ground/rock at 2x each.
      expect(multiplierFor(result, "water")).toBe(2);
      expect(multiplierFor(result, "ground")).toBe(2);
      expect(multiplierFor(result, "rock")).toBe(2);
      // Fire resists fire/grass/ice/bug/steel/fairy at 0.5x.
      expect(multiplierFor(result, "grass")).toBe(0.5);
      expect(multiplierFor(result, "steel")).toBe(0.5);
      expect(multiplierFor(result, "fairy")).toBe(0.5);
      // No immunities.
      expect(result.immunities).toEqual([]);
    });

    it("captures a single immunity (Ghost is immune to Normal and Fighting)", () => {
      const result = calculateDualTypeEffectiveness(["ghost"]);
      expect(result.immunities).toContain("normal");
      expect(result.immunities).toContain("fighting");
      expect(multiplierFor(result, "normal")).toBe(0);
      expect(multiplierFor(result, "fighting")).toBe(0);
    });

    it("omits neutral matchups from all buckets", () => {
      const result = calculateDualTypeEffectiveness(["normal"]);
      // Normal is only weak to fighting and immune to ghost; everything else neutral.
      expect(multiplierFor(result, "fighting")).toBe(2);
      expect(result.immunities).toEqual(["ghost"]);
      // A neutral attacker like water is in no bucket.
      expect(multiplierFor(result, "water")).toBe(1);
      expect(result.weaknesses.find((m) => m.type === "water")).toBeUndefined();
      expect(result.resistances.find((m) => m.type === "water")).toBeUndefined();
    });
  });

  describe("dual-type defenders", () => {
    it("produces a 4x weakness (Fire/Flying vs Rock)", () => {
      // Charizard: fire weakTo rock (2) AND flying weakTo rock (2) = 4x.
      const result = calculateDualTypeEffectiveness(["fire", "flying"]);
      expect(multiplierFor(result, "rock")).toBe(4);
    });

    it("produces a 0.25x resistance (Water/Grass vs Water)", () => {
      // Ludicolo: water resists water (0.5) AND grass resists water (0.5) = 0.25x.
      const result = calculateDualTypeEffectiveness(["water", "grass"]);
      expect(multiplierFor(result, "water")).toBe(0.25);
    });

    it("produces a 2x weakness when only one type is weak (Fire/Flying vs Water)", () => {
      // water hits fire 2x, neutral vs flying -> overall 2x.
      const result = calculateDualTypeEffectiveness(["fire", "flying"]);
      expect(multiplierFor(result, "water")).toBe(2);
    });

    it("cancels weakness and resistance to neutral (Water/Grass vs Grass)", () => {
      // Grass attacker: grass resists grass (0.5) but water is weak to grass (2) -> 1x.
      const result = calculateDualTypeEffectiveness(["water", "grass"]);
      expect(multiplierFor(result, "grass")).toBe(1);
    });

    it("yields an immunity when either type is immune (Normal/Flying vs Ghost & Ground)", () => {
      // Normal immune to Ghost (0), Flying immune to Ground (0).
      const result = calculateDualTypeEffectiveness(["normal", "flying"]);
      expect(multiplierFor(result, "ghost")).toBe(0);
      expect(multiplierFor(result, "ground")).toBe(0);
      expect(result.immunities).toContain("ghost");
      expect(result.immunities).toContain("ground");
    });

    it("immunity dominates even if the other type would be weak (Ground/Flying vs Electric)", () => {
      // Ground is weak to electric? No — ground is immune to electric (0).
      // Flying is weak to electric (2). Immunity (0) multiplies to 0 overall.
      const result = calculateDualTypeEffectiveness(["ground", "flying"]);
      expect(multiplierFor(result, "electric")).toBe(0);
      expect(result.immunities).toContain("electric");
    });
  });

  describe("output structure & sorting", () => {
    it("sorts weaknesses 4x before 2x", () => {
      const result = calculateDualTypeEffectiveness(["fire", "flying"]);
      const mults = result.weaknesses.map((m) => m.multiplier);
      const sorted = [...mults].sort((a, b) => b - a);
      expect(mults).toEqual(sorted);
      // The 4x (rock) must come first.
      expect(result.weaknesses[0].multiplier).toBe(4);
    });

    it("sorts resistances 0.25x before 0.5x", () => {
      // Water/Grass resists water at 0.25x plus several types at 0.5x.
      const result = calculateDualTypeEffectiveness(["water", "grass"]);
      const mults = result.resistances.map((m) => m.multiplier);
      const sorted = [...mults].sort((a, b) => a - b);
      expect(mults).toEqual(sorted);
      expect(result.resistances[0].multiplier).toBe(0.25);
    });

    it("never places a neutral (1x) entry in any bucket", () => {
      const result = calculateDualTypeEffectiveness(["water", "grass"]);
      for (const m of result.weaknesses) expect(m.multiplier).toBeGreaterThanOrEqual(2);
      for (const m of result.resistances) expect(m.multiplier).toBeLessThan(1);
    });

    it("preserves the passed-in types array on the result", () => {
      const result = calculateDualTypeEffectiveness(["dragon", "ground"]);
      expect(result.types).toEqual(["dragon", "ground"]);
    });
  });

  describe("generation handling", () => {
    it("defaults to generation 9 (Fairy exists, Steel does not resist Ghost/Dark)", () => {
      // Fairy must appear as a possible matchup against Dragon (immune in Gen 9).
      const dragon = calculateDualTypeEffectiveness(["dragon"]);
      expect(dragon.weaknesses.find((m) => m.type === "fairy")).toBeDefined();
    });

    it("excludes Fairy/Steel/Dark relationships in a Gen 1 calculation", () => {
      // Gen 1 has no Fairy/Steel/Dark types, so they never appear as matchups.
      const result = calculateDualTypeEffectiveness(["dragon"], 1);
      const allTypes = [
        ...result.weaknesses.map((m) => m.type),
        ...result.resistances.map((m) => m.type),
        ...result.immunities,
      ];
      expect(allTypes).not.toContain("fairy");
      expect(allTypes).not.toContain("steel");
      expect(allTypes).not.toContain("dark");
    });

    it("reflects the Gen 2-5 Steel-resists-Ghost rule (Ghost vs Steel = 0.5x)", () => {
      const result = calculateDualTypeEffectiveness(["steel"], 3);
      // Steel resisted Ghost in Gen 3, so Ghost attacker is a resistance.
      expect(multiplierFor(result, "ghost")).toBe(0.5);
    });

    it("reflects the modern rule where Steel no longer resists Ghost (Gen 9)", () => {
      const result = calculateDualTypeEffectiveness(["steel"], 9);
      // In Gen 9, Steel does not resist Ghost -> neutral, not a resistance.
      expect(multiplierFor(result, "ghost")).toBe(1);
    });
  });
});
