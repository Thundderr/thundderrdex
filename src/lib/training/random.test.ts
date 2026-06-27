import { describe, it, expect } from "vitest";
import { weightedIndex, pickWeighted, pickWeightedPair } from "./random";

describe("weightedIndex", () => {
  it("only ever returns a nonzero-weight index", () => {
    for (const roll of [0, 0.25, 0.5, 0.75, 0.999]) {
      expect(weightedIndex(() => roll, [0, 0, 10, 0])).toBe(2);
    }
  });

  it("splits proportionally to the weights", () => {
    // total 100; roll 0.5 → 50 → falls in the second (weight-99) bucket.
    expect(weightedIndex(() => 0.5, [1, 99])).toBe(1);
    expect(weightedIndex(() => 0.0, [1, 99])).toBe(0);
  });

  it("falls back to uniform when all weights are zero", () => {
    expect(weightedIndex(() => 0.0, [0, 0, 0])).toBe(0);
    expect(weightedIndex(() => 0.99, [0, 0, 0])).toBe(2);
  });
});

describe("pickWeighted", () => {
  it("returns the item at the weighted index", () => {
    expect(pickWeighted(() => 0.0, ["a", "b", "c"], [5, 0, 0])).toBe("a");
    expect(pickWeighted(() => 0.0, ["a", "b", "c"], [0, 0, 5])).toBe("c");
  });
});

describe("pickWeightedPair", () => {
  it("returns two distinct items", () => {
    for (let i = 0; i < 50; i++) {
      const rng = () => (i % 7) / 7;
      const [a, b] = pickWeightedPair(rng, ["x", "y", "z", "w"], [4, 3, 2, 1]);
      expect(a).not.toBe(b);
    }
  });

  it("favours the heavier weights for the first pick", () => {
    // rng=0 always takes the first nonzero bucket; with all weight on index 0 it's "a".
    const [a] = pickWeightedPair(() => 0, ["a", "b", "c"], [10, 1, 1]);
    expect(a).toBe("a");
  });
});
