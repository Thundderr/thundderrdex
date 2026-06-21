import { describe, it, expect } from "vitest";
import {
  REGIONAL_DEXES,
  getRegionalDexGroups,
  getRegionalDexById,
} from "./pokedexes";

describe("REGIONAL_DEXES", () => {
  it("is non-empty", () => {
    expect(REGIONAL_DEXES.length).toBeGreaterThan(0);
  });

  it("has unique ids", () => {
    const ids = REGIONAL_DEXES.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique slug names", () => {
    const names = REGIONAL_DEXES.map((d) => d.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every dex has id, name, displayName and group populated", () => {
    for (const d of REGIONAL_DEXES) {
      expect(typeof d.id).toBe("number");
      expect(d.name.length).toBeGreaterThan(0);
      expect(d.displayName.length).toBeGreaterThan(0);
      expect(d.group.length).toBeGreaterThan(0);
    }
  });
});

describe("getRegionalDexById", () => {
  it("finds a known dex (kitakami #32)", () => {
    const dex = getRegionalDexById(32);
    expect(dex?.name).toBe("kitakami");
    expect(dex?.group).toBe("Paldea");
  });

  it("finds the Kanto RBY dex (#2)", () => {
    expect(getRegionalDexById(2)?.name).toBe("kanto");
  });

  it("returns undefined for an unknown id", () => {
    expect(getRegionalDexById(99999)).toBeUndefined();
  });

  it("returns undefined for a negative id", () => {
    expect(getRegionalDexById(-1)).toBeUndefined();
  });
});

describe("getRegionalDexGroups", () => {
  it("returns groups whose flattened dexes match REGIONAL_DEXES exactly", () => {
    const groups = getRegionalDexGroups();
    const flat = groups.flatMap((g) => g.dexes);
    expect(flat).toHaveLength(REGIONAL_DEXES.length);
    expect(flat.map((d) => d.id)).toEqual(REGIONAL_DEXES.map((d) => d.id));
  });

  it("produces no duplicate region headings", () => {
    const regions = getRegionalDexGroups().map((g) => g.region);
    expect(new Set(regions).size).toBe(regions.length);
  });

  it("each group's dexes all share that group's region", () => {
    for (const g of getRegionalDexGroups()) {
      for (const d of g.dexes) {
        expect(d.group).toBe(g.region);
      }
    }
  });

  it("preserves first-seen region ordering from REGIONAL_DEXES", () => {
    const groups = getRegionalDexGroups();
    const seen: string[] = [];
    for (const d of REGIONAL_DEXES) {
      if (!seen.includes(d.group)) seen.push(d.group);
    }
    expect(groups.map((g) => g.region)).toEqual(seen);
  });

  it("includes the expected region headings", () => {
    const regions = getRegionalDexGroups().map((g) => g.region);
    for (const r of [
      "Kanto",
      "Johto",
      "Hoenn",
      "Sinnoh",
      "Unova",
      "Kalos",
      "Alola",
      "Galar",
      "Hisui",
      "Paldea",
    ]) {
      expect(regions).toContain(r);
    }
  });
});
