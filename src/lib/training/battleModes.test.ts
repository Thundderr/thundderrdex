import { describe, it, expect } from "vitest";
import { speedMode } from "./speedMode";
import { willItKoMode } from "./willItKoMode";
import { KO_BUCKETS } from "./calcEngine";
import type { SetPool } from "./setPool";

// Deterministic PRNG.
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

// Real Gen 9 species + plausible sets, so @smogon/calc resolves them without a
// network round-trip. (Move legality isn't enforced by the calc.)
const POOL: SetPool = [
  {
    species: "Garchomp",
    sets: [
      {
        name: "Scarf",
        format: "gen9ou",
        formatDisplay: "OU",
        nature: "Jolly",
        item: "Choice Scarf",
        ability: "Rough Skin",
        evs: { atk: 252, spe: 252, hp: 4 },
        moves: ["Earthquake", "Dragon Claw", "Stone Edge"],
        level: 100,
      },
    ],
  },
  {
    species: "Corviknight",
    sets: [
      {
        name: "Defensive",
        format: "gen9ou",
        formatDisplay: "OU",
        nature: "Impish",
        item: "Leftovers",
        ability: "Pressure",
        evs: { hp: 252, def: 252, spe: 4 },
        moves: ["Body Press", "Brave Bird", "Roost"],
        level: 100,
      },
    ],
  },
  {
    species: "Dragapult",
    sets: [
      {
        name: "Offensive",
        format: "gen9ou",
        formatDisplay: "OU",
        nature: "Timid",
        item: "Choice Specs",
        ability: "Infiltrator",
        evs: { spa: 252, spe: 252, hp: 4 },
        moves: ["Shadow Ball", "Draco Meteor", "Flamethrower"],
        level: 100,
      },
    ],
  },
];

const baseCtx = { generation: 9, records: {}, rng: mulberry32(1) };

describe("speedMode.generate (integration)", () => {
  it("always produces a valid speed question from a real pool", () => {
    for (let i = 0; i < 80; i++) {
      const rng = mulberry32(i + 1);
      const q = speedMode.generate({ ...baseCtx, rng }, POOL);
      expect(q).not.toBeNull();
      if (!q) continue;
      expect(q.choices.map((c) => c.id)).toContain(q.correctChoiceId);
      expect(q.breakdown).toHaveLength(2);
      expect(q.srsKey.startsWith("speed:")).toBe(true);
      expect(q.explainLink?.kind).toBe("damage-calc");
    }
  });

  it("returns null when the pool is too small", () => {
    expect(speedMode.generate(baseCtx, [POOL[0]])).toBeNull();
    expect(speedMode.generate(baseCtx, [])).toBeNull();
  });

  it("omits modifiers when the setting is off", () => {
    // With modifiers off, the subPrompt never mentions a modifier.
    for (let i = 0; i < 40; i++) {
      const rng = mulberry32(i + 100);
      const q = speedMode.generate(
        { ...baseCtx, rng, settings: { modifiers: "off" } },
        POOL
      )!;
      expect(q.subPrompt).not.toMatch(/Scarf|Tailwind|Paralysis/);
    }
  });
});

describe("willItKoMode.generate (integration)", () => {
  it("always produces a valid KO question with a damage breakdown", () => {
    for (let i = 0; i < 80; i++) {
      const rng = mulberry32(i + 1);
      const q = willItKoMode.generate({ ...baseCtx, rng }, POOL);
      expect(q).not.toBeNull();
      if (!q) continue;
      expect(KO_BUCKETS).toContain(q.correctChoiceId);
      expect(q.choices.map((c) => c.id)).toContain(q.correctChoiceId);
      expect(q.breakdown && q.breakdown.length).toBeGreaterThan(0);
      expect(q.srsKey.startsWith("ko:")).toBe(true);
      const link = q.explainLink;
      expect(link?.kind).toBe("damage-calc");
      if (link?.kind === "damage-calc") {
        expect(link.move).toBeTruthy();
        expect(link.attacker.species).toMatch(/^[a-z-]+$/); // kebab-case for the calc
      }
    }
  });

  it("returns null when the pool is too small", () => {
    expect(willItKoMode.generate(baseCtx, [POOL[0]])).toBeNull();
  });
});
