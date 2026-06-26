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
} from "./sources";
import type { SmogonChaosEntry } from "./types";

// Trimmed from the real gen9vgc2026regi-1760 Incineroar entry.
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
    expect(smogonChaosUrl("gen9vgc2026regi")).toBe(
      "https://www.smogon.com/stats/2026-05/chaos/gen9vgc2026regi-1760.json"
    );
    expect(smogonChaosUrl("gen9vgc2026regi", 0, "2026-04")).toBe(
      "https://www.smogon.com/stats/2026-04/chaos/gen9vgc2026regi-0.json"
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
