import { describe, it, expect, beforeEach } from "vitest";
import { useCompetitiveFormatStore } from "./competitiveFormatStore";

beforeEach(() => {
  useCompetitiveFormatStore.setState({ format: "champions-regma" });
});

describe("competitiveFormatStore", () => {
  it("defaults to Champions Reg M-A", () => {
    expect(useCompetitiveFormatStore.getState().format).toBe("champions-regma");
  });

  it("switches between known formats", () => {
    useCompetitiveFormatStore.getState().setFormat("vgc-regi");
    expect(useCompetitiveFormatStore.getState().format).toBe("vgc-regi");
  });

  it("ignores unknown format ids", () => {
    // @ts-expect-error — exercising the runtime guard against stale persisted ids
    useCompetitiveFormatStore.getState().setFormat("totally-fake");
    expect(useCompetitiveFormatStore.getState().format).toBe("champions-regma");
  });
});
