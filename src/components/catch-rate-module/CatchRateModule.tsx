"use client";

import { CatchRateModule as CatchRateModuleType } from "@/types/module";
import { CatchRateCalculator } from "./CatchRateCalculator";
import { ModuleShell } from "@/components/layout/ModuleShell";

interface Props {
  module: CatchRateModuleType;
  isOverlay?: boolean;
}

export function CatchRateModule({ module, isOverlay = false }: Props) {
  return (
    <ModuleShell
      module={module}
      isOverlay={isOverlay}
      title="Catch Rate"
      className={`col-span-1 md:col-span-2 flex flex-col ${module.customHeight ? "" : "max-h-[calc(100vh-9.5rem)]"}`}
      bodyClassName="p-4 flex-1 min-h-0 overflow-y-auto"
    >
      <CatchRateCalculator module={module} />
    </ModuleShell>
  );
}
