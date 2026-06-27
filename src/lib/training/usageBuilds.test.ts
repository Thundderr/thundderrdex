import { describe, it, expect } from "vitest";
import { usagePoolFromDataset } from "./usageBuilds";
import type { UsageDataset, SlimUsageEntry } from "@/lib/competitive/types";

function entry(over: Partial<SlimUsageEntry> & { name: string }): SlimUsageEntry {
  return {
    species: over.name.toLowerCase(),
    usagePct: 30,
    rawCount: 1000,
    abilities: [{ name: "intimidate", pct: 100 }],
    items: [{ name: "choicescarf", pct: 60 }],
    moves: [
      { name: "earthquake", pct: 90 },
      { name: "closecombat", pct: 80 },
      { name: "stoneedge", pct: 70 },
      { name: "protect", pct: 60 },
      { name: "swordsdance", pct: 20 },
    ],
    tera: [],
    teammates: [],
    spreads: [{ nature: "Jolly", evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 }, pct: 50 }],
    ...over,
  };
}

const dataset: UsageDataset = {
  smogonFormat: "gen9vgc2026regi",
  month: "2026-05",
  cutoff: 1760,
  battles: 1000,
  entries: [
    entry({ name: "Garchomp" }),
    entry({ name: "Spreadless", spreads: [] }), // no spread → excluded
    entry({ name: "Moveless", moves: [] }), // no moves → excluded
  ],
};

describe("usagePoolFromDataset", () => {
  const pool = usagePoolFromDataset(dataset);

  it("excludes entries lacking a spread or moves", () => {
    expect(pool.map((p) => p.species)).toEqual(["Garchomp"]);
  });

  it("builds a level-50 set from the top spread / item / ability / moves", () => {
    const set = pool[0].sets[0];
    expect(set.level).toBe(50); // VGC level
    expect(set.nature).toBe("Jolly");
    expect(set.evs).toEqual({ hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 });
    // Condensed usage ids resolve to display names via @pkmn/dex.
    expect(set.item).toBe("Choice Scarf");
    expect(set.ability).toBe("Intimidate");
    // At most the top 4 moves, as display names.
    expect(set.moves).toEqual(["Earthquake", "Close Combat", "Stone Edge", "Protect"]);
  });

  it("carries usagePct for meta-weighted sampling", () => {
    expect(pool[0].usagePct).toBe(30);
  });

  it("caches per dataset (same reference returned)", () => {
    expect(usagePoolFromDataset(dataset)).toBe(pool);
  });
});
