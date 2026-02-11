"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useQueryClient } from "@tanstack/react-query";
import { useGenerationStore } from "@/stores/generationStore";
import { useModuleStore } from "@/stores/moduleStore";
import { usePokemonList } from "@/hooks/usePokemonList";
import { GENERATIONS } from "@/data/generations";
import { formatPokemonName } from "@/lib/pokeapi/transformers";
import { clearAllCache } from "@/lib/queryPersister";

// Pokemon generation ranges by Pokedex number
function getPokemonGeneration(pokedexId: number): number {
  if (pokedexId <= 151) return 1;
  if (pokedexId <= 251) return 2;
  if (pokedexId <= 386) return 3;
  if (pokedexId <= 493) return 4;
  if (pokedexId <= 649) return 5;
  if (pokedexId <= 721) return 6;
  if (pokedexId <= 809) return 7;
  if (pokedexId <= 905) return 8;
  return 9;
}

export function Sidebar() {
  const { globalGeneration, setGeneration } = useGenerationStore();
  const { tabs, activeTabId, getRecentSearches, restoreFromRecent, clearRecentSearches, bringModuleToFront } = useModuleStore();
  const recentSearches = getRecentSearches();
  const { data: pokemonList } = usePokemonList();
  const queryClient = useQueryClient();
  const [isMounted, setIsMounted] = useState(false);
  const [showClearCacheConfirm, setShowClearCacheConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      // Clear React Query in-memory cache
      queryClient.clear();
      // Clear IndexedDB persisted cache
      const success = await clearAllCache();
      if (success) {
        // Reload the page to ensure fresh state
        window.location.reload();
      } else {
        alert("Failed to clear cache. Please try again.");
        setIsClearing(false);
        setShowClearCacheConfirm(false);
      }
    } catch (error) {
      console.error("Error clearing cache:", error);
      alert("Failed to clear cache. Please try again.");
      setIsClearing(false);
      setShowClearCacheConfirm(false);
    }
  };

  const currentGen = GENERATIONS.find((g) => g.id === globalGeneration);

  // Get modules from active tab
  const modules = useMemo(() => {
    const activeTab = tabs.find((t) => t.id === activeTabId);
    return activeTab?.modules || [];
  }, [tabs, activeTabId]);

  // Create a lookup map from Pokemon name to ID
  const pokemonIdMap = useMemo(() => {
    if (!pokemonList) return new Map<string, number>();
    return new Map(pokemonList.map((p) => [p.name, p.id]));
  }, [pokemonList]);

  // Create a lookup map from Pokemon name to sprite URL
  const pokemonSpriteMap = useMemo(() => {
    if (!pokemonList) return new Map<string, string>();
    return new Map(pokemonList.map((p) => [p.name, p.spriteUrl]));
  }, [pokemonList]);

  // Get module display info
  const getModuleInfo = (module: import("@/types/module").AnyModule) => {
    switch (module.moduleType) {
      case "pokemon": {
        const pokemonModule = module as import("@/types/module").PokemonModule;
        const name = pokemonModule.pokemonName;
        if (!name) return { label: "Pokemon", color: "text-blue-300", icon: "🔍" };
        const pokeId = pokemonIdMap.get(name);
        const pokeGen = pokeId ? getPokemonGeneration(pokeId) : 1;
        const existsInGen = pokeGen <= globalGeneration;
        const spriteUrl = pokemonSpriteMap.get(name);
        return {
          label: formatPokemonName(name),
          color: existsInGen ? "text-blue-300" : "text-slate-500",
          icon: null,
          spriteUrl,
          pokeGen: existsInGen ? null : pokeGen,
        };
      }
      case "type-chart":
        return { label: "Type Chart", color: "text-slate-300", icon: "📊" };
      case "team-builder":
        return { label: "Team Coverage", color: "text-purple-300", icon: "👥" };
      case "damage-calc":
        return { label: "Damage Calc", color: "text-orange-300", icon: null, spriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" };
      case "pokedex":
        return { label: "Pokedex", color: "text-emerald-300", icon: "📖" };
      default:
        return { label: "Module", color: "text-slate-300", icon: "📦" };
    }
  };

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

      {/* Current Modules */}
      {isMounted && modules.length > 0 && (
        <div className="mb-4 flex-shrink-0 flex flex-col" style={{ maxHeight: '300px' }}>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Modules
          </h3>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {modules.map((module) => {
              const info = getModuleInfo(module);

              return (
                <div key={module.id} className="flex items-center gap-1">
                  <button
                    onClick={() => bringModuleToFront(module.id)}
                    className={`flex-1 text-left px-2 py-1.5 text-sm rounded transition-colors truncate ${info.color} hover:bg-slate-800 flex items-center gap-1`}
                    title={`Bring ${info.label} to front`}
                  >
                    {info.spriteUrl ? (
                      <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                        <Image
                          src={info.spriteUrl}
                          alt=""
                          width={20}
                          height={20}
                          className="pixelated object-contain"
                          unoptimized
                        />
                      </div>
                    ) : info.icon ? (
                      <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center">{info.icon}</span>
                    ) : null}
                    <span className="truncate">{info.label}</span>
                  </button>
                  {info.pokeGen && (
                    <button
                      onClick={() => setGeneration(info.pokeGen!)}
                      className="px-1 py-0.5 text-[9px] bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors flex-shrink-0"
                      title={`Switch to Gen ${info.pokeGen}`}
                    >
                      {info.pokeGen}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Searches - takes remaining space */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
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
            {recentSearches.map((recent) => {
              const pokeId = pokemonIdMap.get(recent.pokemonName);
              const pokeGen = pokeId ? getPokemonGeneration(pokeId) : 1;
              const existsInGen = pokeGen <= globalGeneration;

              return (
                <div key={recent.pokemonName} className="flex items-center gap-1">
                  <button
                    onClick={() => existsInGen && restoreFromRecent(recent.pokemonName)}
                    className={`flex-1 text-left px-2 py-1.5 text-sm rounded transition-colors truncate ${
                      existsInGen
                        ? "text-slate-300 hover:bg-slate-800 cursor-pointer"
                        : "text-slate-500 cursor-not-allowed"
                    }`}
                    title={existsInGen ? `Restore ${formatPokemonName(recent.pokemonName)}` : `${formatPokemonName(recent.pokemonName)} doesn't exist in Gen ${globalGeneration}`}
                  >
                    {formatPokemonName(recent.pokemonName)}
                  </button>
                  {!existsInGen && (
                    <button
                      onClick={() => setGeneration(pokeGen)}
                      className="px-1 py-0.5 text-[9px] bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors flex-shrink-0"
                      title={`Switch to Gen ${pokeGen}`}
                    >
                      {pokeGen}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            {isMounted ? "No recent searches" : "Loading..."}
          </p>
        )}
      </div>

      {/* Footer - fixed at bottom */}
      <div className="pt-4 border-t border-slate-800 mt-auto flex-shrink-0 space-y-3">
        <button
          onClick={() => setShowClearCacheConfirm(true)}
          className="w-full px-2 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors flex items-center justify-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Clear Cache
        </button>
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

      {/* Clear Cache Confirmation Modal */}
      {showClearCacheConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-sm mx-4 shadow-xl border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-2">Clear All Cache?</h3>
            <p className="text-sm text-slate-400 mb-4">
              This will delete all cached Pokemon data and reload the page. The app will need to re-fetch data from PokeAPI, which may take a moment.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowClearCacheConfirm(false)}
                disabled={isClearing}
                className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleClearCache}
                disabled={isClearing}
                className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-500 rounded transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isClearing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Clearing...
                  </>
                ) : (
                  "Clear Cache"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
