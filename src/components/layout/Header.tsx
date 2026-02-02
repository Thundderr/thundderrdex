"use client";

import Link from "next/link";
import { useModuleStore } from "@/stores/moduleStore";
import { GenerationSelector } from "./GenerationSelector";

export function Header() {
  const { addModule, addTypeChartModule, addNatureChartModule, addTeamBuilderModule, addDamageCalcModule, addLocationModule } = useModuleStore();

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xl font-bold text-white hover:text-slate-200">
            ThundderrDex
          </Link>
          <GenerationSelector />
        </div>
        <div className="flex items-center gap-2 md:gap-3 overflow-x-auto flex-nowrap">
          <button
            onClick={() => addModule()}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            + Pokemon
          </button>
          <button
            onClick={addTypeChartModule}
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            + Type Chart
          </button>
          <button
            onClick={addNatureChartModule}
            className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            + Nature Chart
          </button>
          <button
            onClick={addTeamBuilderModule}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            + Team Coverage
          </button>
          <button
            onClick={addDamageCalcModule}
            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            + Damage Calc
          </button>
          <button
            onClick={() => addLocationModule()}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            + Location
          </button>
        </div>
      </div>
    </header>
  );
}
