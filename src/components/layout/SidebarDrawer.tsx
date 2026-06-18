"use client";
import { useUIStore } from "@/stores/uiStore";
import { SidebarContent } from "./SidebarContent";

export function SidebarDrawer() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const closeSidebar = useUIStore((s) => s.closeSidebar);
  return (
    <div className={`lg:hidden fixed inset-0 z-50 ${sidebarOpen ? "" : "pointer-events-none"}`} aria-hidden={!sidebarOpen}>
      {/* Backdrop */}
      <div
        onClick={closeSidebar}
        className={`absolute inset-0 bg-black/60 transition-opacity ${sidebarOpen ? "opacity-100" : "opacity-0"}`}
      />
      {/* Panel */}
      <div
        className={`absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 shadow-xl transition-transform duration-200 flex flex-col ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-3 border-b border-slate-800 flex-shrink-0">
          <span className="text-sm font-semibold text-white">Menu</span>
          <button onClick={closeSidebar} className="p-2 text-slate-400 hover:text-white rounded" aria-label="Close menu">
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
