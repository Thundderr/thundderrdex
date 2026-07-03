"use client";

import { useMemo, useState } from "react";
import { ModuleShell } from "@/components/layout/ModuleShell";
import { SearchBar } from "@/components/pokemon-module/SearchBar";
import { useModuleStore } from "@/stores/moduleStore";
import { useCompetitiveFormatStore } from "@/stores/competitiveFormatStore";
import { useUsageStats } from "@/hooks/useUsageStats";
import { getCompetitiveFormat } from "@/lib/competitive/formats";
import { indexBySpecies } from "@/lib/competitive/smogonStats";
import { toAppSpecies } from "@/lib/competitive/sources";
import { ScoutingModule as ScoutingModuleType } from "@/types/module";
import { ScoutingColumn } from "./ScoutingColumn";

interface Props {
  module: ScoutingModuleType;
  isOverlay?: boolean;
}

export function ScoutingModule({ module, isOverlay = false }: Props) {
  const { setScoutingSlot, clearScoutingSlot } = useModuleStore();
  const format = useCompetitiveFormatStore((s) => s.format);
  const formatLabel = getCompetitiveFormat(format).label;
  const { data: usage, isLoading: usageLoading, isError: usageError } = useUsageStats(format);
  const [pickingSlot, setPickingSlot] = useState<number | null>(null);

  const speciesIndex = useMemo(() => (usage ? indexBySpecies(usage) : null), [usage]);

  return (
    <ModuleShell
      module={module}
      isOverlay={isOverlay}
      title={`Scouting · ${formatLabel}`}
      defaultTall
      className="col-span-1 md:col-span-2"
      bodyClassName="p-3 flex-1 overflow-auto"
    >
      {usageError && (
        <p className="mb-2 text-xs text-red-400">Couldn't load usage data — base stats still work.</p>
      )}
      <div className="flex gap-2">
        {module.slots.map((name, i) => {
          if (name) {
            const entry = speciesIndex ? speciesIndex.get(toAppSpecies(name)) ?? null : null;
            return (
              <ScoutingColumn
                key={i}
                name={name}
                entry={entry}
                usageLoading={usageLoading}
                onClear={() => clearScoutingSlot(module.id, i)}
              />
            );
          }
          return (
            <div
              key={i}
              className="flex w-[220px] shrink-0 flex-col rounded-lg border border-dashed border-line bg-surface p-2"
            >
              {pickingSlot === i ? (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-2xs text-fg-subtle">Add Pokémon</span>
                    <button
                      onClick={() => setPickingSlot(null)}
                      className="rounded px-1 text-2xs text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg"
                    >
                      Cancel
                    </button>
                  </div>
                  <SearchBar
                    currentPokemon={null}
                    onSelect={(picked) => {
                      setScoutingSlot(module.id, i, picked);
                      setPickingSlot(null);
                    }}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setPickingSlot(i)}
                  className="flex min-h-[180px] w-full flex-1 flex-col items-center justify-center gap-1 rounded text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg"
                >
                  <span className="text-2xl leading-none">＋</span>
                  <span className="text-2xs">Add Pokémon</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </ModuleShell>
  );
}
