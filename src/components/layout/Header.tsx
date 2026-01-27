"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useModuleStore } from "@/stores/moduleStore";
import { useGenerationStore } from "@/stores/generationStore";
import { GENERATIONS } from "@/data/generations";

export function Header() {
  const { addModule, addTypeChartModule, addTeamBuilderModule, addDamageCalcModule } = useModuleStore();
  const { globalGeneration, setGeneration } = useGenerationStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xl font-bold text-white hover:text-slate-200">
            ThundderrDex
          </Link>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          {/* Generation Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline">Gen:</span>
            <select
              value={isMounted ? globalGeneration : 9}
              onChange={(e) => setGeneration(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {GENERATIONS.map((gen) => (
                <option key={gen.id} value={gen.id}>
                  {gen.id}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => addModule()}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + Pokemon
          </button>
          <button
            onClick={addTypeChartModule}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + Type Chart
          </button>
          <button
            onClick={addTeamBuilderModule}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + Team Coverage
          </button>
          <button
            onClick={addDamageCalcModule}
            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + Damage Calc
          </button>
        </div>
      </div>
    </header>
  );
}
