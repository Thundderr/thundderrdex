import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIStore {
  sidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  /** One-time dashboard affordance hint (drag/resize/minimize). Persisted. */
  dashboardHintDismissed: boolean;
  dismissDashboardHint: () => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      openSidebar: () => set({ sidebarOpen: true }),
      closeSidebar: () => set({ sidebarOpen: false }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      dashboardHintDismissed: false,
      dismissDashboardHint: () => set({ dashboardHintDismissed: true }),
    }),
    {
      name: "thundderrdex-ui",
      // Only the one-time hint should survive reloads — sidebar open state is transient.
      partialize: (s) => ({ dashboardHintDismissed: s.dashboardHintDismissed }),
    }
  )
);
