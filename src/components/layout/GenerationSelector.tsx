"use client";

import { useGenerationStore } from "@/stores/generationStore";
import { useState, useEffect } from "react";
import { GENERATION_CONFIG } from "@/data/generationGames";
import { GenLetters } from "./GenLetters";

// Horizontal generation picker used in the mobile header row. Desktop uses the
// GenerationRail instead. `stretch` makes the buttons fill the available width.
export function GenerationSelector({ stretch = false }: { stretch?: boolean }) {
  const { globalGeneration, championsMode, setGeneration, setChampionsMode } = useGenerationStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const currentGen = isMounted ? globalGeneration : 9;
  const champions = isMounted ? championsMode : false;

  return (
    <div className={`flex items-center gap-1 ${stretch ? "w-full" : ""}`}>
      {GENERATION_CONFIG.map((config) => {
        // Champions pins the generation to 9 but shouldn't light up Gen 9.
        const isSelected = !champions && config.gen === currentGen;
        return (
          <button
            key={config.gen}
            onClick={() => setGeneration(config.gen)}
            className={`
              relative px-1.5 py-1 rounded transition-all text-xs font-bold ${stretch ? "flex-1 text-center" : ""}
              ${isSelected ? "bg-slate-800 ring-2 ring-blue-500" : "bg-slate-800 hover:bg-slate-700"}
            `}
            title={`Gen ${config.gen}: ${config.letters.map((l) => l.title).join("/")} (Shift+${config.gen})`}
          >
            <span className={`flex items-center ${stretch ? "justify-center" : ""}`}>
              <GenLetters config={config} />
            </span>
          </button>
        );
      })}
      {/* Champions: a battle format layered on Gen 9, toggled on/off here. */}
      <button
        onClick={() => setChampionsMode(!champions)}
        aria-pressed={champions}
        className={`
          relative px-1.5 py-1 rounded transition-all text-xs font-bold ${stretch ? "flex-1 text-center" : ""}
          ${champions ? "bg-slate-800 ring-2 ring-amber-400" : "bg-slate-800 hover:bg-slate-700"}
        `}
        title="Champions — view Pokémon as they are in Pokémon Champions (click to toggle)"
      >
        <span className={`flex items-center ${stretch ? "justify-center" : ""}`} style={{ color: "#FBBF24" }}>
          C
        </span>
      </button>
    </div>
  );
}
