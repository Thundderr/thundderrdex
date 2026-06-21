import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { clampLeftToViewport, POPOVER_MAXW } from "./popoverPosition";

describe("POPOVER_MAXW", () => {
  it("is the expected tailwind max-width clamp", () => {
    expect(POPOVER_MAXW).toBe("max-w-[calc(100vw-1rem)]");
  });
});

describe("clampLeftToViewport", () => {
  const originalWindow = (globalThis as { window?: unknown }).window;

  beforeEach(() => {
    (globalThis as { window?: unknown }).window = { innerWidth: 1024 };
  });

  afterEach(() => {
    if (originalWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = originalWindow;
    }
  });

  it("returns left unchanged when the panel fits comfortably", () => {
    // window 1024, width 200, margin 8 => max = 1024 - 200 - 8 = 816
    // left 100 is between margin (8) and max (816), so unchanged
    expect(clampLeftToViewport(100, 200)).toBe(100);
  });

  it("clamps to the right edge max when the panel would overflow the right", () => {
    // max = 1024 - 200 - 8 = 816; left 900 exceeds it
    expect(clampLeftToViewport(900, 200)).toBe(816);
  });

  it("clamps to the margin when left is below the margin (near left edge)", () => {
    expect(clampLeftToViewport(0, 200)).toBe(8);
  });

  it("clamps negative left values up to the margin", () => {
    expect(clampLeftToViewport(-50, 200)).toBe(8);
  });

  it("returns exactly the margin at the boundary", () => {
    expect(clampLeftToViewport(8, 200)).toBe(8);
  });

  it("returns exactly the max at the right boundary", () => {
    expect(clampLeftToViewport(816, 200)).toBe(816);
  });

  it("honors a custom margin", () => {
    // max = 1024 - 200 - 20 = 804
    expect(clampLeftToViewport(900, 200, 20)).toBe(804);
    expect(clampLeftToViewport(0, 200, 20)).toBe(20);
  });

  it("clamps to the margin when the panel is wider than the viewport", () => {
    // width 2000 > innerWidth: max = 1024 - 2000 - 8 = -984
    // Math.min(left, -984) then Math.max(8, ...) => 8 wins
    expect(clampLeftToViewport(100, 2000)).toBe(8);
  });

  it("recomputes against a narrower viewport", () => {
    (globalThis as { window?: { innerWidth: number } }).window = { innerWidth: 320 };
    // max = 320 - 200 - 8 = 112
    expect(clampLeftToViewport(300, 200)).toBe(112);
    expect(clampLeftToViewport(50, 200)).toBe(50);
  });

  it("returns the original left when window is undefined", () => {
    delete (globalThis as { window?: unknown }).window;
    expect(clampLeftToViewport(99999, 200)).toBe(99999);
    expect(clampLeftToViewport(-99999, 200)).toBe(-99999);
  });
});
