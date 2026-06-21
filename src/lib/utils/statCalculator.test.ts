import { describe, it, expect } from "vitest";
import {
  calculateStats,
  getEvTotal,
  isValidEvTotal,
  isValidEvValue,
  isValidIvValue,
  isValidLevel,
  clampEv,
  clampIv,
  clampLevel,
  StatValues,
  StatCalcInput,
} from "@/lib/utils/statCalculator";
import { NATURES, getNatureByName, Nature } from "@/data/natures";
import { PokemonStats } from "@/types/pokemon";

// --- Helpers ----------------------------------------------------------------

const NEUTRAL_NATURE: Nature = getNatureByName("Hardy")!; // no stat changes
const ADAMANT: Nature = getNatureByName("Adamant")!; // +attack, -specialAttack
const TIMID: Nature = getNatureByName("Timid")!; // +speed, -attack

function makeStatValues(value: number): StatValues {
  return {
    hp: value,
    attack: value,
    defense: value,
    specialAttack: value,
    specialDefense: value,
    speed: value,
  };
}

// A base-stat block where every stat is `base`. `total` is irrelevant to the
// calculator (it never reads it and always returns total: 0).
function makeBaseStats(base: number): PokemonStats {
  return {
    hp: base,
    attack: base,
    defense: base,
    specialAttack: base,
    specialDefense: base,
    speed: base,
    total: 0,
  };
}

function makeModifiers(
  level: number,
  iv: number,
  ev: number
): StatCalcInput {
  return {
    level,
    ivs: makeStatValues(iv),
    evs: makeStatValues(ev),
    nature: "Hardy", // ignored by calculateStats; nature object is the 3rd arg
  };
}

// --- calculateStats ---------------------------------------------------------

