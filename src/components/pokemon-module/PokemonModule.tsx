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
import { isMegaPokemon, getMegaPokemonInfo, isRegionalVariant, getRegionalVariantInfo } from "@/lib/utils/generationConfig";
import { PokemonModule as PokemonModuleType, ModuleTab } from "@/types/module";
import { StatsDisplay } from "./StatsDisplay";
import { AbilitiesPanel } from "./AbilitiesPanel";
import { TypeEffectivenessDisplay } from "./TypeEffectivenessDisplay";
import { LearnsetTable } from "./LearnsetTable";
import { LocationsPanel } from "./LocationsPanel";
import { TypeBadge } from "@/components/type-chart/TypeBadge";
import { NATURES } from "@/data/natures";
import { StatValues } from "@/lib/utils/statCalculator";
import { useSmogonSets, SmogonSet } from "@/hooks/useSmogonSets";
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

// Get the display ID - use base species ID for variants/megas
function getDisplayId(pokemonName: string, apiId: number): number {
  if (isMegaPokemon(pokemonName)) {
    const megaInfo = getMegaPokemonInfo(pokemonName);
    return megaInfo?.baseSpeciesId ?? apiId;
  }
  if (isRegionalVariant(pokemonName)) {
    const variantInfo = getRegionalVariantInfo(pokemonName);
    return variantInfo?.baseSpeciesId ?? apiId;
  }
  return apiId;
}

// Get generation range for any Pokemon (including Megas and Regional Variants)
function getPokemonGenerationRange(pokemonName: string, pokedexId: number): { minGen: number; maxGen: number | null } {
  if (isMegaPokemon(pokemonName)) {
    return { minGen: 6, maxGen: 7 };
  }
  const regionalInfo = getRegionalVariantInfo(pokemonName);
  if (regionalInfo) {
    return { minGen: regionalInfo.minGeneration, maxGen: null };
  }
  return { minGen: getPokemonGeneration(pokedexId), maxGen: null };
}

