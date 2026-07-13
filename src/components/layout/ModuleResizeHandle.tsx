"use client";

import { CSSProperties } from "react";
import { useModuleStore } from "@/stores/moduleStore";
import { BaseModule } from "@/types/module";

// Smallest useful module height — keeps the header and a sliver of content visible
const MIN_HEIGHT = 160;
// Ignore pointer jitter below this so a sloppy click doesn't lock in a size
const MOVE_THRESHOLD = 4;

// Data-heavy modules stretch to fill the available column height rather than
// stopping at a fixed size: a floor so they're never cramped, and a ceiling of
// one screen so a content-rich module scrolls internally instead of growing
// unbounded. The grid stretches its rows (align-content), so with a sparse
// dashboard the row — and these modules — fill the viewport, while a dense
// dashboard falls back to natural, capped heights. dvh (not vh) tracks mobile
// browser chrome. A user drag (customHeight) always overrides both bounds.
export const MODULE_TALL_MIN = "24rem";
export const MODULE_TALL_MAX = "100dvh";

/**
 * Inline style for a module's root element carrying its size.
 * Width is expressed as a CSS variable consumed by the .module-cols rule
 * (media-queried, so it can't break the single-column mobile layout);
 * height is the user's pixel height, else the fluid default when `defaultTall`.
 */
export function moduleSizeStyle(module: BaseModule, defaultTall = false): CSSProperties {
  const style: CSSProperties & Record<string, string | number> = {};
  if (module.customWidthCols) style["--module-cols"] = module.customWidthCols;
  if (module.customHeight) {
    style.height = `${module.customHeight}px`;
  } else if (defaultTall) {
    // No fixed height: the grid row stretches these to fill available space
    // (down to the min), and the max keeps a content-rich module scrolling
    // internally rather than running off the page.
    style.minHeight = MODULE_TALL_MIN;
    style.maxHeight = MODULE_TALL_MAX;
  }
  return style;
}

/**
 * Classes for a module's root element. `relative` anchors the resize handle;
 * a constrained height (user-set or fluid default) turns the root into a column
 * flexbox so the content area (given flex-1/min-h-0 by the module) scrolls
 * instead of overflowing.
 */
export function moduleSizeClasses(module: BaseModule, defaultTall = false): string {
  let classes = "relative";
  if (module.customWidthCols) classes += " module-cols";
  if (module.customHeight || defaultTall) classes += " flex flex-col";
  return classes;
}

/**
 * Drag handle in a module's bottom-right corner. Dragging snaps width to
 * whole grid columns and sets a free-form pixel height; double-click resets
 * the module to its default size. During the drag, sizes are applied
 * imperatively to the DOM for smoothness and only committed to the store
 * (and thus persistence/cloud sync) on release.
 */
export function ModuleResizeHandle({ moduleId }: { moduleId: string }) {
  const setModuleSize = useModuleStore((s) => s.setModuleSize);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const handle = e.currentTarget;
    const root = handle.closest("[data-module-root]") as HTMLElement | null;
    const grid = root?.parentElement;
    if (!root || !grid) return;

    const gridStyle = getComputedStyle(grid);
    const trackCount = gridStyle.gridTemplateColumns.split(" ").length;
    const gap = parseFloat(gridStyle.columnGap) || 0;
    const colWidth = (grid.clientWidth - gap * (trackCount - 1)) / trackCount;

    const startRect = root.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startSpan = Math.min(
      trackCount,
      Math.max(1, Math.round((startRect.width + gap) / (colWidth + gap)))
    );

    let span = startSpan;
    let height = startRect.height;
    let movedX = false;
    let movedY = false;

    handle.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (Math.abs(dx) > MOVE_THRESHOLD) movedX = true;
      if (Math.abs(dy) > MOVE_THRESHOLD) movedY = true;

      if (movedX && trackCount > 1) {
        const desiredWidth = startRect.width + dx;
        span = Math.min(
          trackCount,
          Math.max(1, Math.round((desiredWidth + gap) / (colWidth + gap)))
        );
        root.style.setProperty("--module-cols", String(span));
        root.classList.add("module-cols");
      }
      if (movedY) {
        height = Math.max(MIN_HEIGHT, startRect.height + dy);
        root.style.height = `${Math.round(height)}px`;
        root.classList.add("flex", "flex-col");
      }
    };

    const finish = (commit: boolean) => {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onCancel);
      if (commit && (movedX || movedY)) {
        // Only commit dimensions the user actually dragged, so e.g. a pure
        // width resize doesn't freeze the module's auto height
        setModuleSize(moduleId, {
          ...(movedX && trackCount > 1 ? { widthCols: span } : {}),
          ...(movedY ? { height: Math.round(height) } : {}),
        });
      } else {
        // Drag never took effect — undo any imperative styling
        root.style.height = "";
        root.style.removeProperty("--module-cols");
      }
    };

    const onUp = () => finish(true);
    const onCancel = () => finish(false);

    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onCancel);
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    const root = (e.currentTarget as HTMLElement).closest("[data-module-root]") as HTMLElement | null;
    if (root) {
      root.style.height = "";
      root.style.removeProperty("--module-cols");
    }
    setModuleSize(moduleId, { widthCols: null, height: null });
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onDoubleClick={handleReset}
      onClick={(e) => e.stopPropagation()}
      role="separator"
      aria-label="Resize module (drag); double-click to reset"
      // Always visible (was near-invisible text-slate-600 + hover-only) with a
      // larger hit area so the resize affordance is actually discoverable.
      className="absolute bottom-0 right-0 z-20 flex h-7 w-7 cursor-se-resize touch-none items-end justify-end p-1.5 text-fg-subtle hover:text-fg"
      title="Drag to resize • Double-click to reset"
    >
      <svg viewBox="0 0 12 12" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
        <circle cx="10" cy="10" r="1" />
        <circle cx="10" cy="6" r="1" />
        <circle cx="6" cy="10" r="1" />
        <circle cx="10" cy="2" r="1" />
        <circle cx="2" cy="10" r="1" />
        <circle cx="6" cy="6" r="1" />
      </svg>
    </div>
  );
}