describe("calculateStats", () => {
  it("computes the canonical competitive max stats (lvl 100, 31 IV, 252 EV, base 100, neutral)", () => {
    // Hand-computed from the Gen 3+ formulas:
    //   Other = floor((floor((2*100 + 31 + floor(252/4)) * 100/100) + 5) * 1.0)
    //         = floor((294 + 5)) = 299
    //   HP    = floor((2*100 + 31 + 63) * 100/100) + 100 + 10 = 294 + 110 = 404
    const result = calculateStats(
      makeBaseStats(100),
      makeModifiers(100, 31, 252),
      NEUTRAL_NATURE
    );
    expect(result.hp).toBe(404);
    expect(result.attack).toBe(299);
    expect(result.defense).toBe(299);
    expect(result.specialAttack).toBe(299);
    expect(result.specialDefense).toBe(299);
    expect(result.speed).toBe(299);
  });

  it("applies the HP formula (which differs from the other-stat formula)", () => {
    // HP must NOT receive the +5/nature treatment, and must add level + 10.
    const result = calculateStats(
      makeBaseStats(50),
      makeModifiers(100, 31, 0),
      NEUTRAL_NATURE
    );
    // HP = floor((2*50 + 31 + 0) * 100/100) + 100 + 10 = 131 + 110 = 241
    expect(result.hp).toBe(241);
    // Other = floor((floor((2*50 + 31 + 0) * 100/100) + 5) * 1.0) = 131 + 5 = 136
    expect(result.attack).toBe(136);
  });

  it("applies a nature-up multiplier of 1.1 to the increased stat", () => {
    // Adamant: +attack, -specialAttack. base 100, lvl 100, 31 IV, 0 EV.
    // Neutral other stat = floor((2*100+31) * 100/100) + 5 = 231 + 5 = 236
    // Up   = floor(236 * 1.1) = floor(259.6) = 259
    // Down = floor(236 * 0.9) = floor(212.4) = 212
    const result = calculateStats(
      makeBaseStats(100),
      makeModifiers(100, 31, 0),
      ADAMANT
    );
    expect(result.attack).toBe(259); // boosted
    expect(result.specialAttack).toBe(212); // reduced
    expect(result.defense).toBe(236); // neutral
    expect(result.speed).toBe(236); // neutral
  });

  it("applies a nature-down multiplier of 0.9 to the decreased stat", () => {
    // Timid: +speed, -attack.
    const result = calculateStats(
      makeBaseStats(100),
      makeModifiers(100, 31, 0),
      TIMID
    );
    expect(result.speed).toBe(259); // boosted
    expect(result.attack).toBe(212); // reduced
    expect(result.specialAttack).toBe(236); // neutral
  });

  it("leaves all six stats neutral for a neutral nature", () => {
    const result = calculateStats(
      makeBaseStats(80),
      makeModifiers(100, 31, 0),
      NEUTRAL_NATURE
    );
    // Other = floor((2*80+31)*100/100) + 5 = 191 + 5 = 196
    expect(result.attack).toBe(196);
    expect(result.defense).toBe(196);
    expect(result.specialAttack).toBe(196);
    expect(result.specialDefense).toBe(196);
    expect(result.speed).toBe(196);
  });

  it("accounts for IV contribution (each IV point can raise the result)", () => {
    const high = calculateStats(
      makeBaseStats(100),
      makeModifiers(100, 31, 0),
      NEUTRAL_NATURE
    );
    const low = calculateStats(
      makeBaseStats(100),
      makeModifiers(100, 0, 0),
      NEUTRAL_NATURE
    );
    // HP: 31 IV -> floor(231*1)+110 = 341; 0 IV -> floor(200)+110 = 310
    expect(high.hp).toBe(341);
    expect(low.hp).toBe(310);
    expect(high.hp - low.hp).toBe(31);
    // Other: 31 IV -> 236; 0 IV -> 205
    expect(high.attack).toBe(236);
    expect(low.attack).toBe(205);
  });

  it("accounts for EV contribution via floor(ev/4)", () => {
    // 252 EV -> floor(252/4) = 63 extra base points before scaling.
    const noEv = calculateStats(
      makeBaseStats(100),
      makeModifiers(100, 31, 0),
      NEUTRAL_NATURE
    );
    const maxEv = calculateStats(
      makeBaseStats(100),
      makeModifiers(100, 31, 252),
      NEUTRAL_NATURE
    );
    // attack: noEv 236, maxEv floor((2*100+31+63)*1)+5 = 294+5 = 299
    expect(noEv.attack).toBe(236);
    expect(maxEv.attack).toBe(299);
  });

  it("rounds EVs down to the nearest multiple of 4 (floor(ev/4))", () => {
    // 4 EV and 7 EV both yield floor(ev/4) = 1, so identical stats.
    const ev4 = calculateStats(
      makeBaseStats(100),
      { level: 100, ivs: makeStatValues(31), evs: makeStatValues(4), nature: "Hardy" },
      NEUTRAL_NATURE
    );
    const ev7 = calculateStats(
      makeBaseStats(100),
      { level: 100, ivs: makeStatValues(31), evs: makeStatValues(7), nature: "Hardy" },
      NEUTRAL_NATURE
    );
    expect(ev4.attack).toBe(ev7.attack);
    expect(ev4.hp).toBe(ev7.hp);
  });

  it("scales with level (level 50 vs 100)", () => {
    // base 100, 31 IV, 252 EV, neutral.
    // lvl 50 other = floor((floor((294)*50/100)+5)) = floor(147)+5 = 152
    // lvl 50 HP    = floor(294*50/100)+50+10 = 147 + 60 = 207
    const lvl50 = calculateStats(
      makeBaseStats(100),
      makeModifiers(50, 31, 252),
      NEUTRAL_NATURE
    );
    expect(lvl50.attack).toBe(152);
    expect(lvl50.hp).toBe(207);
  });

  it("handles the level-1 edge case", () => {
    // base 100, 31 IV, 0 EV, lvl 1, neutral.
    // Other = floor((floor((231)*1/100)+5)*1.0) = floor(2)+5 = 2+5 = 7
    // HP    = floor((231)*1/100)+1+10 = 2 + 11 = 13
    const lvl1 = calculateStats(
      makeBaseStats(100),
      makeModifiers(1, 31, 0),
      NEUTRAL_NATURE
    );
    expect(lvl1.attack).toBe(7);
    expect(lvl1.hp).toBe(13);
  });

  it("handles the level-100 edge case identically to the canonical max", () => {
    const lvl100 = calculateStats(
      makeBaseStats(100),
      makeModifiers(100, 31, 252),
      NEUTRAL_NATURE
    );
    expect(lvl100.hp).toBe(404);
    expect(lvl100.attack).toBe(299);
  });

  it("matches a real-world example: Garchomp-like attack (base 130, lvl 100, 31 IV, 252 EV, +nature)", () => {
    // Adamant Garchomp attack with 252 EV / 31 IV at lvl 100.
    // neutral = floor((2*130 + 31 + 63) * 100/100) + 5 = 354 + 5 = 359
    // +nature = floor(359 * 1.1) = floor(394.9) = 394
    const stats: PokemonStats = {
      hp: 108, attack: 130, defense: 95, specialAttack: 80, specialDefense: 85, speed: 102, total: 0,
    };
    const result = calculateStats(
      stats,
      {
        level: 100,
        ivs: makeStatValues(31),
        evs: { hp: 0, attack: 252, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
        nature: "Adamant",
      },
      ADAMANT
    );
    expect(result.attack).toBe(394);
    // HP base 108, 0 EV/IV 31: floor((2*108+31)*100/100)+110 = 247+110 = 357
    expect(result.hp).toBe(357);
  });

  it("returns total as 0 (calculator does not sum stats)", () => {
    const result = calculateStats(
      makeBaseStats(100),
      makeModifiers(100, 31, 252),
      NEUTRAL_NATURE
    );
    expect(result.total).toBe(0);
  });
});

// --- getEvTotal -------------------------------------------------------------

describe("getEvTotal", () => {
  it("sums all six EV fields", () => {
    const evs: StatValues = {
      hp: 4, attack: 252, defense: 0, specialAttack: 0, specialDefense: 0, speed: 252,
    };
    expect(getEvTotal(evs)).toBe(508);
  });

  it("returns 0 for an all-zero spread", () => {
    expect(getEvTotal(makeStatValues(0))).toBe(0);
  });

  it("returns the full 510 for a maxed legal spread", () => {
    const evs: StatValues = {
      hp: 6, attack: 252, defense: 0, specialAttack: 0, specialDefense: 0, speed: 252,
    };
    expect(getEvTotal(evs)).toBe(510);
  });
});

// --- isValidEvTotal ---------------------------------------------------------

describe("isValidEvTotal", () => {
  it("accepts a total of exactly 510 (boundary)", () => {
    const evs: StatValues = {
      hp: 6, attack: 252, defense: 0, specialAttack: 0, specialDefense: 0, speed: 252,
    };
    expect(isValidEvTotal(evs)).toBe(true);
  });

  it("accepts a total below 510", () => {
    expect(isValidEvTotal(makeStatValues(0))).toBe(true);
  });

  it("rejects a total above 510", () => {
    const evs: StatValues = {
      hp: 252, attack: 252, defense: 252, specialAttack: 0, specialDefense: 0, speed: 0,
    };
    expect(getEvTotal(evs)).toBe(756);
    expect(isValidEvTotal(evs)).toBe(false);
  });
});

// --- isValidEvValue ---------------------------------------------------------

describe("isValidEvValue", () => {
  it("accepts the in-range boundaries 0 and 252", () => {
    expect(isValidEvValue(0)).toBe(true);
    expect(isValidEvValue(252)).toBe(true);
  });

  it("accepts an in-range mid value", () => {
    expect(isValidEvValue(128)).toBe(true);
  });

  it("rejects values below 0", () => {
    expect(isValidEvValue(-1)).toBe(false);
  });

  it("rejects values above 252", () => {
    expect(isValidEvValue(253)).toBe(false);
  });
});

// --- isValidIvValue ---------------------------------------------------------

describe("isValidIvValue", () => {
  it("accepts the in-range boundaries 0 and 31", () => {
    expect(isValidIvValue(0)).toBe(true);
    expect(isValidIvValue(31)).toBe(true);
  });

  it("rejects values below 0", () => {
    expect(isValidIvValue(-1)).toBe(false);
  });

  it("rejects values above 31", () => {
    expect(isValidIvValue(32)).toBe(false);
  });
});

// --- isValidLevel -----------------------------------------------------------

describe("isValidLevel", () => {
  it("accepts the in-range boundaries 1 and 100", () => {
    expect(isValidLevel(1)).toBe(true);
    expect(isValidLevel(100)).toBe(true);
  });

  it("accepts an in-range mid value", () => {
    expect(isValidLevel(50)).toBe(true);
  });

  it("rejects level 0 (below min)", () => {
    expect(isValidLevel(0)).toBe(false);
  });

  it("rejects levels above 100", () => {
    expect(isValidLevel(101)).toBe(false);
  });
});

// --- clampEv ----------------------------------------------------------------

describe("clampEv", () => {
  it("leaves an in-range value unchanged", () => {
    expect(clampEv(100)).toBe(100);
  });

  it("clamps a below-min value up to 0", () => {
    expect(clampEv(-5)).toBe(0);
  });

  it("clamps an above-max value down to 252", () => {
    expect(clampEv(300)).toBe(252);
  });

  it("floors non-integer input", () => {
    expect(clampEv(10.9)).toBe(10);
  });

  it("keeps boundary values 0 and 252", () => {
    expect(clampEv(0)).toBe(0);
    expect(clampEv(252)).toBe(252);
  });
});

// --- clampIv ----------------------------------------------------------------

describe("clampIv", () => {
  it("leaves an in-range value unchanged", () => {
    expect(clampIv(15)).toBe(15);
  });

  it("clamps a below-min value up to 0", () => {
    expect(clampIv(-3)).toBe(0);
  });

  it("clamps an above-max value down to 31", () => {
    expect(clampIv(99)).toBe(31);
  });

  it("floors non-integer input", () => {
    expect(clampIv(20.7)).toBe(20);
  });

  it("keeps boundary values 0 and 31", () => {
    expect(clampIv(0)).toBe(0);
    expect(clampIv(31)).toBe(31);
  });
});

// --- clampLevel -------------------------------------------------------------

describe("clampLevel", () => {
  it("leaves an in-range value unchanged", () => {
    expect(clampLevel(50)).toBe(50);
  });

  it("clamps a below-min value up to 1", () => {
    expect(clampLevel(0)).toBe(1);
    expect(clampLevel(-10)).toBe(1);
  });

  it("clamps an above-max value down to 100", () => {
    expect(clampLevel(150)).toBe(100);
  });

  it("floors non-integer input", () => {
    expect(clampLevel(42.9)).toBe(42);
  });

  it("keeps boundary values 1 and 100", () => {
    expect(clampLevel(1)).toBe(1);
    expect(clampLevel(100)).toBe(100);
  });
});

// Guard: ensure the nature fixtures resolved (catches data-layer drift).
describe("nature fixtures", () => {
  it("resolves Hardy as neutral, Adamant as +atk/-spa, Timid as +spe/-atk", () => {
    expect(NEUTRAL_NATURE.increasedStat).toBeNull();
    expect(NEUTRAL_NATURE.decreasedStat).toBeNull();
    expect(ADAMANT.increasedStat).toBe("attack");
    expect(ADAMANT.decreasedStat).toBe("specialAttack");
    expect(TIMID.increasedStat).toBe("speed");
    expect(TIMID.decreasedStat).toBe("attack");
    expect(NATURES).toHaveLength(25);
  });
});
