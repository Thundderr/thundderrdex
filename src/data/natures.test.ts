import { describe, it, expect } from "vitest";
import {
  NATURES,
  Nature,
  StatKey,
  getNatureModifier,
  getNatureByName,
  STAT_DISPLAY_NAMES,
} from "./natures";

const ALL_STATS: StatKey[] = [
  "attack",
  "defense",
  "specialAttack",
  "specialDefense",
  "speed",
];

describe("NATURES list", () => {
  it("has exactly 25 entries", () => {
    expect(NATURES).toHaveLength(25);
  });

  it("has exactly 5 neutral natures (no stat change)", () => {
    const neutral = NATURES.filter(
      (n) => n.increasedStat === null && n.decreasedStat === null
    );
    expect(neutral).toHaveLength(5);
    expect(neutral.map((n) => n.name)).toEqual([
      "Hardy",
      "Docile",
      "Serious",
      "Bashful",
      "Quirky",
    ]);
  });

  it("has exactly 20 non-neutral natures", () => {
    const nonNeutral = NATURES.filter(
      (n) => n.increasedStat !== null || n.decreasedStat !== null
    );
    expect(nonNeutral).toHaveLength(20);
  });

  it("has unique nature names", () => {
    const names = NATURES.map((n) => n.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("only references valid stat keys", () => {
    for (const n of NATURES) {
      if (n.increasedStat !== null) {
        expect(ALL_STATS).toContain(n.increasedStat);
      }
      if (n.decreasedStat !== null) {
        expect(ALL_STATS).toContain(n.decreasedStat);
      }
    }
  });
});

describe("nature +/- consistency", () => {
  it("every nature either has both a +/- stat or neither", () => {
    for (const n of NATURES) {
      const hasInc = n.increasedStat !== null;
      const hasDec = n.decreasedStat !== null;
      expect(hasInc).toBe(hasDec);
    }
  });

  it("non-neutral natures increase and decrease different stats", () => {
    for (const n of NATURES) {
      if (n.increasedStat !== null && n.decreasedStat !== null) {
        expect(n.increasedStat).not.toBe(n.decreasedStat);
      }
    }
  });

  it("there are exactly 4 increasing natures per stat (20 / 5)", () => {
    for (const stat of ALL_STATS) {
      const count = NATURES.filter((n) => n.increasedStat === stat).length;
      expect(count).toBe(4);
    }
  });

  it("there are exactly 4 decreasing natures per stat (20 / 5)", () => {
    for (const stat of ALL_STATS) {
      const count = NATURES.filter((n) => n.decreasedStat === stat).length;
      expect(count).toBe(4);
    }
  });

  const known: Array<[string, StatKey, StatKey]> = [
    ["Adamant", "attack", "specialAttack"],
    ["Modest", "specialAttack", "attack"],
    ["Timid", "speed", "attack"],
    ["Jolly", "speed", "specialAttack"],
    ["Bold", "defense", "attack"],
    ["Calm", "specialDefense", "attack"],
    ["Brave", "attack", "speed"],
  ];
  it.each(known)("%s = +%s / -%s", (name, up, down) => {
    const nature = NATURES.find((n) => n.name === name)!;
    expect(nature).toBeDefined();
    expect(nature.increasedStat).toBe(up);
    expect(nature.decreasedStat).toBe(down);
  });
});

describe("getNatureModifier", () => {
  const adamant: Nature = NATURES.find((n) => n.name === "Adamant")!;
  const hardy: Nature = NATURES.find((n) => n.name === "Hardy")!;

  it("returns 1.1 for the increased stat", () => {
    expect(getNatureModifier(adamant, "attack")).toBeCloseTo(1.1);
  });

  it("returns 0.9 for the decreased stat", () => {
    expect(getNatureModifier(adamant, "specialAttack")).toBeCloseTo(0.9);
  });

  it("returns 1.0 for an unaffected stat", () => {
    expect(getNatureModifier(adamant, "speed")).toBe(1.0);
  });

  it("returns 1.0 for every stat on a neutral nature", () => {
    for (const stat of ALL_STATS) {
      expect(getNatureModifier(hardy, stat)).toBe(1.0);
    }
  });

  it("modifiers across all stats for a non-neutral nature multiply roughly back together", () => {
    // sanity: exactly one 1.1 and one 0.9, rest 1.0
    const mods = ALL_STATS.map((s) => getNatureModifier(adamant, s));
    expect(mods.filter((m) => m === 1.1)).toHaveLength(1);
    expect(mods.filter((m) => m === 0.9)).toHaveLength(1);
    expect(mods.filter((m) => m === 1.0)).toHaveLength(3);
  });
});

describe("getNatureByName", () => {
  it("finds a nature by exact name", () => {
    expect(getNatureByName("Adamant")?.name).toBe("Adamant");
  });

  it("is case-insensitive", () => {
    expect(getNatureByName("adamant")?.name).toBe("Adamant");
    expect(getNatureByName("ADAMANT")?.name).toBe("Adamant");
    expect(getNatureByName("aDaMaNt")?.name).toBe("Adamant");
  });

  it("returns undefined for an unknown name", () => {
    expect(getNatureByName("NotANature")).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    expect(getNatureByName("")).toBeUndefined();
  });
});

describe("STAT_DISPLAY_NAMES", () => {
  it("has a display name for every stat key", () => {
    for (const stat of ALL_STATS) {
      expect(STAT_DISPLAY_NAMES[stat]).toBeTruthy();
    }
  });

  it("matches known abbreviations", () => {
    expect(STAT_DISPLAY_NAMES.attack).toBe("Atk");
    expect(STAT_DISPLAY_NAMES.defense).toBe("Def");
    expect(STAT_DISPLAY_NAMES.specialAttack).toBe("SpA");
    expect(STAT_DISPLAY_NAMES.specialDefense).toBe("SpD");
    expect(STAT_DISPLAY_NAMES.speed).toBe("Spe");
  });
});
