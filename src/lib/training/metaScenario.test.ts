import { describe, it, expect } from "vitest";
import { metaTypeDistributions, metaTypeScenario } from "./metaScenario";
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
  smogonFormat: "gen9championsvgc2026regma",
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

describe("metaTypeScenario", () => {
  it("samples a real attacker, move, and defender from the meta", () => {
    const s = metaTypeScenario(DATASET, mulberry32(3))!;
    expect(s).toBeTruthy();
    expect(DATASET.entries.some((e) => e.name === s.attacker.name)).toBe(true);
    expect(DATASET.entries.some((e) => e.name === s.defender.name)).toBe(true);
    expect(typeof s.move.name).toBe("string");
    expect(s.defender.types.length).toBeGreaterThan(0);
  });

  it("draws the attacking type from the move, not the attacker's typing", () => {
    // Garchomp (Dragon/Ground) running Fire Blast — a Fire attack from a non-Fire mon.
    const ds: UsageDataset = { ...DATASET, entries: [entry("Garchomp", 100, ["fireblast"])] };
    const s = metaTypeScenario(ds, mulberry32(1))!;
    expect(s.attacker.name).toBe("Garchomp");
    expect(s.move.type).toBe("fire");
    expect(s.attacker.types).not.toContain("fire"); // attack type ≠ attacker type
  });

  it("keeps attacker and defender distinct species when it can", () => {
    for (let i = 0; i < 30; i++) {
      const s = metaTypeScenario(DATASET, mulberry32(i + 1))!;
      expect(s.attacker.name).not.toBe(s.defender.name);
    }
  });

  it("returns null when no defender matches the requested shape", () => {
    // Every mon in DATASET is dual-type, so a mono-only request can't be satisfied.
    expect(metaTypeScenario(DATASET, mulberry32(1), { defenderKind: "mono" })).toBeNull();
  });

  it("returns null without usage entries (caller falls back to random)", () => {
    expect(metaTypeScenario({ ...DATASET, entries: [] }, mulberry32(1))).toBeNull();
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

  it("surfaces a concrete sample matchup after answering", () => {
    const q = typeEffMode.generate(ctx(mulberry32(7)))!;
    expect(q).not.toBeNull();
    // First explanation line is the "X uses Move on Y" scenario sentence.
    const firstLine = q.explanationLines![0];
    const hasScenario = firstLine.some((seg) => typeof seg === "string" && seg.includes("uses"));
    expect(hasScenario).toBe(true);
    // The "explain" button still opens the Type Chart.
    expect(q.explainLink?.kind).toBe("type-chart");
  });

  it("falls back to random sweep when usage is absent", () => {
    // scenario=meta but no usage → still produces a valid question (random path).
    const q = typeEffMode.generate({ generation: 9, records: {}, rng: mulberry32(1), settings: { scenario: "meta" } });
    expect(q).not.toBeNull();
  });
});
