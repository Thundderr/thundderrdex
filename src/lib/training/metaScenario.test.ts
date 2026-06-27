import { describe, it, expect } from "vitest";
import { metaTypeDistributions } from "./metaScenario";
import { typeEffMode } from "./typeEffMode";
import type { UsageDataset, SlimUsageEntry } from "@/lib/competitive/types";

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function entry(name: string, usagePct: number, moves: string[]): SlimUsageEntry {
  return {
    name,
    species: name.toLowerCase(),
    usagePct,
    rawCount: 1000,
    abilities: [{ name: "intimidate", pct: 100 }],
    items: [{ name: "leftovers", pct: 100 }],
    moves: moves.map((id, i) => ({ name: id, pct: 90 - i * 10 })),
    tera: [],
    teammates: [],
    spreads: [{ nature: "Jolly", evs: { hp: 0, atk: 252, def: 0, spa: 0, spd: 4, spe: 252 }, pct: 50 }],
  };
}

// Real species so @pkmn/dex resolves their typings/moves.
const DATASET: UsageDataset = {
  smogonFormat: "gen9vgc2026regi",
  month: "2026-05",
  cutoff: 1760,
  battles: 100000,
  entries: [
    entry("Garchomp", 40, ["earthquake", "dragonclaw"]), // Dragon/Ground; ground+dragon attacks
    entry("Incineroar", 35, ["flareblitz", "knockoff"]), // Fire/Dark; fire+dark attacks
    entry("Amoonguss", 20, ["sludgebomb", "pollenpuff"]), // Grass/Poison; poison+grass attacks
  ],
};

describe("metaTypeDistributions", () => {
  it("derives defending typings weighted by usage", () => {
    const d = metaTypeDistributions(DATASET);
    const chomp = d.defenders.find((x) => x.types.includes("dragon") && x.types.includes("ground"));
    expect(chomp).toBeTruthy();
    expect(chomp!.weight).toBe(40);
    // Every meta mon contributes a defender typing.
    expect(d.defenders).toHaveLength(3);
  });

  it("derives attacking types from damaging-move usage", () => {
    const d = metaTypeDistributions(DATASET);
    const types = d.attackers.map((a) => a.type);
    expect(types).toContain("ground"); // earthquake
    expect(types).toContain("fire"); // flareblitz
    expect(types).toContain("dark"); // knockoff
  });
});

describe("typeEffMode — meta scenario", () => {
  const ctx = (rng: () => number) => ({
    generation: 9,
    records: {},
    rng,
    settings: { scenario: "meta", defender: "both" },
    usage: DATASET,
  });

  it("only quizzes defending typings drawn from the meta", () => {
    const metaTypings = new Set(DATASET.entries.map((e) => e.species));
    // Map of allowed typing signatures from @pkmn/dex via the distributions.
    const allowed = new Set(
      metaTypeDistributions(DATASET).defenders.map((d) => [...d.types].sort().join("-"))
    );
    for (let i = 0; i < 60; i++) {
      const q = typeEffMode.generate(ctx(mulberry32(i + 1)))!;
      const defs = q.srsKey.slice("type-eff:".length).split("|")[1];
      expect(allowed.has(defs.split("-").sort().join("-"))).toBe(true);
    }
    expect(metaTypings.size).toBe(3);
  });

  it("falls back to random sweep when usage is absent", () => {
    // scenario=meta but no usage → still produces a valid question (random path).
    const q = typeEffMode.generate({ generation: 9, records: {}, rng: mulberry32(1), settings: { scenario: "meta" } });
    expect(q).not.toBeNull();
  });
});
