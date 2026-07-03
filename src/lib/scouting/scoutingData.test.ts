import { describe, it, expect } from "vitest";
import { findUsageEntry, formatEvSpread, toUsageSpecies } from "./scoutingData";
import type { UsageDataset, SlimUsageEntry } from "@/lib/competitive/types";

function entry(species: string, name: string): SlimUsageEntry {
  return { species, name, usagePct: 10, rawCount: 1, abilities: [], items: [], moves: [], tera: [], teammates: [], spreads: [] };
}

const dataset: UsageDataset = {
  smogonFormat: "gen9championsvgc2026regma",
  month: "2026-05",
  cutoff: 1760,
  battles: 100,
  entries: [
    entry("incineroar", "Incineroar"),
    entry("urshifu-rapid-strike", "Urshifu-Rapid-Strike"),
    entry("basculegion", "Basculegion"),
    entry("basculegion-f", "Basculegion-F"),
  ],
};

describe("findUsageEntry", () => {
  it("matches by app species id", () => {
    expect(findUsageEntry(dataset, "incineroar")?.name).toBe("Incineroar");
  });
  it("normalizes case, spaces, and underscores", () => {
    expect(findUsageEntry(dataset, "Urshifu_Rapid Strike")?.species).toBe("urshifu-rapid-strike");
  });
  it("matches a PokéAPI gendered form to the Smogon species (basculegion-male → Basculegion)", () => {
    expect(findUsageEntry(dataset, "basculegion-male")?.name).toBe("Basculegion");
    expect(findUsageEntry(dataset, "basculegion-female")?.name).toBe("Basculegion-F");
  });
  it("returns null on a miss", () => {
    expect(findUsageEntry(dataset, "pikachu")).toBeNull();
  });
  it("returns null when the dataset or name is absent", () => {
    expect(findUsageEntry(undefined, "incineroar")).toBeNull();
    expect(findUsageEntry(dataset, null)).toBeNull();
  });
});

describe("toUsageSpecies", () => {
  it("passes through names that already match the Smogon key", () => {
    expect(toUsageSpecies("incineroar")).toBe("incineroar");
    expect(toUsageSpecies("urshifu-rapid-strike")).toBe("urshifu-rapid-strike");
    expect(toUsageSpecies("raichu-alola")).toBe("raichu-alola");
  });
  it("resolves PokéAPI form names @pkmn/dex knows to their Smogon key", () => {
    expect(toUsageSpecies("urshifu-single-strike")).toBe("urshifu"); // base Urshifu
    expect(toUsageSpecies("tornadus-incarnate")).toBe("tornadus"); // base form
  });
  it("resolves gendered -male/-female forms @pkmn/dex does not alias", () => {
    expect(toUsageSpecies("basculegion-male")).toBe("basculegion");
    expect(toUsageSpecies("basculegion-female")).toBe("basculegion-f");
    expect(toUsageSpecies("indeedee-male")).toBe("indeedee");
    expect(toUsageSpecies("indeedee-female")).toBe("indeedee-f");
    expect(toUsageSpecies("oinkologne-female")).toBe("oinkologne-f");
  });
  it("strips trailing cosmetic-form segments to the base species", () => {
    expect(toUsageSpecies("maushold-family-of-four")).toBe("maushold");
  });
  it("falls back to plain normalization for unknown names", () => {
    expect(toUsageSpecies("notapokemon")).toBe("notapokemon");
    expect(toUsageSpecies("Urshifu_Rapid Strike")).toBe("urshifu-rapid-strike");
  });
});

describe("formatEvSpread", () => {
  it("lists only non-zero EVs, highest first, with the nature", () => {
    expect(
      formatEvSpread({ nature: "Adamant", evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 }, pct: 30 })
    ).toBe("Adamant · 252 Atk / 252 Spe / 4 HP");
  });
  it("shows the nature alone when there are no EVs", () => {
    expect(
      formatEvSpread({ nature: "Serious", evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, pct: 5 })
    ).toBe("Serious");
  });
});
