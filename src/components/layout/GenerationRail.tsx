"use client";

import { useState, useEffect } from "react";
import { useGenerationStore } from "@/stores/generationStore";
import { GENERATION_CONFIG } from "@/data/generationGames";
import { GenLetters } from "./GenLetters";

// Thin desktop-only rail down the left edge: one button per generation, the
// current one ring-highlighted. Replaces the old left sidebar and frees the
// header row for the module buttons. The seam below Gen 9 is reserved for the
// future Champions row (separate follow-up spec).
export function GenerationRail() {
  const { globalGeneration, championsMode, setGeneration, setChampionsMode } = useGenerationStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Until the persisted store rehydrates on the client, fall back to the
  // server-rendered defaults (Gen 9, Champions off) so the highlighted button
  // matches on both sides of hydration.
  const currentGen = isMounted ? globalGeneration : 9;
  const champions = isMounted ? championsMode : false;

  return (
    <aside className="hidden md:flex w-12 shrink-0 flex-col items-stretch gap-1 overflow-y-auto border-r border-slate-800 bg-slate-900 p-1">
      {GENERATION_CONFIG.map((config) => {
        // A generation is "selected" only when Champions mode is off — Champions
        // pins the generation to 9, but shouldn't light up the Gen 9 button.
        const isSelected = !champions && config.gen === currentGen;
        return (
          <button
            key={config.gen}
            onClick={() => setGeneration(config.gen)}
            className={`rounded px-1 py-1.5 text-xs font-bold transition-all ${
              isSelected ? "bg-slate-800 ring-2 ring-blue-500" : "bg-slate-800 hover:bg-slate-700"
            }`}
            title={`Gen ${config.gen}: ${config.letters.map((l) => l.title).join("/")} (Shift+${config.gen})`}
          >
            <span className="flex items-center justify-center">
              <GenLetters config={config} />
            </span>
          </button>
        );
      })}

      {/* Champions: a battle format layered on Gen 9, toggled on/off here. */}
      <div className="mt-1 border-t border-slate-800 pt-1">
        <button
          onClick={() => setChampionsMode(!champions)}
          aria-pressed={champions}
          className={`w-full rounded px-1 py-1.5 text-xs font-bold transition-all ${
            champions ? "bg-slate-800 ring-2 ring-amber-400" : "bg-slate-800 hover:bg-slate-700"
          }`}
          title="Champions — view Pokémon as they are in Pokémon Champions (click to toggle)"
        >
          <span className="flex items-center justify-center" style={{ color: "#FBBF24" }}>
            C
          </span>
        </button>
      </div>
    </aside>
  );
}
