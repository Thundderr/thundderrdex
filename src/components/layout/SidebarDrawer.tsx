"use client";
import { useEffect, useRef } from "react";
import { useUIStore } from "@/stores/uiStore";
import { SidebarContent } from "./SidebarContent";

export function SidebarDrawer() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const closeSidebar = useUIStore((s) => s.closeSidebar);
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Lock body scroll, restore focus, and move focus into the drawer while open
  // (it previously had no scroll lock, so the page scrolled behind it on iOS, and
  // no focus management, so keyboard focus leaked to off-screen content).
  useEffect(() => {
    if (!sidebarOpen) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("button, a, input, select, textarea")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSidebar();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      previouslyFocused.current?.focus?.();
    };
  }, [sidebarOpen, closeSidebar]);

  return (
    <div className={`lg:hidden fixed inset-0 z-50 ${sidebarOpen ? "" : "pointer-events-none"}`} aria-hidden={!sidebarOpen}>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close menu"
        tabIndex={sidebarOpen ? 0 : -1}
        onClick={closeSidebar}
        className={`absolute inset-0 bg-black/60 transition-opacity ${sidebarOpen ? "opacity-100" : "opacity-0"}`}
      />
      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={`absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-surface border-r border-line shadow-xl transition-transform duration-200 flex flex-col motion-reduce:transition-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-3 border-b border-line flex-shrink-0">
          <span className="text-sm font-semibold text-fg">Menu</span>
          <button
            onClick={closeSidebar}
            className="p-2 text-fg-subtle hover:text-fg rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <SidebarContent onNavigate={closeSidebar} />
        </div>
      </div>
    </div>
  );
}
