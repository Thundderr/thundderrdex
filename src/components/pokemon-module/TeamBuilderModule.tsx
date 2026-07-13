"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import { useModuleStore } from "@/stores/moduleStore";
import { useGenerationStore } from "@/stores/generationStore";
import { usePokemonList } from "@/hooks/usePokemonList";
import { usePokemon } from "@/hooks/usePokemon";
import { TeamBuilderModule as TeamBuilderModuleType } from "@/types/module";
import { PokemonTypeName } from "@/types/pokemon";
import { getTypesForGeneration } from "@/lib/pokeapi/transformers";
import { calculateDualTypeEffectiveness } from "@/lib/utils/typeEffectiveness";
import { TYPES_BY_GENERATION, TYPE_COLORS } from "@/data/typeChart";
import { getPokemonGenerationRange } from "@/lib/utils/pokemonGeneration";
import { TypeBadge } from "@/components/type-chart/TypeBadge";
import { ModuleShell } from "@/components/layout/ModuleShell";
import { isSpeciesInChampions } from "@/data/championsRoster";
import { ChampionsRulesChip } from "@/components/champions/ChampionsRulesChip";

interface Props {
  module: TeamBuilderModuleType;
  isOverlay?: boolean;
}

// Team slot component with search
function TeamSlot({
  slotIndex,
  pokemonName,
  moduleId,
  globalGeneration,
}: {
  slotIndex: number;
  pokemonName: string | null;
  moduleId: string;
  globalGeneration: number;
}) {
  const { setTeamSlot, clearTeamSlot } = useModuleStore();
  const { setGeneration, championsMode } = useGenerationStore();
  const { data: pokemon } = usePokemon(pokemonName);
  const { data: pokemonList } = usePokemonList();

  const [isSearching, setIsSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Get types for the selected generation
  const genTypes = useMemo(() => {
    if (!pokemon) return [];
    return getTypesForGeneration(pokemon, globalGeneration);
  }, [pokemon, globalGeneration]);

  // Check if Pokemon exists in the current generation
  const pokemonExistsInGen = useMemo(() => {
    if (!pokemon || !pokemonName) return true;
    const { minGen, maxGen } = getPokemonGenerationRange(pokemonName, pokemon.id);
    return globalGeneration >= minGen && (maxGen === null || globalGeneration <= maxGen);
  }, [pokemon, pokemonName, globalGeneration]);

  // In Champions mode, flag a slot whose species isn't in the Champions roster.
  const champIneligible = championsMode && !!pokemon && !isSpeciesInChampions(pokemon.id);

  const filteredResults = useMemo(() => {
    if (!query || !pokemonList) return [];
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return [];

    return pokemonList
      .filter((p) =>
        p.name.includes(lowerQuery) ||
        p.displayName.toLowerCase().includes(lowerQuery) ||
        p.id.toString() === lowerQuery
      )
      .slice(0, 8)
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
        setHighlightedIndex((i) => Math.min(i + 1, filteredResults.length - 1));
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
    setTeamSlot(moduleId, slotIndex, name);
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
    <div className={`relative bg-slate-800 rounded-lg p-2 ${(!pokemonExistsInGen && pokemon) || champIneligible ? "opacity-50" : ""}`}>
      {isSearching ? (
        <div className="relative">
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
            placeholder="Search..."
            className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
            autoFocus
          />
          {filteredResults.length > 0 && (
            <ul
              ref={listRef}
              className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded shadow-xl max-h-48 overflow-auto"
            >
              {filteredResults.map((poke, index) => {
                const { minGen, maxGen } = getPokemonGenerationRange(poke.name, poke.id);
                const existsInGen = globalGeneration >= minGen && (maxGen === null || globalGeneration <= maxGen);

                return (
                  <li
                    key={poke.name}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => existsInGen && handleSelect(poke.name)}
                    className={`flex items-center gap-1.5 px-2 py-1 text-xs transition-colors ${
                      index === highlightedIndex ? "bg-slate-700" : "hover:bg-slate-700/50"
                    } ${!existsInGen ? "cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <div className="relative flex-shrink-0">
                      <Image
                        src={poke.spriteUrl}
                        alt=""
                        width={20}
                        height={20}
                        className={`pixelated ${!existsInGen ? "opacity-40 grayscale" : ""}`}
                        unoptimized
                      />
                      {!existsInGen && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-full h-0.5 bg-red-500 rotate-[-20deg]" />
                        </div>
                      )}
                    </div>
                    <span className={`flex-1 truncate ${existsInGen ? "text-white" : "text-slate-500 line-through"}`}>
                      {poke.displayName}
                    </span>
                    {!existsInGen && (
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setGeneration(minGen);
                        }}
                        className="px-1 py-0.5 text-2xs bg-blue-600 hover:bg-blue-500 text-white rounded"
                      >
                        Gen {minGen}{maxGen ? `-${maxGen}` : ""}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : pokemon ? (
        <div className="flex items-center gap-2">
          <div className="relative flex-shrink-0">
            <Image
              src={pokemon.sprites.front_default || ""}
              alt={pokemon.displayName}
              width={32}
              height={32}
              className="pixelated"
              unoptimized
            />
            {!pokemonExistsInGen && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-0.5 bg-red-500 rotate-[-20deg]" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{pokemon.displayName}</p>
            {champIneligible && (
              <p className="text-2xs font-semibold text-amber-400/90 leading-tight">Not in Champions</p>
            )}
            <div className="flex gap-0.5 mt-0.5">
              {genTypes.map((type) => (
                <span
                  key={type.name}
                  className="px-1 py-0.5 text-2xs rounded"
                  style={{ backgroundColor: TYPE_COLORS[type.name], color: "white" }}
                >
                  {type.name.slice(0, 3).toUpperCase()}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-0.5">
            <button
              onClick={startSearch}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
              title="Change Pokemon"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              onClick={() => clearTeamSlot(moduleId, slotIndex)}
              className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded"
              title="Remove Pokemon"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={startSearch}
          className="w-full flex items-center justify-center gap-1.5 py-3 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-xs">Add Pokemon</span>
        </button>
      )}
    </div>
  );
}

// Type name display helper
function formatTypeName(type: PokemonTypeName): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

// Coverage analysis component
function TeamCoverage({
  teamSlots,
  globalGeneration,
}: {
  teamSlots: (string | null)[];
  globalGeneration: number;
}) {
  const availableTypes = TYPES_BY_GENERATION[globalGeneration] || TYPES_BY_GENERATION[9];

  // Fetch all team Pokemon data
  const pokemonQueries = teamSlots.map((name) => usePokemon(name));

  // Calculate team coverage
  const coverage = useMemo(() => {
    const typeStats: Record<PokemonTypeName, { weak: number; resist: number; immune: number }> = {} as Record<PokemonTypeName, { weak: number; resist: number; immune: number }>;

    // Initialize all types
    for (const type of availableTypes) {
      typeStats[type] = { weak: 0, resist: 0, immune: 0 };
    }

    // Calculate for each team member
    for (const query of pokemonQueries) {
      const pokemon = query.data;
      if (!pokemon) continue;

      // Check if Pokemon exists in this generation
      const { minGen: pokeMinGen, maxGen: pokeMaxGen } = getPokemonGenerationRange(pokemon.name, pokemon.id);
      if (globalGeneration < pokeMinGen || (pokeMaxGen !== null && globalGeneration > pokeMaxGen)) continue;

      // Get types for this generation
      const types = getTypesForGeneration(pokemon, globalGeneration);
      const typeNames = types.map((t) => t.name);

      // Calculate effectiveness
      const effectiveness = calculateDualTypeEffectiveness(typeNames, globalGeneration);

      // Update stats
      for (const { type, multiplier } of effectiveness.weaknesses) {
        if (typeStats[type]) typeStats[type].weak++;
      }
      for (const { type } of effectiveness.resistances) {
        if (typeStats[type]) typeStats[type].resist++;
      }
      for (const type of effectiveness.immunities) {
        if (typeStats[type]) typeStats[type].immune++;
      }
    }

    return typeStats;
  }, [pokemonQueries, globalGeneration, availableTypes]);

  // Count team members
  const teamCount = pokemonQueries.filter((q) => {
    if (!q.data) return false;
    const { minGen, maxGen } = getPokemonGenerationRange(q.data.name, q.data.id);
    return globalGeneration >= minGen && (maxGen === null || globalGeneration <= maxGen);
  }).length;

  // Calculate totals
  const totals = useMemo(() => {
    let totalWeaknesses = 0;
    let totalResistances = 0;
    let totalImmunities = 0;

    for (const type of availableTypes) {
      const stats = coverage[type];
      totalWeaknesses += stats.weak;
      totalResistances += stats.resist;
      totalImmunities += stats.immune;
    }

    return { totalWeaknesses, totalResistances, totalImmunities };
  }, [coverage, availableTypes]);

  return (
    <div className="mt-4 flex-1">
      <h3 className="text-sm font-semibold text-slate-300 mb-3">
        Team Defensive Coverage ({teamCount}/6)
      </h3>

      {/* Main layout: Types on left, Totals on right */}
      <div className="flex flex-col @lg:flex-row gap-4">
        {/* Type Grid - Two columns */}
        <div className="flex-1 grid grid-cols-2 gap-1.5">
          {availableTypes.map((type) => {
            const stats = coverage[type];

            let bgOpacity = "";
            if (stats.weak > 0 && stats.weak > stats.resist + stats.immune) {
              bgOpacity = "ring-1 ring-red-500/50";
            } else if (stats.resist > 0 || stats.immune > 0) {
              bgOpacity = "ring-1 ring-green-500/50";
            }

            return (
              <div
                key={type}
                className={`flex items-center justify-between gap-1 px-2 py-1.5 rounded ${bgOpacity}`}
              >
                <span
                  className="px-2 py-0.5 text-xs font-medium rounded text-white"
                  style={{ backgroundColor: TYPE_COLORS[type] }}
                >
                  {formatTypeName(type)}
                </span>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {stats.weak > 0 && (
                    <span className="text-red-400">-{stats.weak}</span>
                  )}
                  {(stats.resist > 0 || stats.immune > 0) && (
                    <span className="text-green-400">+{stats.resist + stats.immune}</span>
                  )}
                  {stats.weak === 0 && stats.resist === 0 && stats.immune === 0 && (
                    <span className="text-slate-500">0</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Totals on right - stacked vertically */}
        <div className="w-full @lg:w-36 flex flex-col gap-3">
          <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-3 text-center flex-1 flex flex-col justify-center">
            <p className="text-xs text-red-300 uppercase tracking-wider mb-1">Weaknesses</p>
            <p className="text-3xl font-bold text-red-400">{totals.totalWeaknesses}</p>
          </div>
          <div className="bg-green-900/20 border border-green-800/50 rounded-lg p-3 text-center flex-1 flex flex-col justify-center">
            <p className="text-xs text-green-300 uppercase tracking-wider mb-1">Resistances</p>
            <p className="text-3xl font-bold text-green-400">{totals.totalResistances + totals.totalImmunities}</p>
            {totals.totalImmunities > 0 && (
              <p className="text-[10px] text-green-300 mt-0.5">({totals.totalImmunities} immune)</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TeamBuilderModule({ module, isOverlay = false }: Props) {
  const { globalGeneration, championsMode } = useGenerationStore();

  return (
    <ModuleShell
      module={module}
      isOverlay={isOverlay}
      title="Team Coverage"
      className="col-span-1 md:col-span-2"
      bodyClassName={`p-4 flex flex-col ${module.customHeight ? "flex-1 min-h-0 overflow-y-auto" : ""}`}
    >
      {championsMode && (
        <div className="mb-2">
          <ChampionsRulesChip />
        </div>
      )}
      {/* Team Slots Grid */}
      <div className="grid grid-cols-2 @2xl:grid-cols-3 gap-2">
        {module.teamSlots.map((pokemonName, index) => (
          <TeamSlot
            key={index}
            slotIndex={index}
            pokemonName={pokemonName}
            moduleId={module.id}
            globalGeneration={globalGeneration}
          />
        ))}
      </div>

      {/* Team Coverage */}
      <TeamCoverage teamSlots={module.teamSlots} globalGeneration={globalGeneration} />
    </ModuleShell>
  );
}
