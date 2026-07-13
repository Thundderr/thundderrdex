"use client";

import Link from "next/link";
import { useModuleStore } from "@/stores/moduleStore";
import { GenerationSelector } from "./GenerationSelector";
import { AccountButton } from "@/components/auth/AccountButton";
import { MODULE_ACCENTS } from "@/lib/moduleAccents";
import { ModuleType } from "@/types/module";

// Each button maps to a canonical ModuleType so its accent colour comes from the
// single MODULE_ACCENTS source (shared with badges, selection rings).
const MODULE_BUTTONS = [
  { key: "pokemon", type: "pokemon", action: "addModule", label: "Pokemon", shortLabel: "Pkmn" },
  { key: "typechart", type: "type-chart", action: "addTypeChartModule", label: "Types", shortLabel: "Types" },
  { key: "naturechart", type: "nature-chart", action: "addNatureChartModule", label: "Natures", shortLabel: "Natures" },
  { key: "team", type: "team-builder", action: "addTeamBuilderModule", label: "Coverage", shortLabel: "Team" },
  { key: "damagecalc", type: "damage-calc", action: "addDamageCalcModule", label: "Calculator", shortLabel: "Calc" },
  { key: "location", type: "location", action: "addLocationModule", label: "Location", shortLabel: "Loc" },
  { key: "pokedex", type: "pokedex", action: "addPokedexModule", label: "Pokedex", shortLabel: "Dex" },
  { key: "catchrate", type: "catch-rate", action: "addCatchRateModule", label: "Catch Rate", shortLabel: "Catch" },
  { key: "training", type: "training", action: "addTrainingModule", label: "Training", shortLabel: "Train" },
  { key: "scouting", type: "scouting", action: "addScoutingModule", label: "Scouting", shortLabel: "Scout" },
] as const satisfies ReadonlyArray<{ key: string; type: ModuleType; action: string; label: string; shortLabel: string }>;

export function Header() {
  const store = useModuleStore();

  const handleClick = (action: typeof MODULE_BUTTONS[number]["action"]) => {
    const fn = store[action];
    if (typeof fn === "function") (fn as () => void)();
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-4 py-2 sticky top-0 z-40 flex-shrink-0">
      {/* Desktop layout (md+): single row — title · module buttons · account */}
      <div className="hidden md:flex items-center gap-3">
        <Link href="/" className="text-xl font-bold text-white hover:text-slate-200 flex-shrink-0">
          ThundderrDex
        </Link>
        <div className="flex items-center gap-2 overflow-x-auto flex-nowrap flex-1 pb-1 pl-1">
          {MODULE_BUTTONS.map((btn) => (
            <button
              key={btn.key}
              onClick={() => handleClick(btn.action)}
              className={`px-3 py-1.5 ${MODULE_ACCENTS[btn.type].solid} text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40`}
            >
              + {btn.label}
            </button>
          ))}
        </div>
        <AccountButton />
      </div>

      {/* Mobile layout (<md): two rows — gen selector + account, then buttons */}
      <div className="flex flex-col gap-1 md:hidden pt-1">
        <div className="flex items-center gap-1.5 p-1">
          <div className="flex-1 overflow-x-auto min-w-0">
            <GenerationSelector stretch />
          </div>
          <AccountButton />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto p-1 min-w-0">
          {MODULE_BUTTONS.map((btn) => (
            <button
              key={btn.key}
              onClick={() => handleClick(btn.action)}
              className={`flex-1 px-2 py-1.5 ${MODULE_ACCENTS[btn.type].solid} text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap text-center`}
            >
              + {btn.shortLabel}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
