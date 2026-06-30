import { describe, it, expect, beforeEach } from "vitest";
import {
  useTrainingStore,
  mergeTrainingPayloads,
  MAX_RECORDS,
  type TrainingPayload,
} from "./trainingStore";
import type { SrsRecord } from "@/lib/training/srs";

function rec(p: Partial<SrsRecord> = {}): SrsRecord {
  return { box: 1, seen: 1, correct: 1, lastResult: true, lastSeenAt: 1000, ...p };
}
const empty: TrainingPayload = { records: {}, modeStats: {}, modeSettings: {} };

beforeEach(() => {
  useTrainingStore.setState({ records: {}, modeStats: {}, currentStreak: {}, modeSettings: {} });
});

describe("trainingStore.recordAnswer", () => {
  it("tracks attempts, correctness, and SRS records", () => {
    const { recordAnswer } = useTrainingStore.getState();
    recordAnswer("type-eff", "type-eff:fire|grass", true);
    recordAnswer("type-eff", "type-eff:water|fire", false);

    const s = useTrainingStore.getState();
    expect(s.modeStats["type-eff"].attempts).toBe(2);
    expect(s.modeStats["type-eff"].correct).toBe(1);
    expect(s.records["type-eff:fire|grass"].box).toBe(1);
    expect(s.records["type-eff:water|fire"].box).toBe(0);
  });

  it("builds a streak and records the best one", () => {
    const { recordAnswer } = useTrainingStore.getState();
    recordAnswer("nature", "nature:Adamant", true);
    recordAnswer("nature", "nature:Timid", true);
    expect(useTrainingStore.getState().currentStreak["nature"]).toBe(2);
    expect(useTrainingStore.getState().modeStats["nature"].bestStreak).toBe(2);

    recordAnswer("nature", "nature:Bold", false);
    expect(useTrainingStore.getState().currentStreak["nature"]).toBe(0);
    // Best streak is sticky once achieved.
    expect(useTrainingStore.getState().modeStats["nature"].bestStreak).toBe(2);
  });
});

describe("trainingStore.resetStreak", () => {
  it("clears only the running streak, not lifetime stats", () => {
    const { recordAnswer, resetStreak } = useTrainingStore.getState();
    recordAnswer("speed", "speed:a-vs-b", true);
    resetStreak("speed");
    expect(useTrainingStore.getState().currentStreak["speed"]).toBe(0);
    expect(useTrainingStore.getState().modeStats["speed"].attempts).toBe(1);
  });
});

describe("trainingStore.resetMode", () => {
  it("drops only the target mode's facts and stats", () => {
    const { recordAnswer, resetMode } = useTrainingStore.getState();
    recordAnswer("type-eff", "type-eff:fire|grass", true);
    recordAnswer("will-it-ko", "ko:Tusk-Earthquake-vs-Tran", true);

    resetMode("will-it-ko");

    const s = useTrainingStore.getState();
    expect(s.records["ko:Tusk-Earthquake-vs-Tran"]).toBeUndefined();
    expect(s.modeStats["will-it-ko"]).toBeUndefined();
    // The other mode is untouched.
    expect(s.records["type-eff:fire|grass"]).toBeDefined();
    expect(s.modeStats["type-eff"]).toBeDefined();
  });
});

describe("trainingStore.setModeSetting", () => {
  it("stores per-mode settings independently", () => {
    const { setModeSetting } = useTrainingStore.getState();
    setModeSetting("type-eff", "defender", "mono");
    setModeSetting("nature", "direction", "reverse");
    const s = useTrainingStore.getState();
    expect(s.modeSettings["type-eff"].defender).toBe("mono");
    expect(s.modeSettings["nature"].direction).toBe("reverse");
  });

  it("overwrites a setting without disturbing others", () => {
    const { setModeSetting } = useTrainingStore.getState();
    setModeSetting("type-eff", "defender", "mono");
    setModeSetting("type-eff", "defender", "dual");
    expect(useTrainingStore.getState().modeSettings["type-eff"].defender).toBe("dual");
  });
});

describe("trainingStore.resetAll", () => {
  it("wipes everything", () => {
    const { recordAnswer, resetAll } = useTrainingStore.getState();
    recordAnswer("type-eff", "type-eff:fire|grass", true);
    resetAll();
    const s = useTrainingStore.getState();
    expect(s.records).toEqual({});
    expect(s.modeStats).toEqual({});
    expect(s.currentStreak).toEqual({});
  });
});

