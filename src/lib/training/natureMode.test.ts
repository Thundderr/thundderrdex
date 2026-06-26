import { describe, it, expect } from "vitest";
import { getNatureByName, NATURES } from "@/data/natures";
import { natureMode, effectLabel } from "./natureMode";

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

describe("effectLabel", () => {
  it("describes a stat-changing nature", () => {
    expect(effectLabel(getNatureByName("Adamant")!)).toBe("+Atk, −SpA");
    expect(effectLabel(getNatureByName("Timid")!)).toBe("+Spe, −Atk");
  });

  it("labels neutral natures as having no changes", () => {
    expect(effectLabel(getNatureByName("Hardy")!)).toBe("No stat changes");
  });
});

describe("natureMode.generate", () => {
  it("always marks a real choice as correct, consistent across directions", () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 300; i++) {
      const q = natureMode.generate({ generation: 9, records: {}, rng });
      expect(q).not.toBeNull();
      if (!q) continue;
      expect(q.choices.map((c) => c.id)).toContain(q.correctChoiceId);
      // No duplicate choices.
      const ids = q.choices.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("only ever asks the forward direction for neutral natures", () => {
    // Force only the neutral 'Hardy' fact into the universe via SRS weighting is
    // hard; instead generate many and assert any neutral-answer question is a
    // "what does it do?" prompt (reverse prompts read "Which nature is …").
    const rng = mulberry32(99);
    for (let i = 0; i < 300; i++) {
      const q = natureMode.generate({ generation: 9, records: {}, rng })!;
      if (q.correctChoiceId === "No stat changes") {
        expect(q.prompt.startsWith("What does the")).toBe(true);
      }
    }
  });

  it("covers all 25 natures over enough draws", () => {
    const rng = mulberry32(123);
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const q = natureMode.generate({ generation: 9, records: {}, rng })!;
      seen.add(q.srsKey);
    }
    expect(seen.size).toBe(NATURES.length);
  });
});
