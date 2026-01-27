"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { usePokemon } from "@/hooks/usePokemon";
import { usePokemonList } from "@/hooks/usePokemonList";
import { useModuleStore } from "@/stores/moduleStore";
import { PokemonModule as PokemonModuleType, ModuleTab } from "@/types/module";
import { StatsDisplay } from "./StatsDisplay";
import { AbilitiesPanel } from "./AbilitiesPanel";
import { TypeEffectivenessDisplay } from "./TypeEffectivenessDisplay";
import { LearnsetTable } from "./LearnsetTable";
import { TypeBadge } from "@/components/type-chart/TypeBadge";
import Image from "next/image";

interface Props {
  module: PokemonModuleType;
  isOverlay?: boolean;
}

const TABS: { id: ModuleTab; label: string }[] = [
  { id: "stats", label: "Stats" },
  { id: "abilities", label: "Abilities" },
  { id: "types", label: "Types" },
  { id: "moves", label: "Moves" },
];

export function PokemonModule({ module, isOverlay = false }: Props) {
  const { setPokemon, setActiveTab, toggleMinimize, removeModule } =
    useModuleStore();
  const {
    data: pokemon,
    isLoading,
    error,
  } = usePokemon(module.pokemonName);

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-slate-900 rounded-lg border border-slate-700 shadow-lg overflow-hidden ${
        isDragging ? "ring-2 ring-blue-500" : ""
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
              {filteredResults.map((poke, index) => (
                <li
                  key={poke.id}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => handleSelect(poke.name)}
                  className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                    index === highlightedIndex
                      ? "bg-slate-700"
                      : "hover:bg-slate-700/50"
                  }`}
                >
                  <Image
                    src={poke.spriteUrl}
                    alt=""
                    width={28}
                    height={28}
                    className="pixelated"
                    unoptimized
                  />
                  <span className="text-white text-sm">{poke.displayName}</span>
                  <span className="text-slate-400 text-xs ml-auto">
                    #{poke.id}
                  </span>
                </li>
              ))}
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
            onClick={() => toggleMinimize(module.id)}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
            title={module.isMinimized ? "Expand" : "Minimize"}
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {module.isMinimized ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 12H4"
                />
              )}
            </svg>
          </button>
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
      {!module.isMinimized && (
        <div className="p-4 min-h-[600px]">
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
                  <div className="flex gap-1.5">
                    {pokemon.types.map((type) => (
                      <TypeBadge key={type.name} type={type.name} size="sm" />
                    ))}
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
                    pokemonTypes={pokemon.types}
                  />
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
      )}
    </div>
  );
}
