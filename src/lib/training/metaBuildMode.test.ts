import { describe, it, expect } from "vitest";
import { metaBuildMode } from "./metaBuildMode";
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

function entry(name: string, usagePct: number, items: string[], moves: string[]): SlimUsageEntry {
  return {
    name,
    species: name.toLowerCase(),
    usagePct,
    rawCount: 1000,
    abilities: [{ name: "intimidate", pct: 100 }],
    items: items.map((id, i) => ({ name: id, pct: 60 - i * 10 })),
    moves: moves.map((id, i) => ({ name: id, pct: 95 - i * 5 })),
    tera: [],
    teammates: [],
    spreads: [],
  };
}

const DATASET: UsageDataset = {
  smogonFormat: "gen9championsvgc2026regma",
  month: "2026-05",
  cutoff: 1760,
  battles: 100000,
  entries: [
    entry("Incineroar", 39.9, ["assaultvest", "safetygoggles", "rockyhelmet"], ["fakeout", "knockoff", "flareblitz", "partingshot"]),
    entry("Garchomp", 30.0, ["choicescarf", "sitrusberry", "lifeorb"], ["earthquake", "dragonclaw", "rockslide", "protect"]),
    entry("Rillaboom", 20.0, ["assaultvest", "miracleseed", "lifeorb"], ["grassyglide", "fakeout", "uturn", "highhorsepower"]),
    entry("Amoonguss", 15.0, ["sitrusberry", "rockyhelmet", "covertcloak"], ["spore", "ragepowder", "pollenpuff", "protect"]),
  ],
};

const ctx = (rng: () => number, settings?: Record<string, string>) => ({
  generation: 9,
  records: {},
  rng,
  settings,
  usage: DATASET,
});

describe("metaBuildMode.generate", () => {
  it("returns null without usage data", () => {
    expect(metaBuildMode.generate({ generation: 9, records: {}, rng: Math.random })).toBeNull();
  });

  it("asks for a real top option and marks it correct (item facet)", () => {
    for (let i = 0; i < 60; i++) {
      const q = metaBuildMode.generate(ctx(mulberry32(i + 1), { facet: "item" }))!;
      expect(q).not.toBeNull();
      expect(q.modeId).toBe("meta-build");
      // The correct id is the mon's top item.
      const mon = DATASET.entries.find((e) => q.srsKey.endsWith(e.species))!;
      expect(q.correctChoiceId).toBe(mon.items[0].name);
      // Correct is among choices, and choices are unique + 4 wide.
      const ids = q.choices.map((c) => c.id);
      expect(ids).toContain(q.correctChoiceId);
      expect(new Set(ids).size).toBe(4);
      // Distractors are not items the mon actually runs.
      const onMon = new Set(mon.items.map((it) => it.name));
      for (const id of ids) {
        if (id !== q.correctChoiceId) expect(onMon.has(id)).toBe(false);
      }
      // Labels are prettified display names (Title Case, not raw ids).
      expect(q.choices.every((c) => /^[A-Z]/.test(c.label))).toBe(true);
    }
  });

  it("supports the move facet", () => {
    const q = metaBuildMode.generate(ctx(mulberry32(3), { facet: "move" }))!;
    expect(q.prompt).toMatch(/move .* most commonly run/);
    const mon = DATASET.entries.find((e) => q.srsKey.endsWith(e.species))!;
    expect(q.correctChoiceId).toBe(mon.moves[0].name);
  });

  it("namespaces SRS keys by format and facet", () => {
    const q = metaBuildMode.generate(ctx(mulberry32(5), { facet: "item" }))!;
    expect(q.srsKey.startsWith("meta:gen9championsvgc2026regma:item:")).toBe(true);
  });

  it("includes a usage breakdown", () => {
    const q = metaBuildMode.generate(ctx(mulberry32(7), { facet: "item" }))!;
    expect(q.breakdown && q.breakdown.length).toBeGreaterThan(0);
    expect(q.breakdown!.some((l) => /%$/.test(l))).toBe(true);
  });
});
