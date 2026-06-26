import { describe, it, expect, beforeEach } from "vitest";
import { useTrainingStore } from "./trainingStore";

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
