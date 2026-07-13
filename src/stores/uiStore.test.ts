import { describe, it, expect, beforeEach } from "vitest";
import { useUIStore } from "./uiStore";

// Reset to known defaults before each test. These are singleton stores, so we
// drive state directly through the store's own API / setState.
beforeEach(() => {
  useUIStore.setState({
    dashboardHintDismissed: false,
  });
});

describe("uiStore", () => {
  it("has expected defaults", () => {
    const state = useUIStore.getState();
    expect(state.dashboardHintDismissed).toBe(false);
  });

  describe("dismissDashboardHint", () => {
    it("sets dashboardHintDismissed to true", () => {
      useUIStore.getState().dismissDashboardHint();
      expect(useUIStore.getState().dashboardHintDismissed).toBe(true);
    });
  });
});