describe("mergeTrainingPayloads", () => {
  it("returns the other side's data when one side is empty", () => {
    const populated: TrainingPayload = {
      records: { a: rec() },
      modeStats: { m: { attempts: 1, correct: 1, bestStreak: 1 } },
      modeSettings: { m: { k: "v" } },
    };
    expect(mergeTrainingPayloads(empty, populated)).toEqual(populated);
    expect(mergeTrainingPayloads(populated, empty)).toEqual(populated);
  });

  it("unions disjoint record keys", () => {
    const merged = mergeTrainingPayloads(
      { ...empty, records: { a: rec() } },
      { ...empty, records: { b: rec() } }
    );
    expect(Object.keys(merged.records).sort()).toEqual(["a", "b"]);
  });

  it("combines an overlapping record: sums counts, maxes box, newer wins lastResult", () => {
    const merged = mergeTrainingPayloads(
      { ...empty, records: { a: rec({ box: 2, seen: 4, correct: 3, lastResult: true, lastSeenAt: 100 }) } },
      { ...empty, records: { a: rec({ box: 5, seen: 6, correct: 1, lastResult: false, lastSeenAt: 200 }) } }
    );
    expect(merged.records.a).toEqual({
      box: 5, // max
      seen: 10, // sum
      correct: 4, // sum
      lastResult: false, // remote is newer (200 > 100)
      lastSeenAt: 200, // max
    });
  });

  it("breaks a lastSeenAt tie in favour of local's lastResult", () => {
    const merged = mergeTrainingPayloads(
      { ...empty, records: { a: rec({ lastResult: true, lastSeenAt: 500 }) } },
      { ...empty, records: { a: rec({ lastResult: false, lastSeenAt: 500 }) } }
    );
    expect(merged.records.a.lastResult).toBe(true);
  });

  it("unions modeStats, summing attempts/correct and maxing bestStreak", () => {
    const merged = mergeTrainingPayloads(
      { ...empty, modeStats: { x: { attempts: 10, correct: 6, bestStreak: 5 }, y: { attempts: 1, correct: 1, bestStreak: 1 } } },
      { ...empty, modeStats: { x: { attempts: 4, correct: 3, bestStreak: 9 } } }
    );
    expect(merged.modeStats.x).toEqual({ attempts: 14, correct: 9, bestStreak: 9 });
    expect(merged.modeStats.y).toEqual({ attempts: 1, correct: 1, bestStreak: 1 });
  });

  it("unions modeSettings with local winning on conflict", () => {
    const merged = mergeTrainingPayloads(
      { ...empty, modeSettings: { m: { shared: "local", onlyLocal: "L" } } },
      { ...empty, modeSettings: { m: { shared: "remote", onlyRemote: "R" } } }
    );
    expect(merged.modeSettings.m).toEqual({ shared: "local", onlyLocal: "L", onlyRemote: "R" });
  });

  it("prunes a merged record set back down to MAX_RECORDS, keeping the most recent", () => {
    const local: TrainingPayload = { ...empty, records: {} };
    const remote: TrainingPayload = { ...empty, records: {} };
    for (let i = 0; i < MAX_RECORDS; i++) local.records[`L${i}`] = rec({ lastSeenAt: i }); // old
    for (let i = 0; i < MAX_RECORDS; i++) remote.records[`R${i}`] = rec({ lastSeenAt: 1_000_000 + i }); // new
    const merged = mergeTrainingPayloads(local, remote);
    expect(Object.keys(merged.records)).toHaveLength(MAX_RECORDS);
    expect(merged.records["R0"]).toBeDefined(); // newest kept
    expect(merged.records["L0"]).toBeUndefined(); // oldest evicted
  });

  it("does not mutate its inputs", () => {
    const local: TrainingPayload = { ...empty, records: { a: rec({ seen: 1 }) } };
    const remote: TrainingPayload = { ...empty, records: { a: rec({ seen: 2 }) } };
    mergeTrainingPayloads(local, remote);
    expect(local.records.a.seen).toBe(1);
    expect(remote.records.a.seen).toBe(2);
  });
});
