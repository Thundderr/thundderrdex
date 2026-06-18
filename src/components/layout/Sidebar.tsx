"use client";
import { SidebarContent } from "./SidebarContent";

export function Sidebar() {
  return (
    <aside className="w-48 bg-slate-900 border-r border-slate-800 hidden lg:flex flex-col overflow-hidden">
      <SidebarContent />
    </aside>
  );
}
