import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIStore {
  /** One-time dashboard affordance hint (drag/resize/minimize). Persisted. */
  dashboardHintDismissed: boolean;
  dismissDashboardHint: () => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      dashboardHintDismissed: false,
      dismissDashboardHint: () => set({ dashboardHintDismissed: true }),
    }),
    {
      name: "thundderrdex-ui",
      partialize: (s) => ({ dashboardHintDismissed: s.dashboardHintDismissed }),
    }
  )
);
