/** Shared sizing/positioning helpers so dropdowns never overflow narrow viewports. */
export const POPOVER_MAXW = "max-w-[calc(100vw-1rem)]";

/** Clamp a portal/fixed dropdown's left so a `width`-px panel stays fully on-screen. */
export function clampLeftToViewport(left: number, width: number, margin = 8): number {
  if (typeof window === "undefined") return left;
  const max = window.innerWidth - width - margin;
  return Math.max(margin, Math.min(left, max));
}
