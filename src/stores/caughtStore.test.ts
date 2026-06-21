import { describe, it, expect, beforeEach } from "vitest";
import {
  useCaughtStore,
  migrateCaughtState,
  NATIONAL_BUCKET,
  PALDEA_BUCKET,
  CAUGHT_STORE_VERSION,
} from "./caughtStore";

beforeEach(() => {
  useCaughtStore.setState({ caught: {} });
});

describe("caughtStore", () => {
  it("exposes the expected constants", () => {
    expect(NATIONAL_BUCKET).toBe("national");
    expect(PALDEA_BUCKET).toBe("Paldea");
    expect(CAUGHT_STORE_VERSION).toBe(4);
  });

  it("starts with an empty caught map", () => {
    expect(useCaughtStore.getState().caught).toEqual({});
  });

  describe("cycleCaught cycle order", () => {
    it("cycles unmarked -> caught -> not-caught -> unmarked", () => {
      const { cycleCaught } = useCaughtStore.getState();

      // unmarked -> caught
      cycleCaught(NATIONAL_BUCKET, "79");
      expect(useCaughtStore.getState().caught[NATIONAL_BUCKET]["79"]).toBe("caught");

      // caught -> not-caught
      cycleCaught(NATIONAL_BUCKET, "79");
      expect(useCaughtStore.getState().caught[NATIONAL_BUCKET]["79"]).toBe("not-caught");

      // not-caught -> unmarked (key removed)
      cycleCaught(NATIONAL_BUCKET, "79");
      expect(useCaughtStore.getState().caught[NATIONAL_BUCKET]["79"]).toBeUndefined();
    });

    it("fully wraps back to caught on a fourth cycle", () => {
      const { cycleCaught } = useCaughtStore.getState();
      cycleCaught(NATIONAL_BUCKET, "25");
      cycleCaught(NATIONAL_BUCKET, "25");
      cycleCaught(NATIONAL_BUCKET, "25");
      cycleCaught(NATIONAL_BUCKET, "25");
      expect(useCaughtStore.getState().caught[NATIONAL_BUCKET]["25"]).toBe("caught");
    });

    it("removes the key (rather than storing undefined) when cleared", () => {
      const { cycleCaught } = useCaughtStore.getState();
      cycleCaught(NATIONAL_BUCKET, "1");
      cycleCaught(NATIONAL_BUCKET, "1");
      cycleCaught(NATIONAL_BUCKET, "1");
      const marks = useCaughtStore.getState().caught[NATIONAL_BUCKET];
      expect(Object.prototype.hasOwnProperty.call(marks, "1")).toBe(false);
    });
  });

  describe("form-aware keys", () => {
    it("tracks base form and regional variant separately within a bucket", () => {
      const { cycleCaught } = useCaughtStore.getState();
      cycleCaught(NATIONAL_BUCKET, "79"); // base Slowpoke -> caught
      cycleCaught(NATIONAL_BUCKET, "79-galar"); // Galarian -> caught
      cycleCaught(NATIONAL_BUCKET, "79-galar"); // Galarian -> not-caught

      const marks = useCaughtStore.getState().caught[NATIONAL_BUCKET];
      expect(marks["79"]).toBe("caught");
      expect(marks["79-galar"]).toBe("not-caught");
    });
  });

  describe("per-bucket isolation", () => {
    it("does not leak marks between national and regional buckets", () => {
      const { cycleCaught } = useCaughtStore.getState();
      cycleCaught(NATIONAL_BUCKET, "150"); // -> caught
      cycleCaught("Paldea", "150"); // -> caught
      cycleCaught("Paldea", "150"); // -> not-caught

      const state = useCaughtStore.getState().caught;
      expect(state[NATIONAL_BUCKET]["150"]).toBe("caught");
      expect(state["Paldea"]["150"]).toBe("not-caught");
    });

    it("the same key in a fresh bucket starts unmarked", () => {
      const { cycleCaught } = useCaughtStore.getState();
      cycleCaught(NATIONAL_BUCKET, "6");
      cycleCaught(NATIONAL_BUCKET, "6"); // national -> not-caught
      cycleCaught("Galar", "6"); // Galar starts fresh -> caught
      expect(useCaughtStore.getState().caught["Galar"]["6"]).toBe("caught");
    });
  });

  describe("clearCaught", () => {
    it("clears only the named bucket", () => {
      const { cycleCaught, clearCaught } = useCaughtStore.getState();
      cycleCaught(NATIONAL_BUCKET, "1");
      cycleCaught("Paldea", "2");

      clearCaught(NATIONAL_BUCKET);
      const state = useCaughtStore.getState().caught;
      expect(state[NATIONAL_BUCKET]).toBeUndefined();
      expect(state["Paldea"]["2"]).toBe("caught");
    });

    it("clears every bucket when called with no argument", () => {
      const { cycleCaught, clearCaught } = useCaughtStore.getState();
      cycleCaught(NATIONAL_BUCKET, "1");
      cycleCaught("Paldea", "2");

      clearCaught();
      expect(useCaughtStore.getState().caught).toEqual({});
    });
  });

  describe("migrateCaughtState", () => {
    it("returns empty caught for nullish input", () => {
      expect(migrateCaughtState(null)).toEqual({ caught: {} });
      expect(migrateCaughtState(undefined)).toEqual({ caught: {} });
    });

    it("migrates v0 caught-only flat map (true values) into the Paldea bucket", () => {
      const result = migrateCaughtState({ caught: { "1": true, "4": true } });
      expect(result.caught[PALDEA_BUCKET]).toEqual({ "1": "caught", "4": "caught" });
    });

    it("migrates v1 flat 3-state map into the Paldea bucket", () => {
      const result = migrateCaughtState({
        caught: { "1": "caught", "4": "not-caught" },
      });
      expect(result.caught[PALDEA_BUCKET]).toEqual({
        "1": "caught",
        "4": "not-caught",
      });
    });

    it("leaves Paldea bucket absent when no valid flat marks exist", () => {
      const result = migrateCaughtState({ caught: {} });
      expect(result.caught[PALDEA_BUCKET]).toBeUndefined();
    });

    it("normalizes an already-bucketed (v2+) map", () => {
      const result = migrateCaughtState({
        caught: {
          national: { "1": "caught", "79-galar": "not-caught" },
          Paldea: { "4": true },
        },
      });
      expect(result.caught.national).toEqual({
        "1": "caught",
        "79-galar": "not-caught",
      });
      expect(result.caught.Paldea).toEqual({ "4": "caught" });
    });

    it("drops malformed keys (e.g. 'undefined') from bucketed data", () => {
      const result = migrateCaughtState({
        caught: {
          national: { "1": "caught", undefined: "caught", "bad key": "caught" },
        },
      });
      expect(result.caught.national).toEqual({ "1": "caught" });
    });

    it("drops invalid mark values during normalization", () => {
      const result = migrateCaughtState({
        caught: { national: { "1": "garbage", "2": "caught" } },
      });
      expect(result.caught.national).toEqual({ "2": "caught" });
    });
  });
});
