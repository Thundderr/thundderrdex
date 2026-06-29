import { describe, it, expect, beforeEach } from "vitest";
import { useCompetitiveFormatStore } from "./competitiveFormatStore";

beforeEach(() => {
  useCompetitiveFormatStore.setState({ format: "champions-regma" });
});

describe("competitiveFormatStore", () => {
  it("defaults to Champions Reg M-A", () => {
    expect(useCompetitiveFormatStore.getState().format).toBe("champions-regma");
  });

  it("accepts a known format id", () => {
    useCompetitiveFormatStore.getState().setFormat("champions-regma");
    expect(useCompetitiveFormatStore.getState().format).toBe("champions-regma");
  });

  it("ignores unknown / retired format ids", () => {
    // @ts-expect-error — exercising the runtime guard against stale persisted ids
    // (e.g. the retired "vgc-regi") that are no longer in the registry.
    useCompetitiveFormatStore.getState().setFormat("vgc-regi");
    expect(useCompetitiveFormatStore.getState().format).toBe("champions-regma");
  });
});
