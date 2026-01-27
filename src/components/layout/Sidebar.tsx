"use client";

import { useState, useEffect } from "react";
import { useGenerationStore } from "@/stores/generationStore";
import { useModuleStore } from "@/stores/moduleStore";
import { GENERATIONS } from "@/data/generations";
import { formatPokemonName } from "@/lib/pokeapi/transformers";

export function Sidebar() {
  const { globalGeneration } = useGenerationStore();
  const { modules, recentSearches, restoreFromRecent, clearRecentSearches, bringModuleToFront } = useModuleStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const currentGen = GENERATIONS.find((g) => g.id === globalGeneration);

  // Get current Pokemon modules (only those with a Pokemon selected)
  const currentPokemon = modules
    .filter((m) => m.moduleType === "pokemon" && m.pokemonName)
    .map((m) => ({ id: m.id, name: m.pokemonName! }));

  return (
    <aside className="w-48 bg-slate-900 border-r border-slate-800 p-4 hidden lg:flex flex-col overflow-hidden">
      {/* Current Generation Info */}
      <div className="bg-slate-800 rounded-lg p-3 mb-4 flex-shrink-0">
        <h3 className="text-sm font-semibold text-white">
          Gen {currentGen?.id || globalGeneration}
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          {currentGen?.region || "Unknown"}
        </p>
      </div>

      {/* Current Pokemon */}
      {isMounted && currentPokemon.length > 0 && (
        <div className="mb-4 flex-shrink-0 max-h-32 overflow-hidden flex flex-col">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Current
          </h3>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {currentPokemon.map((pokemon) => (
              <button
                key={pokemon.id}
                onClick={() => bringModuleToFront(pokemon.id)}
                className="w-full text-left px-2 py-1.5 text-sm text-blue-300 hover:bg-slate-800 rounded transition-colors truncate"
                title={`Bring ${formatPokemonName(pokemon.name)} to front`}
              >
                {formatPokemonName(pokemon.name)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Searches */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-2 flex-shrink-0">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Recent
          </h3>
          {isMounted && recentSearches.length > 0 && (
            <button
              onClick={clearRecentSearches}
              className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {isMounted && recentSearches.length > 0 ? (
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {recentSearches.map((recent) => (
              <button
                key={recent.pokemonName}
                onClick={() => restoreFromRecent(recent.pokemonName)}
                className="w-full text-left px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-800 rounded transition-colors truncate"
                title={`Restore ${formatPokemonName(recent.pokemonName)}`}
              >
                {formatPokemonName(recent.pokemonName)}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            {isMounted ? "No recent searches" : "Loading..."}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-slate-800 mt-4">
        <p className="text-xs text-slate-500">
          Data from{" "}
          <a
            href="https://pokeapi.co"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            PokeAPI
          </a>
        </p>
      </div>
    </aside>
  );
}
