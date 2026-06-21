import { describe, it, expect, beforeEach } from "vitest";
import { useGenerationStore } from "./generationStore";

// setGeneration calls into moduleStore.resetDamageCalcGimmicks(); importing the
// store pulls moduleStore in too, which loads fine under the localStorage shim.

beforeEach(() => {
  useGenerationStore.setState({
    globalGeneration: 9,
    selectorCollapsed: false,
  });
});

describe("generationStore", () => {
  it("defaults to Gen 9", () => {
    expect(useGenerationStore.getState().globalGeneration).toBe(9);
  });

  it("defaults selectorCollapsed to false", () => {
    expect(useGenerationStore.getState().selectorCollapsed).toBe(false);
  });

  describe("setGeneration", () => {
    it("updates globalGeneration", () => {
      useGenerationStore.getState().setGeneration(1);
      expect(useGenerationStore.getState().globalGeneration).toBe(1);
    });

    it("can be set to any generation number", () => {
      for (const gen of [1, 3, 5, 8, 9]) {
        useGenerationStore.getState().setGeneration(gen);
        expect(useGenerationStore.getState().globalGeneration).toBe(gen);
      }
    });

    it("does not throw when calling into moduleStore", () => {
      expect(() => useGenerationStore.getState().setGeneration(4)).not.toThrow();
    });
  });

  describe("setSelectorCollapsed", () => {
    it("sets collapsed to true", () => {
      useGenerationStore.getState().setSelectorCollapsed(true);
      expect(useGenerationStore.getState().selectorCollapsed).toBe(true);
    });

    it("sets collapsed back to false", () => {
      useGenerationStore.getState().setSelectorCollapsed(true);
      useGenerationStore.getState().setSelectorCollapsed(false);
      expect(useGenerationStore.getState().selectorCollapsed).toBe(false);
    });
  });
});