export function PokemonModule({ module, isOverlay = false }: Props) {
  const { setPokemon, setActiveTab, removeModule, newlyCreatedModuleId, clearNewlyCreatedModule, selectedModuleId, selectModule, setStatModifiers } =
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
    if (!pokemon || !module.pokemonName) return true;
    const { minGen, maxGen } = getPokemonGenerationRange(module.pokemonName, pokemon.id);
    return globalGeneration >= minGen && (maxGen === null || globalGeneration <= maxGen);
  }, [pokemon, module.pokemonName, globalGeneration]);

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

  // Import/Export state
  const [showImportExport, setShowImportExport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  // Load Set dropdown state
  const [showSetsDropdown, setShowSetsDropdown] = useState(false);
  const { data: smogonSets, isLoading: setsLoading } = useSmogonSets(module.pokemonName);

  // Serialize to Showdown format
  const serializeToShowdown = () => {
    if (!pokemon) return "";

    const lines: string[] = [];
    const { statModifiers } = module;

    // Pokemon name @ Item
    let firstLine = pokemon.displayName;
    if (statModifiers.item) {
      firstLine += ` @ ${statModifiers.item}`;
    }
    lines.push(firstLine);

    // Ability
    if (statModifiers.ability) {
      const abilityName = statModifiers.ability
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      lines.push(`Ability: ${abilityName}`);
    }

    // Level (only if not 100)
    if (statModifiers.level !== 100) {
      lines.push(`Level: ${statModifiers.level}`);
    }

    // Nature (only if not neutral)
    const nature = NATURES.find((n) => n.name === statModifiers.nature);
    if (nature && (nature.increasedStat || nature.decreasedStat)) {
      lines.push(`${statModifiers.nature} Nature`);
    }

    // IVs (only if not all 31)
    const ivParts: string[] = [];
    const ivMap: Record<keyof StatValues, string> = {
      hp: "HP",
      attack: "Atk",
      defense: "Def",
      specialAttack: "SpA",
      specialDefense: "SpD",
      speed: "Spe",
    };
    for (const [key, label] of Object.entries(ivMap)) {
      const iv = statModifiers.ivs[key as keyof StatValues];
      if (iv !== 31) {
        ivParts.push(`${iv} ${label}`);
      }
    }
    if (ivParts.length > 0) {
      lines.push(`IVs: ${ivParts.join(" / ")}`);
    }

    // EVs (only if any are non-zero)
    const evParts: string[] = [];
    for (const [key, label] of Object.entries(ivMap)) {
      const ev = statModifiers.evs[key as keyof StatValues];
      if (ev > 0) {
        evParts.push(`${ev} ${label}`);
      }
    }
    if (evParts.length > 0) {
      lines.push(`EVs: ${evParts.join(" / ")}`);
    }

    // Moves
    const moves = statModifiers.moves ?? [null, null, null, null];
    for (const move of moves) {
      if (move) {
        const moveName = move
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        lines.push(`- ${moveName}`);
      }
    }

    return lines.join("\n");
  };

  // Parse Showdown format
  const parseShowdown = (text: string): { error: string } | { pokemonName: string; level?: number; nature?: string; ability?: string; item?: string; ivs?: Partial<StatValues>; evs?: Partial<StatValues>; moves?: string[] } => {
    const normalizedText = text.replace(/\t/g, " ").replace(/ +/g, " ");
    const lines = normalizedText.trim().split("\n").map((l) => l.trim()).filter((l) => l);
    if (lines.length === 0) {
      return { error: "No text to parse" };
    }

    // Parse first line: Pokemon @ Item or Pokemon (nickname) @ Item
    const firstLine = lines[0];
    let pokemonName: string;
    let item: string | undefined;

    if (firstLine.includes("@")) {
      const parts = firstLine.split("@");
      pokemonName = parts[0].trim();
      item = parts[1].trim();
    } else {
      pokemonName = firstLine.trim();
    }

    // Handle nickname format: Nickname (Pokemon)
    const nicknameMatch = pokemonName.match(/^.+\s*\(([^)]+)\)$/);
    if (nicknameMatch) {
      pokemonName = nicknameMatch[1].trim();
    }

    // Normalize pokemon name for API lookup
    const normalizedName = pokemonName.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    const simpleName = pokemonName.toLowerCase().replace(/[^a-z0-9]/g, "");

    // Check if Pokemon exists
    const foundPokemon = pokemonList?.find((p) => {
      if (p.name === normalizedName) return true;
      if (p.displayName.toLowerCase() === pokemonName.toLowerCase()) return true;
      const pSimple = p.displayName.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (pSimple === simpleName) return true;
      return false;
    });

    if (!foundPokemon) {
      return { error: `Pokemon "${pokemonName}" not found` };
    }

    const pokeGen = getPokemonGeneration(foundPokemon.id);
    if (pokeGen > globalGeneration) {
      return { error: `${foundPokemon.displayName} is from Gen ${pokeGen}, but current generation is Gen ${globalGeneration}` };
    }

    const result: { pokemonName: string; level?: number; nature?: string; ability?: string; item?: string; ivs?: Partial<StatValues>; evs?: Partial<StatValues>; moves?: string[] } = {
      pokemonName: foundPokemon.name,
    };

    if (item) {
      result.item = item;
    }

    const moves: string[] = [];

    // Parse remaining lines
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      // Move (starts with -)
      if (line.startsWith("-")) {
        const moveName = line.slice(1).trim().toLowerCase().replace(/\s+/g, "-");
        moves.push(moveName);
        continue;
      }

      // Ability
      const abilityMatch = line.match(/^Ability:\s*(.+)/i);
      if (abilityMatch) {
        result.ability = abilityMatch[1].trim().toLowerCase().replace(/\s+/g, "-");
        continue;
      }

      // Level
      const levelMatch = line.match(/^Level:\s*(\d+)/i);
      if (levelMatch) {
        result.level = Math.max(1, Math.min(100, parseInt(levelMatch[1])));
        continue;
      }

      // Nature
      const natureMatch = line.match(/^(\w+)\s+Nature/i);
      if (natureMatch) {
        const natureName = natureMatch[1];
        const foundNature = NATURES.find((n) => n.name.toLowerCase() === natureName.toLowerCase());
        if (foundNature) {
          result.nature = foundNature.name;
        }
        continue;
      }

      // EVs
      const evMatch = line.match(/^EVs:\s*(.+)/i);
      if (evMatch) {
        result.evs = parseStatLine(evMatch[1]);
        continue;
      }

      // IVs
      const ivMatch = line.match(/^IVs:\s*(.+)/i);
      if (ivMatch) {
        result.ivs = parseStatLine(ivMatch[1]);
        continue;
      }
    }

    if (moves.length > 0) {
      result.moves = moves.slice(0, 4); // Max 4 moves
    }

    return result;
  };

  // Helper to parse stat lines like "252 Atk / 4 SpD / 252 Spe"
  const parseStatLine = (line: string): Partial<StatValues> => {
    const result: Partial<StatValues> = {};
    const statMap: Record<string, keyof StatValues> = {
      hp: "hp",
      atk: "attack",
      def: "defense",
      spa: "specialAttack",
      spd: "specialDefense",
      spe: "speed",
    };

    const parts = line.split("/").map((p) => p.trim());
    for (const part of parts) {
      const match = part.match(/^(\d+)\s+(\w+)/i);
      if (match) {
        const value = parseInt(match[1]);
        const statAbbr = match[2].toLowerCase();
        const statKey = statMap[statAbbr];
        if (statKey) {
          result[statKey] = value;
        }
      }
    }
    return result;
  };

  // Handle import
  const handleImport = () => {
    const parseResult = parseShowdown(importText);
    if ("error" in parseResult) {
      setImportError(parseResult.error);
      return;
    }

    // Set the Pokemon
    setPokemon(module.id, parseResult.pokemonName);

    // Build stat modifiers update
    const updates: { level?: number; nature?: string; ability?: string | null; item?: string | null; ivs?: StatValues; evs?: StatValues; moves?: (string | null)[] } = {};

    if (parseResult.level !== undefined) {
      updates.level = parseResult.level;
    }

    if (parseResult.nature) {
      updates.nature = parseResult.nature;
    }

    if (parseResult.ability) {
      updates.ability = parseResult.ability;
    }

    if (parseResult.item) {
      updates.item = parseResult.item;
    }

    if (parseResult.ivs) {
      updates.ivs = {
        hp: parseResult.ivs.hp ?? 31,
        attack: parseResult.ivs.attack ?? 31,
        defense: parseResult.ivs.defense ?? 31,
        specialAttack: parseResult.ivs.specialAttack ?? 31,
        specialDefense: parseResult.ivs.specialDefense ?? 31,
        speed: parseResult.ivs.speed ?? 31,
      };
    }

    if (parseResult.evs) {
      updates.evs = {
        hp: parseResult.evs.hp ?? 0,
        attack: parseResult.evs.attack ?? 0,
        defense: parseResult.evs.defense ?? 0,
        specialAttack: parseResult.evs.specialAttack ?? 0,
        specialDefense: parseResult.evs.specialDefense ?? 0,
        speed: parseResult.evs.speed ?? 0,
      };
    }

    if (parseResult.moves) {
      // Fill with nulls if less than 4 moves
      const moves: (string | null)[] = [...parseResult.moves];
      while (moves.length < 4) {
        moves.push(null);
      }
      updates.moves = moves;
    }

    if (Object.keys(updates).length > 0) {
      setStatModifiers(module.id, updates);
    }

    setShowImportExport(false);
    setImportText("");
    setImportError(null);
  };

  // Apply a Smogon set to the module
  const applySmogonSet = (set: SmogonSet) => {
    // Helper to get first value if array
    const getFirst = <T,>(val: T | T[] | undefined): T | undefined =>
      Array.isArray(val) ? val[0] : val;

    // Map Smogon stat keys to our stat keys
    const mapEvs = (evs: SmogonSet["evs"]): StatValues => ({
      hp: evs?.hp ?? 0,
      attack: evs?.atk ?? 0,
      defense: evs?.def ?? 0,
      specialAttack: evs?.spa ?? 0,
      specialDefense: evs?.spd ?? 0,
      speed: evs?.spe ?? 0,
    });

    const mapIvs = (ivs: SmogonSet["ivs"]): StatValues => ({
      hp: ivs?.hp ?? 31,
      attack: ivs?.atk ?? 31,
      defense: ivs?.def ?? 31,
      specialAttack: ivs?.spa ?? 31,
      specialDefense: ivs?.spd ?? 31,
      speed: ivs?.spe ?? 31,
    });

    // Normalize move name for our system
    const normalizeMoveName = (move: string): string =>
      move.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

    // Get moves (first 4, taking first option if slash)
    const moves: (string | null)[] = [null, null, null, null];
    set.moves.slice(0, 4).forEach((move, idx) => {
      const moveName = Array.isArray(move) ? move[0] : move;
      if (moveName) {
        moves[idx] = normalizeMoveName(moveName);
      }
    });

    const updates: Parameters<typeof setStatModifiers>[1] = {
      level: set.level ?? 100,
      ability: getFirst(set.ability) ?? null,
      item: getFirst(set.item) ?? null,
      nature: getFirst(set.nature) ?? "Hardy",
      evs: mapEvs(set.evs),
      ivs: mapIvs(set.ivs),
      moves,
    };

    setStatModifiers(module.id, updates);
    setShowSetsDropdown(false);
  };

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
      data-module-id={module.id}
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
                const { minGen, maxGen } = getPokemonGenerationRange(poke.name, poke.id);
                const existsInGen = globalGeneration >= minGen && (maxGen === null || globalGeneration <= maxGen);

                return (
                  <li
                    key={poke.name}
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
                          setGeneration(minGen);
                        }}
                        className="px-1.5 py-0.5 text-[10px] bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
                        title={`Switch to Gen ${minGen}${maxGen ? `-${maxGen}` : ""}`}
                      >
                        Gen {minGen}{maxGen ? `-${maxGen}` : ""}
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
          {pokemon && (
            <>
              {/* Load Set Button with Dropdown */}
              <div className="relative flex items-center">
                <button
                  onClick={() => setShowSetsDropdown(!showSetsDropdown)}
                  onBlur={() => setTimeout(() => setShowSetsDropdown(false), 200)}
                  className="px-1.5 py-1 hover:bg-slate-700 rounded text-[10px] font-medium text-slate-400 hover:text-blue-400"
                  title="Load competitive set"
                >
                  Sets
                </button>
                {showSetsDropdown && (
                  <div className="absolute z-50 right-0 top-full mt-1 w-72 bg-slate-800 border border-slate-600 rounded-lg shadow-xl">
                    <div className="py-1">
                      {/* Blank/Reset option */}
                      <button
                        onClick={() => {
                          setStatModifiers(module.id, {
                            level: 100,
                            ability: null,
                            item: null,
                            nature: "Hardy",
                            evs: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
                            ivs: { hp: 31, attack: 31, defense: 31, specialAttack: 31, specialDefense: 31, speed: 31 },
                            moves: [null, null, null, null],
                          });
                          setShowSetsDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-slate-700 transition-colors flex items-center gap-3 border-b border-slate-700"
                      >
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-600 text-slate-300 font-medium min-w-[50px] text-center">
                          Reset
                        </span>
                        <span className="text-sm text-slate-400">Blank (Neutral)</span>
                      </button>
                      {setsLoading ? (
                        <div className="px-4 py-3 text-xs text-slate-400">Loading sets...</div>
                      ) : smogonSets && smogonSets.length > 0 ? (
                        smogonSets.map((set, idx) => (
                          <button
                            key={`${set.format}-${set.name}-${idx}`}
                            onClick={() => applySmogonSet(set)}
                            className="w-full px-3 py-2 text-left hover:bg-slate-700 transition-colors flex items-center gap-3"
                          >
                            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-600/30 text-blue-300 font-medium min-w-[50px] text-center">
                              {set.formatDisplay}
                            </span>
                            <span className="text-sm text-white">{set.name}</span>
                          </button>
                        ))
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
              {/* Import/Export Button */}
              <button
                onClick={() => {
                  setImportText(serializeToShowdown());
                  setImportError(null);
                  setShowImportExport(true);
                }}
                className="px-1.5 py-1 hover:bg-slate-700 rounded text-[10px] font-medium text-slate-400 hover:text-white"
                title="Import/Export"
              >
                Import/Export
              </button>
            </>
          )}
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
                    #{getDisplayId(module.pokemonName ?? "", pokemon.id).toString().padStart(4, "0")}
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
                  <StatsDisplay stats={pokemon.stats} moduleId={module.id} abilities={pokemon.abilities} pokemonName={module.pokemonName} />
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

      {/* Import/Export Modal */}
      {showImportExport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => setShowImportExport(false)}>
          <div
            className="bg-slate-800 rounded-lg border border-slate-700 shadow-xl w-[400px] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
              <h3 className="text-sm font-medium text-white">Showdown Format</h3>
              <button
                onClick={() => {
                  setShowImportExport(false);
                  setImportText("");
                  setImportError(null);
                }}
                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <p className="text-xs text-slate-400 mb-2">Edit or paste a Pokemon set in Showdown format:</p>
              <textarea
                autoFocus
                value={importText}
                onChange={(e) => {
                  setImportText(e.target.value);
                  setImportError(null);
                }}
                placeholder={`Pikachu @ Light Ball
Level: 50
Adamant Nature
EVs: 252 Atk / 4 SpD / 252 Spe
IVs: 0 SpA`}
                className="w-full h-48 bg-slate-900 border border-slate-600 rounded p-3 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none"
              />
              {importError && (
                <p className="mt-2 text-xs text-red-400">{importError}</p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(importText)}
                  className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm text-white font-medium transition-colors"
                >
                  Copy
                </button>
                <button
                  onClick={handleImport}
                  disabled={!importText.trim()}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:text-slate-400 rounded text-sm text-white font-medium transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
