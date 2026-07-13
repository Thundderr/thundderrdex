"use client";

import { CatchRateModule as CatchRateModuleType } from "@/types/module";
import { CatchRateCalculator } from "./CatchRateCalculator";
import { ModuleShell } from "@/components/layout/ModuleShell";
import { useGenerationStore } from "@/stores/generationStore";
import { ChampionsNotApplicableBanner } from "@/components/champions/ChampionsNotApplicableBanner";

interface Props {
  module: CatchRateModuleType;
  isOverlay?: boolean;
}

export function CatchRateModule({ module, isOverlay = false }: Props) {
  const championsMode = useGenerationStore((s) => s.championsMode);
  return (
    <ModuleShell
      module={module}
      isOverlay={isOverlay}
      title="Catch Rate"
      defaultTall
      className="col-span-1 md:col-span-2"
      bodyClassName="p-4 flex-1 min-h-0 overflow-y-auto"
    >
      {championsMode && <ChampionsNotApplicableBanner feature="wild encounters or catching" />}
      <CatchRateCalculator module={module} />
    </ModuleShell>
  );
}
