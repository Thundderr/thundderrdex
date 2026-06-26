import { describe, it, expect } from "vitest";
import {
  MAX_BOX,
  emptyRecord,
  applyResult,
  selectionWeight,
  pickWeightedKey,
  emptyModeStats,
  accuracyPct,
  type SrsRecord,
} from "./srs";

describe("applyResult", () => {
  it("promotes the box on a correct answer", () => {
    const r = applyResult(undefined, true, 1000);
    expect(r.box).toBe(1);
    expect(r.seen).toBe(1);
    expect(r.correct).toBe(1);
    expect(r.lastResult).toBe(true);
    expect(r.lastSeenAt).toBe(1000);
  });

  it("resets the box to 0 on a wrong answer", () => {
    let r = applyResult(undefined, true, 1);
    r = applyResult(r, true, 2);
    expect(r.box).toBe(2);
    r = applyResult(r, false, 3);
    expect(r.box).toBe(0);
    expect(r.correct).toBe(2);
    expect(r.seen).toBe(3);
  });

  it("caps the box at MAX_BOX", () => {
    let r: SrsRecord | undefined;
    for (let i = 0; i < MAX_BOX + 5; i++) r = applyResult(r, true, i);
    expect(r!.box).toBe(MAX_BOX);
  });

  it("does not mutate the input record", () => {
    const r = emptyRecord();
    applyResult(r, true, 5);
    expect(r).toEqual(emptyRecord());
  });
});

describe("selectionWeight", () => {
  it("prefers unseen facts most strongly", () => {
    const unseen = selectionWeight(undefined);
    const mastered = selectionWeight({ box: MAX_BOX, seen: 9, correct: 9, lastResult: true, lastSeenAt: 0 });
    const struggling = selectionWeight({ box: 0, seen: 3, correct: 0, lastResult: false, lastSeenAt: 0 });
    expect(unseen).toBeGreaterThan(struggling);
    expect(struggling).toBeGreaterThan(mastered);
  });

  it("adds a bonus for a freshly-missed fact", () => {
    const missed = selectionWeight({ box: 1, seen: 2, correct: 1, lastResult: false, lastSeenAt: 0 });
    const hit = selectionWeight({ box: 1, seen: 2, correct: 2, lastResult: true, lastSeenAt: 0 });
    expect(missed).toBeGreaterThan(hit);
  });
});

describe("pickWeightedKey", () => {
  it("returns null for an empty universe", () => {
    expect(pickWeightedKey([], {}, () => 0.5)).toBeNull();
  });

  it("always returns a key from the universe", () => {
    const keys = ["a", "b", "c"];
    for (const roll of [0, 0.3, 0.6, 0.99]) {
      expect(keys).toContain(pickWeightedKey(keys, {}, () => roll));
    }
  });

  it("picks the unseen key over mastered ones with a mid roll", () => {
    const keys = ["mastered", "unseen"];
    const records = {
      mastered: { box: MAX_BOX, seen: 5, correct: 5, lastResult: true, lastSeenAt: 0 },
    };
    // With rng=0 the very first key is chosen, so use a roll that lands past the
    // first (tiny) weight to confirm weighting favours the unseen key.
    expect(pickWeightedKey(keys, records, () => 0.5)).toBe("unseen");
  });
});

describe("accuracyPct", () => {
  it("is 0 with no attempts", () => {
    expect(accuracyPct(emptyModeStats())).toBe(0);
  });

  it("rounds to the nearest percent", () => {
    expect(accuracyPct({ attempts: 3, correct: 2, bestStreak: 2 })).toBe(67);
  });
});
