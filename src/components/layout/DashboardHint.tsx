"use client";

import { useUIStore } from "@/stores/uiStore";

/**
 * One-time, dismissible strip teaching the module interactions that are otherwise
 * undiscoverable (drag to rearrange, drag the corner to resize, minimize). Shown
 * once modules exist; dismissal is persisted in the UI store.
 */
export function DashboardHint() {
  const dismissed = useUIStore((s) => s.dashboardHintDismissed);
  const dismiss = useUIStore((s) => s.dismissDashboardHint);

  if (dismissed) return null;

  return (
    <div className="mb-3 flex items-center gap-3 rounded-lg border border-line bg-surface-raised px-3 py-2 text-xs text-fg-muted">
      <svg className="h-4 w-4 shrink-0 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="flex-1">
        Drag the <span className="font-medium text-fg">grip</span> to rearrange cards, drag a card’s{" "}
        <span className="font-medium text-fg">bottom-right corner</span> to resize, and use the{" "}
        <span className="font-medium text-fg">chevron</span> to minimize.
      </p>
      <button
        onClick={dismiss}
        aria-label="Dismiss tip"
        className="shrink-0 rounded p-1 text-fg-subtle hover:bg-surface-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
