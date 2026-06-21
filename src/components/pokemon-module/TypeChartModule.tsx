"use client";

import { PokemonModule } from "@/types/module";
import { TypeChart } from "@/components/type-chart/TypeChart";
import { ModuleShell } from "@/components/layout/ModuleShell";

interface Props {
  module: PokemonModule;
  isOverlay?: boolean;
}

export function TypeChartModule({ module, isOverlay = false }: Props) {
  return (
    <ModuleShell
      module={module}
      isOverlay={isOverlay}
      title="Type Chart"
      className="col-span-1 md:col-span-2"
      bodyClassName={`p-4 ${module.customHeight ? "flex-1 min-h-0 overflow-y-auto" : ""}`}
    >
      <TypeChart />
    </ModuleShell>
  );
}
