import { describe, it, expect, beforeEach } from "vitest";
import { useGenerationStore } from "./generationStore";

// setGeneration calls into moduleStore.resetDamageCalcGimmicks(); importing the
// store pulls moduleStore in too, which loads fine under the localStorage shim.

beforeEach(() => {
  useGenerationStore.setState({
    globalGeneration: 9,
    championsMode: false,
  });
});

describe("generationStore", () => {
  it("defaults to Gen 9", () => {
    expect(useGenerationStore.getState().globalGeneration).toBe(9);
  });

  it("defaults championsMode to false", () => {
    expect(useGenerationStore.getState().championsMode).toBe(false);
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

    it("leaves Champions mode when a generation is picked", () => {
      useGenerationStore.getState().setChampionsMode(true);
      useGenerationStore.getState().setGeneration(3);
      expect(useGenerationStore.getState().championsMode).toBe(false);
      expect(useGenerationStore.getState().globalGeneration).toBe(3);
    });
  });

  describe("setChampionsMode", () => {
    it("enables Champions and pins the generation to 9", () => {
      useGenerationStore.getState().setGeneration(3);
      useGenerationStore.getState().setChampionsMode(true);
      expect(useGenerationStore.getState().championsMode).toBe(true);
      expect(useGenerationStore.getState().globalGeneration).toBe(9);
    });

    it("disables Champions without changing the generation", () => {
      useGenerationStore.getState().setChampionsMode(true);
      useGenerationStore.getState().setChampionsMode(false);
      expect(useGenerationStore.getState().championsMode).toBe(false);
      expect(useGenerationStore.getState().globalGeneration).toBe(9);
    });

    it("does not throw when calling into moduleStore", () => {
      expect(() => useGenerationStore.getState().setChampionsMode(true)).not.toThrow();
    });
  });
});
