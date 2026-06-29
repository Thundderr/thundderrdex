import { describe, it, expect } from "vitest";
import {
  smogonChaosUrl,
  smogonMovesetTxtUrl,
  pikalyticsPokemonUrl,
  limitlessTournamentsUrl,
  limitlessStandingsUrl,
  entryWeight,
  toUsageOptions,
  parseSpreadKey,
  normalizeChaosEntry,
  toAppSpecies,
  buildUsageDataset,
  legalSpeciesFromUsage,
  parseLatestStatsMonth,
  previousMonth,
} from "./sources";
import type { SmogonChaos, SmogonChaosEntry } from "./types";

// Trimmed from the real gen9championsvgc2026regma-1760 Incineroar entry.
const INCINEROAR: SmogonChaosEntry = {
  "Raw count": 188638,
  "Viability Ceiling": [12664, 87, 76, 61],
  usage: 0.3987,
  Abilities: { intimidate: 1629.4, blaze: 2.2 }, // weight = 1631.6
  Items: { assaultvest: 815.8, safetygoggles: 407.9, rockyhelmet: 407.9 },
  Spreads: { "Careful:252/4/12/0/164/76": 815.8, "Impish:244/4/236/0/20/4": 407.9 },
  Moves: { fakeout: 1631.6, knockoff: 1564.9, flareblitz: 1164.1, partingshot: 906.5 },
  "Tera Types": { bug: 815.8, water: 407.9 },
  Teammates: { Miraidon: 952.6, "Urshifu-Rapid-Strike": 686.6 },
  "Checks and Counters": [],
};

describe("URL builders", () => {
  it("builds Smogon chaos and moveset URLs with cutoff/month", () => {
    expect(smogonChaosUrl("gen9championsvgc2026regma")).toBe(
      "https://www.smogon.com/stats/2026-05/chaos/gen9championsvgc2026regma-1760.json"
    );
    expect(smogonChaosUrl("gen9championsvgc2026regma", 0, "2026-04")).toBe(
      "https://www.smogon.com/stats/2026-04/chaos/gen9championsvgc2026regma-0.json"
    );
    expect(smogonMovesetTxtUrl("gen9championsvgc2026regma")).toContain("/moveset/gen9championsvgc2026regma-1760.txt");
  });

  it("builds Pikalytics and Limitless URLs", () => {
    expect(pikalyticsPokemonUrl("gen9championsvgc2026regma", "Garchomp")).toBe(
      "https://www.pikalytics.com/ai/pokedex/gen9championsvgc2026regma/Garchomp"
    );
    expect(limitlessTournamentsUrl({ limit: 5 })).toBe(
      "https://play.limitlesstcg.com/api/tournaments?game=VGC&limit=5"
    );
    expect(limitlessStandingsUrl("abc123")).toBe(
      "https://play.limitlesstcg.com/api/tournaments/abc123/standings"
    );
  });
});

describe("entryWeight", () => {
  it("sums ability weights as the Pokémon's total weighted appearances", () => {
    expect(entryWeight(INCINEROAR)).toBeCloseTo(1631.6, 1);
  });
});

describe("toUsageOptions", () => {
  it("normalises weighted counts to descending percentages", () => {
    const items = toUsageOptions(INCINEROAR.Items, entryWeight(INCINEROAR));
    expect(items[0].name).toBe("assaultvest");
    expect(items[0].pct).toBeCloseTo(50, 0); // 815.8 / 1631.6 ≈ 50%
    // Sorted descending.
    expect(items[0].pct).toBeGreaterThanOrEqual(items[1].pct);
  });

  it("returns [] when weight is zero", () => {
    expect(toUsageOptions({ a: 5 }, 0)).toEqual([]);
  });
});

describe("parseSpreadKey", () => {
  it("parses nature + 6 EVs", () => {
    expect(parseSpreadKey("Careful:252/4/12/0/164/76")).toEqual({
      nature: "Careful",
      evs: { hp: 252, atk: 4, def: 12, spa: 0, spd: 164, spe: 76 },
    });
  });

  it("rejects malformed keys", () => {
    expect(parseSpreadKey("Careful:252/4/12")).toBeNull();
    expect(parseSpreadKey("nonsense")).toBeNull();
  });
});

