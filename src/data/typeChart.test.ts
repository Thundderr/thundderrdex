import { describe, it, expect } from "vitest";
import {
  ALL_TYPES,
  TYPE_COLORS,
  TYPE_CHART,
  TYPES_BY_GENERATION,
  TYPE_CHART_OVERRIDES,
  getTypeChartForGeneration,
} from "./typeChart";

describe("ALL_TYPES", () => {
  it("contains the 18 modern Pokemon types", () => {
    expect(ALL_TYPES).toHaveLength(18);
  });

  it("has no duplicates", () => {
    expect(new Set(ALL_TYPES).size).toBe(ALL_TYPES.length);
  });

  it("includes the modern additions (dark, steel, fairy)", () => {
    expect(ALL_TYPES).toContain("dark");
    expect(ALL_TYPES).toContain("steel");
    expect(ALL_TYPES).toContain("fairy");
  });
});

describe("TYPE_COLORS", () => {
  it("has a color for every type in ALL_TYPES", () => {
    for (const type of ALL_TYPES) {
      expect(TYPE_COLORS[type]).toBeDefined();
    }
  });

  it("every color is a valid 6-digit hex string", () => {
    for (const type of ALL_TYPES) {
      expect(TYPE_COLORS[type]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("has no extra color keys beyond ALL_TYPES", () => {
    expect(Object.keys(TYPE_COLORS).sort()).toEqual([...ALL_TYPES].sort());
  });
});

describe("TYPES_BY_GENERATION", () => {
  it("Gen 1 has 15 types and excludes dark/steel/fairy", () => {
    const g1 = TYPES_BY_GENERATION[1];
    expect(g1).toHaveLength(15);
    expect(g1).not.toContain("dark");
    expect(g1).not.toContain("steel");
    expect(g1).not.toContain("fairy");
  });

  it("Gen 2-5 add dark and steel (17 types) but not fairy", () => {
    for (const gen of [2, 3, 4, 5]) {
      const types = TYPES_BY_GENERATION[gen];
      expect(types).toHaveLength(17);
      expect(types).toContain("dark");
      expect(types).toContain("steel");
      expect(types).not.toContain("fairy");
    }
  });

  it("Gen 6+ add fairy for a full 18 types", () => {
    for (const gen of [6, 7, 8, 9]) {
      const types = TYPES_BY_GENERATION[gen];
      expect(types).toHaveLength(18);
      expect(types).toContain("fairy");
    }
  });

  it("covers generations 1 through 9", () => {
    for (let g = 1; g <= 9; g++) {
      expect(TYPES_BY_GENERATION[g]).toBeDefined();
    }
  });
});

describe("TYPE_CHART structure", () => {
  it("has an entry for every type", () => {
    for (const type of ALL_TYPES) {
      expect(TYPE_CHART[type]).toBeDefined();
      expect(TYPE_CHART[type].attacking).toBeDefined();
      expect(TYPE_CHART[type].defending).toBeDefined();
    }
  });

  it("only references known type names in attacking/defending lists", () => {
    const valid = new Set(ALL_TYPES);
    for (const type of ALL_TYPES) {
      const e = TYPE_CHART[type];
      const all = [
        ...e.attacking.superEffective,
        ...e.attacking.notVeryEffective,
        ...e.attacking.immune,
        ...e.defending.weakTo,
        ...e.defending.resistantTo,
        ...e.defending.immuneTo,
      ];
      for (const t of all) {
        expect(valid.has(t)).toBe(true);
      }
    }
  });
});

describe("TYPE_CHART known matchups (Gen 6+)", () => {
  it("Water is super effective vs Fire", () => {
    expect(TYPE_CHART.water.attacking.superEffective).toContain("fire");
  });

  it("Fire is super effective vs Grass", () => {
    expect(TYPE_CHART.fire.attacking.superEffective).toContain("grass");
  });

  it("Grass is super effective vs Water", () => {
    expect(TYPE_CHART.grass.attacking.superEffective).toContain("water");
  });

  it("Normal cannot hit Ghost (immune)", () => {
    expect(TYPE_CHART.normal.attacking.immune).toContain("ghost");
  });

  it("Ghost is immune to Normal defensively", () => {
    expect(TYPE_CHART.ghost.defending.immuneTo).toContain("normal");
  });

  it("Ground is immune to Electric", () => {
    expect(TYPE_CHART.ground.defending.immuneTo).toContain("electric");
    expect(TYPE_CHART.electric.attacking.immune).toContain("ground");
  });

  it("Dragon is immune to Fairy attacks (Fairy added Gen 6)", () => {
    expect(TYPE_CHART.dragon.attacking.immune).toContain("fairy");
  });

  it("Steel resists a large number of types including fairy", () => {
    expect(TYPE_CHART.steel.defending.resistantTo).toContain("fairy");
    expect(TYPE_CHART.steel.defending.resistantTo.length).toBeGreaterThan(8);
  });

  it("attacking super-effective implies the defender is weak to it (Water/Fire)", () => {
    expect(TYPE_CHART.water.attacking.superEffective).toContain("fire");
    expect(TYPE_CHART.fire.defending.weakTo).toContain("water");
  });
});

describe("getTypeChartForGeneration", () => {
  it("Gen 1 chart omits dark/steel/fairy entirely", () => {
    const chart = getTypeChartForGeneration(1);
    expect(chart.dark).toBeUndefined();
    expect(chart.steel).toBeUndefined();
    expect(chart.fairy).toBeUndefined();
    expect(Object.keys(chart)).toHaveLength(15);
  });

  it("Gen 1 chart never references types that don't exist that gen", () => {
    const chart = getTypeChartForGeneration(1);
    const valid = new Set(TYPES_BY_GENERATION[1]);
    for (const type of Object.keys(chart)) {
      const e = chart[type as keyof typeof chart];
      const refs = [
        ...e.attacking.superEffective,
        ...e.attacking.notVeryEffective,
        ...e.attacking.immune,
        ...e.defending.weakTo,
        ...e.defending.resistantTo,
        ...e.defending.immuneTo,
      ];
      for (const t of refs) {
        expect(valid.has(t)).toBe(true);
      }
    }
  });

  it("applies the Gen 1 Ghost-vs-Psychic bug (Psychic immune to Ghost)", () => {
    const chart = getTypeChartForGeneration(1);
    // Gen 1 override: Ghost is immune against normal AND psychic
    expect(chart.ghost.attacking.immune).toContain("psychic");
    expect(chart.psychic.defending.immuneTo).toContain("ghost");
  });

  it("applies the Gen 1 Poison-super-effective-vs-Bug override", () => {
    const chart = getTypeChartForGeneration(1);
    expect(chart.poison.attacking.superEffective).toContain("bug");
    expect(chart.bug.defending.weakTo).toContain("poison");
  });

  it("Gen 2 Steel resists Ghost and Dark (later removed)", () => {
    const chart = getTypeChartForGeneration(2);
    expect(chart.steel.defending.resistantTo).toContain("ghost");
    expect(chart.steel.defending.resistantTo).toContain("dark");
  });

  it("Gen 6 Steel no longer resists Ghost or Dark", () => {
    const chart = getTypeChartForGeneration(6);
    expect(chart.steel.defending.resistantTo).not.toContain("ghost");
    expect(chart.steel.defending.resistantTo).not.toContain("dark");
  });

  it("Gen 9 chart contains all 18 types", () => {
    const chart = getTypeChartForGeneration(9);
    expect(Object.keys(chart)).toHaveLength(18);
  });

  it("falls back to a full chart for an unknown generation number", () => {
    const chart = getTypeChartForGeneration(999);
    expect(Object.keys(chart)).toHaveLength(18);
  });
});

describe("TYPE_CHART_OVERRIDES", () => {
  it("has overrides for gens 1-5 and none for gen 6+", () => {
    expect(TYPE_CHART_OVERRIDES[1]).toBeDefined();
    for (const g of [2, 3, 4, 5]) {
      expect(TYPE_CHART_OVERRIDES[g]).toBeDefined();
    }
    expect(TYPE_CHART_OVERRIDES[6]).toBeUndefined();
  });
});
