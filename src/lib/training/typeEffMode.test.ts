import { describe, it, expect } from "vitest";
import { getTypeChartForGeneration } from "@/data/typeChart";
import { typeEffMode, typeMultiplier, typeEffKey } from "./typeEffMode";

// Small deterministic PRNG so generated questions are reproducible.
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

const chart9 = getTypeChartForGeneration(9);

describe("typeMultiplier", () => {
  it("doubles for a super-effective hit", () => {
    expect(typeMultiplier(chart9, "water", ["fire"])).toBe(2);
  });

  it("halves for a resisted hit", () => {
    expect(typeMultiplier(chart9, "fire", ["water"])).toBe(0.5);
  });

  it("is zero against an immune type", () => {
    expect(typeMultiplier(chart9, "normal", ["ghost"])).toBe(0);
    expect(typeMultiplier(chart9, "electric", ["ground"])).toBe(0);
  });

  it("stacks to 4x against a doubly-weak pairing", () => {
    expect(typeMultiplier(chart9, "fire", ["grass", "steel"])).toBe(4);
  });

  it("stacks to 0.25x against a doubly-resistant pairing", () => {
    expect(typeMultiplier(chart9, "fire", ["water", "rock"])).toBe(0.25);
  });

  it("is zero when either defending type is immune, regardless of the other", () => {
    expect(typeMultiplier(chart9, "ground", ["flying", "steel"])).toBe(0);
  });
});

describe("typeEffKey", () => {
  it("sorts defence types so order doesn't matter", () => {
    expect(typeEffKey("fire", ["steel", "grass"])).toBe(typeEffKey("fire", ["grass", "steel"]));
  });
});

describe("typeEffMode.generate", () => {
  it("marks the correct multiplier as the answer for every generated question", () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 200; i++) {
      const q = typeEffMode.generate({ generation: 9, records: {}, rng });
      expect(q).not.toBeNull();
      if (!q) continue;

      // Re-derive the matchup from the SRS key and confirm the marked answer.
      const body = q.srsKey.slice("type-eff:".length);
      const [atk, defs] = body.split("|");
      const expected = typeMultiplier(
        chart9,
        atk as Parameters<typeof typeMultiplier>[1],
        defs.split("-") as Parameters<typeof typeMultiplier>[2]
      );
      expect(q.correctChoiceId).toBe(String(expected));
      expect(q.choices.map((c) => c.id)).toContain(q.correctChoiceId);
    }
  });

  it("respects the mono/dual defender setting", () => {
    const rng = mulberry32(5);
    for (let i = 0; i < 60; i++) {
      const mono = typeEffMode.generate({ generation: 9, records: {}, rng, settings: { defender: "mono" } })!;
      const defs = mono.srsKey.slice("type-eff:".length).split("|")[1];
      expect(defs.includes("-")).toBe(false); // single type

      const dual = typeEffMode.generate({ generation: 9, records: {}, rng, settings: { defender: "dual" } })!;
      const ddefs = dual.srsKey.slice("type-eff:".length).split("|")[1];
      expect(ddefs.includes("-")).toBe(true); // two types
    }
  });

  it("excludes ¼× and 4× for mono-type defenders, keeps them for dual", () => {
    const rng = mulberry32(11);
    for (let i = 0; i < 60; i++) {
      const mono = typeEffMode.generate({ generation: 9, records: {}, rng, settings: { defender: "mono" } })!;
      const ids = mono.choices.map((c) => c.id);
      expect(ids).not.toContain("0.25");
      expect(ids).not.toContain("4");
      expect(ids).toEqual(["0", "0.5", "1", "2"]); // ordered left→right
      expect(mono.choiceLayout).toBe("row");
    }
    const dual = typeEffMode.generate({ generation: 9, records: {}, rng, settings: { defender: "dual" } })!;
    expect(dual.choices.map((c) => c.id)).toEqual(["0", "0.25", "0.5", "1", "2", "4"]);
  });

  it("explains each defending type on its own line (dual = two lines, mono = one)", () => {
    const dual = typeEffMode.generate({ generation: 9, records: {}, rng: mulberry32(9), settings: { defender: "dual" } })!;
    expect(dual.explanation.split("\n")).toHaveLength(2);
    expect(dual.breakdown).toBeUndefined(); // no combined breakdown box for type matchups
    expect(dual.review && dual.review.length).toBeGreaterThanOrEqual(3); // attack coverage + 2 defenders

    const mono = typeEffMode.generate({ generation: 9, records: {}, rng: mulberry32(9), settings: { defender: "mono" } })!;
    expect(mono.explanation.split("\n")).toHaveLength(1);
  });
});