describe("normalizeChaosEntry", () => {
  it("produces app-facing percentages and parsed spreads", () => {
    const e = normalizeChaosEntry("Incineroar", INCINEROAR);
    expect(e.name).toBe("Incineroar");
    expect(e.usagePct).toBeCloseTo(39.87, 1);
    expect(e.rawCount).toBe(188638);
    // Fake Out is on ~100% of sets (weight == its count).
    expect(e.moves[0].name).toBe("fakeout");
    expect(e.moves[0].pct).toBeCloseTo(100, 0);
    // Top spread parsed.
    expect(e.spreads[0].nature).toBe("Careful");
    expect(e.spreads[0].evs.spe).toBe(76);
    expect(e.abilities[0].name).toBe("intimidate");
  });
});

describe("toAppSpecies", () => {
  it("kebab-cases Smogon display names", () => {
    expect(toAppSpecies("Urshifu-Rapid-Strike")).toBe("urshifu-rapid-strike");
    expect(toAppSpecies("Flutter Mane")).toBe("flutter-mane");
  });
});

const LOW_USAGE: SmogonChaosEntry = {
  "Raw count": 1000,
  "Viability Ceiling": [100, 80, 70, 60],
  usage: 0.05,
  Abilities: { levitate: 100 },
  Items: { leftovers: 100 },
  Spreads: { "Bold:252/0/252/0/4/0": 100 },
  Moves: { protect: 100, recover: 100, toxic: 100 },
  "Tera Types": { steel: 100 },
  Teammates: { Incineroar: 50 },
  "Checks and Counters": [],
};

const CHAOS: SmogonChaos = {
  info: {
    metagame: "gen9championsvgc2026regma",
    cutoff: 1760,
    "cutoff deviation": 0,
    "team type": null,
    "number of battles": 236315,
  },
  data: { Incineroar: INCINEROAR, Bronzong: LOW_USAGE },
};

describe("buildUsageDataset", () => {
  it("normalises, sorts by usage desc, and carries metadata", () => {
    const ds = buildUsageDataset(CHAOS, { month: "2026-05" });
    expect(ds.smogonFormat).toBe("gen9championsvgc2026regma");
    expect(ds.month).toBe("2026-05");
    expect(ds.cutoff).toBe(1760);
    expect(ds.battles).toBe(236315);
    // Incineroar (39.9%) sorts before Bronzong (5%).
    expect(ds.entries.map((e) => e.name)).toEqual(["Incineroar", "Bronzong"]);
    expect(ds.entries[0].species).toBe("incineroar");
    expect(ds.entries[0].usagePct).toBeCloseTo(39.87, 1);
  });

  it("caps each option list to the requested length", () => {
    const ds = buildUsageDataset(CHAOS, {
      month: "2026-05",
      caps: { abilities: 1, items: 1, moves: 2, tera: 1, teammates: 1, spreads: 1 },
    });
    const inc = ds.entries[0];
    expect(inc.moves).toHaveLength(2);
    expect(inc.items).toHaveLength(1);
    // Still the highest-usage options after capping.
    expect(inc.moves[0].name).toBe("fakeout");
  });
});

describe("parseLatestStatsMonth", () => {
  it("returns the newest YYYY-MM folder from index HTML", () => {
    const html = `
      <a href="2025-12/">2025-12/</a>
      <a href="2026-05/">2026-05/</a>
      <a href="2026-04/">2026-04/</a>
    `;
    expect(parseLatestStatsMonth(html)).toBe("2026-05");
  });

  it("returns null when no month folders are present", () => {
    expect(parseLatestStatsMonth("<a href='formats/'>formats</a>")).toBeNull();
  });
});

describe("previousMonth", () => {
  it("steps back a month, rolling over the year", () => {
    expect(previousMonth("2026-05")).toBe("2026-04");
    expect(previousMonth("2026-01")).toBe("2025-12");
    expect(previousMonth("2026-10")).toBe("2026-09");
  });
});

describe("legalSpeciesFromUsage", () => {
  it("returns the set of in-format species (kebab ids)", () => {
    const ds = buildUsageDataset(CHAOS, { month: "2026-05" });
    const legal = legalSpeciesFromUsage(ds);
    expect(legal.has("incineroar")).toBe(true);
    expect(legal.has("bronzong")).toBe(true);
    expect(legal.has("pikachu")).toBe(false);
    expect(legal.size).toBe(2);
  });
});
