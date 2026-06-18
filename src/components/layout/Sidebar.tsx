"use client";
import { useMemo } from "react";
import { useModuleStore } from "@/stores/moduleStore";
import { SidebarContent } from "./SidebarContent";

export function Sidebar() {
  const { tabs, activeTabId } = useModuleStore();

  const hasDamageCalc = useMemo(() => {
    const activeTab = tabs.find((t) => t.id === activeTabId);
    const modules = activeTab?.modules || [];
    return modules.some((m) => m.moduleType === "damage-calc");
  }, [tabs, activeTabId]);

  if (hasDamageCalc) return null;

  return (
    <aside className="w-48 bg-slate-900 border-r border-slate-800 hidden lg:flex flex-col overflow-hidden">
      <SidebarContent />
    </aside>
  );
}
