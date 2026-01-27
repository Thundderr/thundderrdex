"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { usePokemon } from "@/hooks/usePokemon";
import { usePokemonList } from "@/hooks/usePokemonList";
import { useModuleStore } from "@/stores/moduleStore";
import { useGenerationStore } from "@/stores/generationStore";
import { getTypesForGeneration } from "@/lib/pokeapi/transformers";
import { TYPES_BY_GENERATION } from "@/data/typeChart";
import { PokemonModule as PokemonModuleType, ModuleTab } from "@/types/module";
import { StatsDisplay } from "./StatsDisplay";
import { AbilitiesPanel } from "./AbilitiesPanel";
import { TypeEffectivenessDisplay } from "./TypeEffectivenessDisplay";
import { LearnsetTable } from "./LearnsetTable";
import { LocationsPanel } from "./LocationsPanel";
import { TypeBadge } from "@/components/type-chart/TypeBadge";
import Image from "next/image";

interface Props {
  module: PokemonModuleType;
  isOverlay?: boolean;
}

const TABS: { id: ModuleTab; label: string }[] = [
  { id: "stats", label: "Stats" },
  { id: "abilities", label: "Abilities" },
  { id: "types", label: "Defenses" },
  { id: "moves", label: "Moves" },
  { id: "locations", label: "Locations" },
];

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

