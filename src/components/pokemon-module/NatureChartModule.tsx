"use client";

import { PokemonModule } from "@/types/module";
import { NatureChart } from "@/components/nature-chart/NatureChart";
import { ModuleShell } from "@/components/layout/ModuleShell";

interface Props {
  module: PokemonModule;
  isOverlay?: boolean;
}

export function NatureChartModule({ module, isOverlay = false }: Props) {
  return (
    <ModuleShell
      module={module}
      isOverlay={isOverlay}
      title="Nature Chart"
      className="col-span-1 md:col-span-2"
      bodyClassName={`p-4 ${module.customHeight ? "flex-1 min-h-0 overflow-y-auto" : ""}`}
    >
      <NatureChart />
    </ModuleShell>
  );
}
