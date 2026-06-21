import { describe, it, expect, beforeEach } from "vitest";
import { useUIStore } from "./uiStore";

// Reset to known defaults before each test. These are singleton stores, so we
// drive state directly through the store's own API / setState.
beforeEach(() => {
  useUIStore.setState({
    sidebarOpen: false,
    dashboardHintDismissed: false,
  });
});

describe("uiStore", () => {
  it("has expected defaults", () => {
    const state = useUIStore.getState();
    expect(state.sidebarOpen).toBe(false);
    expect(state.dashboardHintDismissed).toBe(false);
  });

  describe("openSidebar", () => {
    it("sets sidebarOpen to true", () => {
      useUIStore.getState().openSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(true);
    });

    it("is idempotent when already open", () => {
      useUIStore.getState().openSidebar();
      useUIStore.getState().openSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(true);
    });
  });

  describe("closeSidebar", () => {
    it("sets sidebarOpen to false", () => {
      useUIStore.setState({ sidebarOpen: true });
      useUIStore.getState().closeSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(false);
    });

    it("is idempotent when already closed", () => {
      useUIStore.getState().closeSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(false);
    });
  });

  describe("toggleSidebar", () => {
    it("flips false -> true", () => {
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(true);
    });

    it("flips true -> false", () => {
      useUIStore.setState({ sidebarOpen: true });
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(false);
    });

    it("returns to original state after two toggles", () => {
      useUIStore.getState().toggleSidebar();
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(false);
    });
  });

  describe("dismissDashboardHint", () => {
    it("sets dashboardHintDismissed to true", () => {
      useUIStore.getState().dismissDashboardHint();
      expect(useUIStore.getState().dashboardHintDismissed).toBe(true);
    });

    it("does not affect sidebar state", () => {
      useUIStore.setState({ sidebarOpen: true });
      useUIStore.getState().dismissDashboardHint();
      expect(useUIStore.getState().sidebarOpen).toBe(true);
    });
  });
});