export function PokemonModule({ module, isOverlay = false }: Props) {
  const { setPokemon, setActiveTab, removeModule, newlyCreatedModuleId, clearNewlyCreatedModule, selectedModuleId, selectModule } =
    useModuleStore();
  const isSelected = selectedModuleId === module.id;
  const moduleContainerRef = useRef<HTMLDivElement>(null);
  const { globalGeneration, setGeneration } = useGenerationStore();
  const {
    data: pokemon,
    isLoading,
    error,
  } = usePokemon(module.pokemonName);

  // Get types for the selected generation
  const genTypes = useMemo(() => {
    if (!pokemon) return [];
    return getTypesForGeneration(pokemon, globalGeneration);
  }, [pokemon, globalGeneration]);

  // Check if types changed from current
  const typesChanged = useMemo(() => {
    if (!pokemon) return false;
    const currentTypeNames = pokemon.types.map((t) => t.name).sort().join(",");
    const genTypeNames = genTypes.map((t) => t.name).sort().join(",");
    return currentTypeNames !== genTypeNames;
  }, [pokemon, genTypes]);

  // Check if Pokemon exists in the current generation
  const pokemonExistsInGen = useMemo(() => {
    if (!pokemon) return true;
    const pokeGen = getPokemonGeneration(pokemon.id);
    return pokeGen <= globalGeneration;
  }, [pokemon, globalGeneration]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id, disabled: isOverlay });

  const style = isOverlay
    ? { opacity: 0.95 }
    : {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1,
      };

  // Inline search state
  const [isSearching, setIsSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const { data: pokemonList, isLoading: listLoading } = usePokemonList();

  const filteredResults = useMemo(() => {
    if (!query || !pokemonList) return [];
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return [];

    return pokemonList
      .filter(
        (p) =>
          p.name.includes(lowerQuery) ||
          p.displayName.toLowerCase().includes(lowerQuery) ||
          p.id.toString() === lowerQuery
      )
      .slice(0, 10)
      .sort((a, b) => {
        const aStarts = a.name.startsWith(lowerQuery);
        const bStarts = b.name.startsWith(lowerQuery);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.id - b.id;
      });
  }, [query, pokemonList]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((i) =>
          Math.min(i + 1, filteredResults.length - 1)
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredResults[highlightedIndex]) {
          handleSelect(filteredResults[highlightedIndex].name);
        }
        break;
      case "Escape":
        setIsSearching(false);
        setQuery("");
        break;
    }
  };

  const handleSelect = (name: string) => {
    setPokemon(module.id, name);
    setQuery("");
    setIsSearching(false);
    setHighlightedIndex(0);
  };

  const startSearch = () => {
    setIsSearching(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  useEffect(() => {
    if (listRef.current && filteredResults.length > 0) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex, filteredResults.length]);

  // Auto-scroll and focus for newly created modules
  useEffect(() => {
    if (newlyCreatedModuleId === module.id && !isOverlay) {
      // Clear the flag first to prevent re-triggering
      clearNewlyCreatedModule();

      // Scroll the module into view with a small delay to ensure render is complete
      setTimeout(() => {
        moduleContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });

        // Start search after scroll animation
        setTimeout(() => {
          startSearch();
        }, 300);
      }, 50);
    }
  }, [newlyCreatedModuleId, module.id, isOverlay, clearNewlyCreatedModule]);

  // Combine refs for both dnd-kit and scroll functionality
  const setRefs = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    (moduleContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
  };

  return (
    <div
      ref={setRefs}
      style={style}
      onClick={() => selectModule(module.id)}
      className={`bg-slate-900 rounded-lg border shadow-lg overflow-hidden ${
        isDragging ? "ring-2 ring-blue-500 border-slate-700" : ""
      } ${
        isSelected && !isDragging ? "ring-2 ring-blue-500 border-blue-500" : "border-slate-700"
      }`}
    >
      {/* Unified Header with Search */}
      <div className="relative flex items-center px-2 py-1.5 bg-slate-800 border-b border-slate-700 gap-2">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-700 rounded flex-shrink-0"
        >
          <svg
            className="w-4 h-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8h16M4 16h16"
            />
          </svg>
        </div>

        {/* Search/Name Area */}
        <div className="flex-1 min-w-0 relative">
          {isSearching ? (
            <div className="relative">
              <svg
                className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onBlur={() => setTimeout(() => {
                  setIsSearching(false);
                  setQuery("");
                }, 200)}
                onKeyDown={handleKeyDown}
                placeholder={listLoading ? "Loading..." : "Search Pokemon..."}
                className="w-full pl-7 pr-2 py-1 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                autoFocus
              />
            </div>
          ) : (
            <button
              onClick={startSearch}
              className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-700 transition-colors text-left group"
            >
              <svg
                className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-400 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <span className={`text-sm font-medium truncate ${pokemon ? "text-white" : "text-slate-400"}`}>
                {pokemon?.displayName || "Search Pokemon..."}
              </span>
            </button>
          )}

          {/* Search Dropdown */}
          {isSearching && filteredResults.length > 0 && (
            <ul
              ref={listRef}
              className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-72 overflow-auto"
            >
              {filteredResults.map((poke, index) => {
                const pokeGen = getPokemonGeneration(poke.id);
                const existsInGen = pokeGen <= globalGeneration;

                return (
                  <li
                    key={poke.id}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => existsInGen && handleSelect(poke.name)}
                    className={`flex items-center gap-2 px-3 py-2 transition-colors ${
                      index === highlightedIndex
                        ? "bg-slate-700"
                        : "hover:bg-slate-700/50"
                    } ${!existsInGen ? "cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <div className="relative flex-shrink-0">
                      <Image
                        src={poke.spriteUrl}
                        alt=""
                        width={28}
                        height={28}
                        className={`pixelated ${!existsInGen ? "opacity-40 grayscale" : ""}`}
                        unoptimized
                      />
                      {!existsInGen && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-full h-0.5 bg-red-500 rotate-[-20deg]" />
                        </div>
                      )}
                    </div>
                    <span className={`text-sm flex-1 ${existsInGen ? "text-white" : "text-slate-500 line-through"}`}>
                      {poke.displayName}
                    </span>
                    <span className="text-slate-400 text-xs">
                      #{poke.id}
                    </span>
                    {!existsInGen && (
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setGeneration(pokeGen);
                        }}
                        className="px-1.5 py-0.5 text-[10px] bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
                        title={`Switch to Gen ${pokeGen} to enable`}
                      >
                        Gen {pokeGen}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {isSearching && query && filteredResults.length === 0 && !listLoading && (
            <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-3 text-center text-slate-400 text-sm">
              No Pokemon found
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={() => removeModule(module.id)}
            className="p-1.5 hover:bg-red-600/20 rounded text-slate-400 hover:text-red-400"
            title="Remove module"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="relative p-4 min-h-[600px]">
          {/* Invalid generation overlay */}
          {pokemon && !pokemonExistsInGen && (
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
              <div className="absolute inset-0 bg-black/60" />
              <div className="relative">
                <svg className="w-32 h-32 text-red-500/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M4 4l16 16" />
                </svg>
                <p className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-red-400 text-sm font-medium whitespace-nowrap">
                  Not in Gen {globalGeneration}
                </p>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-red-400">
              <p>Failed to load Pokemon</p>
              <p className="text-sm text-slate-500 mt-1">
                Check the name and try again
              </p>
            </div>
          )}

          {pokemon && (
            <>
              {/* Pokemon Info Header */}
              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-20 h-20 bg-slate-800 rounded-lg flex items-center justify-center">
                  {pokemon.sprites.official_artwork ? (
                    <Image
                      src={pokemon.sprites.official_artwork}
                      alt={pokemon.displayName}
                      width={80}
                      height={80}
                      className="object-contain"
                      unoptimized
                    />
                  ) : pokemon.sprites.front_default ? (
                    <Image
                      src={pokemon.sprites.front_default}
                      alt={pokemon.displayName}
                      width={80}
                      height={80}
                      className="pixelated"
                      unoptimized
                    />
                  ) : (
                    <span className="text-slate-500">?</span>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {pokemon.displayName}
                  </h2>
                  <p className="text-sm text-slate-400 mb-1">
                    #{pokemon.id.toString().padStart(4, "0")}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {pokemon.types.map((type) => {
                      const availableTypes = TYPES_BY_GENERATION[globalGeneration] || [];
                      const typeExistsInGen = availableTypes.includes(type.name);
                      return (
                        <div key={type.name} className="relative">
                          <TypeBadge type={type.name} size="sm" />
                          {!typeExistsInGen && (
                            <div
                              className="absolute inset-0 flex items-center justify-center"
                              title={`${type.name.charAt(0).toUpperCase() + type.name.slice(1)} didn't exist in Gen ${globalGeneration}`}
                            >
                              <div className="absolute inset-0 bg-black/50 rounded" />
                              <div className="absolute w-full h-0.5 bg-red-500 rotate-[-20deg] shadow-sm" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mb-4 border-b border-slate-700">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(module.id, tab.id)}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${
                      module.activeTab === tab.id
                        ? "text-blue-400 border-b-2 border-blue-400 -mb-px"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div>
                {module.activeTab === "stats" && (
                  <StatsDisplay stats={pokemon.stats} moduleId={module.id} />
                )}
                {module.activeTab === "abilities" && (
                  <AbilitiesPanel abilities={pokemon.abilities} />
                )}
                {module.activeTab === "types" && (
                  <TypeEffectivenessDisplay pokemon={pokemon} />
                )}
                {module.activeTab === "moves" && module.pokemonName && (
                  <LearnsetTable
                    pokemonName={module.pokemonName}
                    pokemonTypes={genTypes}
                  />
                )}
                {module.activeTab === "locations" && module.pokemonName && (
                  <LocationsPanel pokemonName={module.pokemonName} />
                )}
              </div>
            </>
          )}

          {!pokemon && !isLoading && !error && (
            <div className="text-center py-12 text-slate-400">
              <p>Click the search bar above to find a Pokemon</p>
            </div>
          )}
        </div>
    </div>
  );
}
