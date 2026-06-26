"use client";

import { useModuleStore } from "@/stores/moduleStore";
import { MODULE_ACCENTS } from "@/lib/moduleAccents";
import { ModuleType } from "@/types/module";

// A short curated set of starting points — the full set lives in the top bar.
const QUICK_START: { type: ModuleType; label: string; action: keyof ReturnType<typeof useModuleStore.getState> }[] = [
  { type: "pokemon", label: "Pokémon", action: "addModule" },
  { type: "pokedex", label: "Pokédex", action: "addPokedexModule" },
  { type: "damage-calc", label: "Damage Calc", action: "addDamageCalcModule" },
  { type: "type-chart", label: "Type Chart", action: "addTypeChartModule" },
  { type: "training", label: "Training", action: "addTrainingModule" },
];

/**
 * First-run / empty-tab state. Explains what the app is and offers a few one-tap
 * starting points, instead of the old bare "No modules yet" line that assumed the
 * user already knew what the colored "+" buttons did.
 */
export function EmptyDashboard() {
  const store = useModuleStore();

  return (
    <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center px-4 text-center">
      <h2 className="text-xl font-bold text-fg">Build your Pokémon workspace</h2>
      <p className="mt-2 text-sm text-fg-muted">
        ThundderrDex is a modular toolkit — add cards for the Pokédex, damage calc, catch rates, type
        coverage and more, then drag, resize, and arrange them however you like. Each tab is a separate
        workspace.
      </p>
      <p className="mt-4 text-xs font-medium uppercase tracking-wider text-fg-subtle">Start with</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        {QUICK_START.map((q) => (
          <button
            key={q.type}
            onClick={() => {
              const fn = store[q.action];
              if (typeof fn === "function") (fn as () => void)();
            }}
            className={`rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${MODULE_ACCENTS[q.type].solid}`}
          >
            + {q.label}
          </button>
        ))}
      </div>
      <p className="mt-4 text-xs text-fg-subtle">…or pick any card from the bar at the top.</p>
    </div>
  );
}
