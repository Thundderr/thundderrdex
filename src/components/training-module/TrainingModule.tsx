"use client";

import { useState, useCallback } from "react";
import { TrainingModule as TrainingModuleType } from "@/types/module";
import { ModuleShell } from "@/components/layout/ModuleShell";
import { useModuleStore } from "@/stores/moduleStore";
import { useGenerationStore } from "@/stores/generationStore";
import { useTrainingStore } from "@/stores/trainingStore";
import { TRAINING_MODES, getMode, type ExplainLink, type CalcSetup } from "@/lib/training";
import { accuracyPct, emptyModeStats } from "@/lib/training/srs";
import { TrainingSession } from "./TrainingSession";

interface Props {
  module: TrainingModuleType;
  isOverlay?: boolean;
}

// Map a quiz CalcSetup (Smogon short stat keys) to the Damage Calc's config
// (the app's long stat keys), defaulting EVs to 0 and IVs to 31.
function toCalcConfig(setup: CalcSetup) {
  const ev = (k: keyof NonNullable<CalcSetup["evs"]>) => setup.evs?.[k] ?? 0;
  const iv = (k: keyof NonNullable<CalcSetup["ivs"]>) => setup.ivs?.[k] ?? 31;
  return {
    pokemonName: setup.species,
    level: setup.level,
    nature: setup.nature ?? "Hardy",
    ability: setup.ability ?? null,
    item: setup.item ?? null,
    evs: {
      hp: ev("hp"),
      attack: ev("atk"),
      defense: ev("def"),
      specialAttack: ev("spa"),
      specialDefense: ev("spd"),
      speed: ev("spe"),
    },
    ivs: {
      hp: iv("hp"),
      attack: iv("atk"),
      defense: iv("def"),
      specialAttack: iv("spa"),
      specialDefense: iv("spd"),
      speed: iv("spe"),
    },
  };
}

export function TrainingModule({ module, isOverlay = false }: Props) {
  const store = useModuleStore();
  const setTrainingMode = store.setTrainingMode;
  const generation = useGenerationStore((s) => s.globalGeneration);
  const modeStats = useTrainingStore((s) => s.modeStats);

  // Active quiz session (null = lobby). The session renders *inside* this
  // module's body, so it never leaves the workspace card.
  const [activeModeId, setActiveModeId] = useState<string | null>(null);
  const activeMode = getMode(activeModeId);

  const start = (modeId: string) => {
    setTrainingMode(module.id, modeId);
    setActiveModeId(modeId);
  };

  // Open the real module behind a fact, pre-filling the Damage Calculator with
  // the exact scenario so a quiz answer becomes a hands-on lesson.
  const handleExplain = useCallback(
    (link: ExplainLink) => {
      if (link.kind === "type-chart") {
        store.addTypeChartModule();
      } else if (link.kind === "nature-chart") {
        store.addNatureChartModule();
      } else if (link.kind === "damage-calc") {
        store.addDamageCalcModule();
        const id = useModuleStore.getState().selectedModuleId;
        if (!id) return;
        store.setDamageCalcAttacker(id, toCalcConfig(link.attacker));
        store.setDamageCalcDefender(id, toCalcConfig(link.defender));
        if (link.move) store.setDamageCalcMove(id, link.move);
      }
    },
    [store]
  );

  return (
    <ModuleShell
      module={module}
      isOverlay={isOverlay}
      title={activeMode ? `Dojo · ${activeMode.title}` : "Training Dojo"}
      className="col-span-1 md:col-span-2 flex flex-col"
      bodyClassName="p-4 flex-1 min-h-0 overflow-y-auto"
    >
      {activeMode && !isOverlay ? (
        <TrainingSession
          mode={activeMode}
          generation={generation}
          onExit={() => setActiveModeId(null)}
          onExplain={handleExplain}
        />
      ) : (
        <>
          <p className="mb-3 text-xs text-fg-muted">
            Sharpen your battle instincts. Quizzes use{" "}
            <span className="font-medium text-fg">Generation {generation}</span> and resurface what
            you miss most.
          </p>
          <ul className="flex flex-col gap-2">
            {TRAINING_MODES.map((mode) => {
              const stats = modeStats[mode.id] ?? emptyModeStats();
              return (
                <li
                  key={mode.id}
                  className="flex items-center gap-3 rounded-lg border border-line bg-surface-raised p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-fg">{mode.title}</p>
                    <p className="text-xs text-fg-subtle">{mode.blurb}</p>
                    {stats.attempts > 0 && (
                      <p className="mt-1 text-2xs text-fg-subtle">
                        {accuracyPct(stats)}% over {stats.attempts} · best streak {stats.bestStreak}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => start(mode.id)}
                    className="flex-shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  >
                    Start
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </ModuleShell>
  );
}
