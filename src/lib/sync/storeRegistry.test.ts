import { describe, it, expect, beforeEach } from "vitest";
import { SYNCED_STORES } from "./storeRegistry";
import {
  useTrainingStore,
  TRAINING_STORE_VERSION,
  MAX_RECORDS,
  type TrainingPayload,
} from "@/stores/trainingStore";
import type { SrsRecord } from "@/lib/training/srs";

function rec(lastSeenAt = 5): SrsRecord {
  return { box: 3, seen: 2, correct: 2, lastResult: true, lastSeenAt };
}
const trainingConfig = () => SYNCED_STORES.find((c) => c.key === "training")!;

beforeEach(() => {
  useTrainingStore.setState({ records: {}, modeStats: {}, currentStreak: {}, modeSettings: {} });
});

describe("storeRegistry — training", () => {
  it("registers a training store config at the store's schema version", () => {
    const cfg = SYNCED_STORES.find((c) => c.key === "training");
    expect(cfg).toBeDefined();
    expect(cfg!.version).toBe(TRAINING_STORE_VERSION);
  });

  it("getPayload returns only the durable slice (no session-scoped currentStreak)", () => {
    useTrainingStore.getState().recordAnswer("type-eff", "type-eff:a|b", true);
    const payload = trainingConfig().getPayload() as TrainingPayload;
    expect(payload.records["type-eff:a|b"]).toBeDefined();
    expect(payload.modeStats["type-eff"].attempts).toBe(1);
    expect("currentStreak" in payload).toBe(false);
  });

  it("applyPayload writes records/modeStats/modeSettings into the store", () => {
    trainingConfig().applyPayload({
      records: { "x:1": rec() },
      modeStats: { x: { attempts: 2, correct: 2, bestStreak: 2 } },
      modeSettings: { x: { k: "v" } },
    } satisfies TrainingPayload);
    const s = useTrainingStore.getState();
    expect(s.records["x:1"].box).toBe(3);
    expect(s.modeStats.x.attempts).toBe(2);
    expect(s.modeSettings.x.k).toBe("v");
  });

  it("applyPayload prunes an oversized record set down to MAX_RECORDS", () => {
    const records: Record<string, SrsRecord> = {};
    for (let i = 0; i < MAX_RECORDS + 50; i++) records[`k${i}`] = rec(i);
    trainingConfig().applyPayload({ records, modeStats: {}, modeSettings: {} });
    expect(Object.keys(useTrainingStore.getState().records)).toHaveLength(MAX_RECORDS);
  });

  it("isDefault is true only with no progress at all", () => {
    const cfg = trainingConfig();
    expect(cfg.isDefault({ records: {}, modeStats: {}, modeSettings: {} })).toBe(true);
    expect(
      cfg.isDefault({ records: { a: rec() }, modeStats: {}, modeSettings: {} })
    ).toBe(false);
    expect(
      cfg.isDefault({ records: {}, modeStats: { x: { attempts: 1, correct: 0, bestStreak: 0 } }, modeSettings: {} })
    ).toBe(false);
  });

  it("validate accepts a good payload and rejects garbage", () => {
    const cfg = trainingConfig();
    expect(cfg.validate({ records: {}, modeStats: {}, modeSettings: {} })).toBe(true);
    expect(cfg.validate({ nope: true })).toBe(false);
  });

  it("merge is wired to combine two histories", () => {
    const merged = trainingConfig().merge!(
      { records: { a: rec() }, modeStats: {}, modeSettings: {} },
      { records: { b: rec() }, modeStats: {}, modeSettings: {} }
    ) as TrainingPayload;
    expect(Object.keys(merged.records).sort()).toEqual(["a", "b"]);
  });
});
