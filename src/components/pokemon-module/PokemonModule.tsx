"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { usePokemonList } from "@/hooks/usePokemonList";
import { useGender } from "@/hooks/useGender";
import { GenderToggle } from "@/components/pokemon-module/GenderToggle";
import { useEvolution, EvolutionNode } from "@/hooks/useEvolution";
import { useModuleStore } from "@/stores/moduleStore";
import { useGenerationStore } from "@/stores/generationStore";
import { isSpeciesInChampions, isMegaInChampions } from "@/data/championsRoster";
import { getTypesForGeneration } from "@/lib/pokeapi/transformers";
import { TYPES_BY_GENERATION } from "@/data/typeChart";
import { isMegaPokemon, getMegaPokemonInfo, isRegionalVariant, getRegionalVariantInfo } from "@/lib/utils/generationConfig";
import { getPokemonGenerationRange } from "@/lib/utils/pokemonGeneration";
import { getChampionsMegas } from "@/lib/pokemon/championsMega";
import { PokemonModule as PokemonModuleType, ModuleTab } from "@/types/module";
import { QueryState, Modal } from "@/components/ui";
import { ModuleShell } from "@/components/layout/ModuleShell";
import { PokemonModuleSkeleton } from "./PokemonModuleSkeleton";
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
import { createPortal } from "react-dom";

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
  { id: "evolution", label: "Evo" },
];

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

// Pokemon Card Component for evolution display
interface EvoPokemonCardProps {
  node: EvolutionNode;
  isCurrent: boolean;
  onSelect: (name: string) => void;
  size?: "normal" | "small";
}

function EvoPokemonCard({ node, isCurrent, onSelect, size = "normal" }: EvoPokemonCardProps) {
  const imgSize = size === "small" ? 56 : 72;
  return (
    <button
      onClick={() => onSelect(node.name)}
      className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
        isCurrent
          ? "bg-blue-600/30 ring-2 ring-blue-500"
          : "bg-slate-800 hover:bg-slate-700"
      }`}
    >
      <Image
        src={node.spriteUrl}
        alt={node.displayName}
        width={imgSize}
        height={imgSize}
        className="pixelated"
        unoptimized
      />
      <span className={`text-xs font-medium mt-1 ${isCurrent ? "text-blue-300" : "text-white"}`}>
        {node.displayName}
      </span>
    </button>
  );
}

// Grid layout for Pokemon with many evolutions (like Eevee)
interface CircularEvolutionProps {
  parent: EvolutionNode;
  children: EvolutionNode[];
  currentPokemonName: string;
  onSelect: (name: string) => void;
}

function CircularEvolution({ parent, children, currentPokemonName, onSelect }: CircularEvolutionProps) {
  // For 8 evolutions: 3x3 grid with parent in center
  // Grid positions: 0,1,2 (top), 3,center,4 (middle), 5,6,7 (bottom)
  // Map children to positions around the center
  const gridOrder = [0, 1, 2, 7, -1, 3, 6, 5, 4]; // -1 is center (parent)

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-3 gap-2 min-w-0">
        {gridOrder.map((childIdx, gridPos) => {
          // Center position - place parent
          if (childIdx === -1) {
            return (
              <div key="center" className="flex items-center justify-center">
                <EvoPokemonCard
                  node={parent}
                  isCurrent={parent.name === currentPokemonName}
                  onSelect={onSelect}
                />
              </div>
            );
          }

          // Check if we have a child for this position
          if (childIdx < children.length) {
            const child = children[childIdx];
            return (
              <div key={child.name} className="flex flex-col items-center justify-center">
                <EvoPokemonCard
                  node={child}
                  isCurrent={child.name === currentPokemonName}
                  onSelect={onSelect}
                  size="small"
                />
                <div className="text-2xs text-center leading-tight mt-0.5 h-6 overflow-hidden">
                  <span className="text-blue-400 font-medium">{child.evolutionMethod?.trigger}</span>
                  {child.evolutionMethod?.details && (
                    <span className="block text-slate-500 truncate">{child.evolutionMethod.details}</span>
                  )}
                </div>
              </div>
            );
          }

          // Empty cell for grids with fewer than 8 evolutions
          return <div key={gridPos} />;
        })}
      </div>
    </div>
  );
}

// Branching evolution layout (2-4 children, like Wurmple)
interface BranchingEvolutionProps {
  children: EvolutionNode[];
  currentPokemonName: string;
  onSelect: (name: string) => void;
}

function BranchingEvolution({ children, currentPokemonName, onSelect }: BranchingEvolutionProps) {
  const childWidth = 90;
  const totalWidth = children.length * childWidth;

  return (
    <div className="flex flex-col items-center">
      {/* Branching lines SVG - straight angled lines */}
      <svg
        className="h-8"
        style={{ width: totalWidth }}
        viewBox={`0 0 ${totalWidth} 32`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
            <polygon points="0 0, 6 2.5, 0 5" fill="#475569" />
          </marker>
        </defs>
        {children.map((_, index) => {
          const startX = totalWidth / 2;
          const endX = childWidth / 2 + index * childWidth;
          return (
            <line
              key={index}
              x1={startX}
              y1={0}
              x2={endX}
              y2={32}
              stroke="#475569"
              strokeWidth="2"
              markerEnd="url(#arrow)"
            />
          );
        })}
      </svg>

      {/* Children with methods */}
      <div className="overflow-x-auto">
        <div className="flex gap-1">
          {children.map((child) => (
            <div key={child.name} className="flex flex-col items-center" style={{ width: childWidth }}>
              <div className="text-2xs text-center leading-tight mb-1 max-w-[85px] h-7 flex flex-col justify-end">
                <span className="text-blue-400 font-medium">{child.evolutionMethod?.trigger}</span>
                {child.evolutionMethod?.details && (
                  <span className="block text-slate-500 truncate">{child.evolutionMethod.details}</span>
                )}
              </div>
              <EvoPokemonCard
                node={child}
                isCurrent={child.name === currentPokemonName}
                onSelect={onSelect}
                size="small"
              />
              {/* Recurse if this child has evolutions */}
              {child.evolvesTo.length === 1 && (
                <LinearEvolution
                  nodes={child.evolvesTo}
                  currentPokemonName={currentPokemonName}
                  onSelect={onSelect}
                />
              )}
              {child.evolvesTo.length > 1 && child.evolvesTo.length <= 4 && (
                <BranchingEvolution
                  children={child.evolvesTo}
                  currentPokemonName={currentPokemonName}
                  onSelect={onSelect}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Linear evolution (single path)
interface LinearEvolutionProps {
  nodes: EvolutionNode[];
  currentPokemonName: string;
  onSelect: (name: string) => void;
}

function LinearEvolution({ nodes, currentPokemonName, onSelect }: LinearEvolutionProps) {
  return (
    <>
      {nodes.map((node) => (
        <div key={node.name} className="flex flex-col items-center">
          {/* Arrow and method */}
          {node.evolutionMethod && (
            <div className="flex flex-col items-center my-2">
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              <div className="text-[10px] text-slate-400 text-center max-w-[100px] leading-tight">
                <span className="text-blue-400 font-medium">{node.evolutionMethod.trigger}</span>
                {node.evolutionMethod.details && (
                  <span className="block text-slate-500">{node.evolutionMethod.details}</span>
                )}
              </div>
            </div>
          )}
          <EvoPokemonCard
            node={node}
            isCurrent={node.name === currentPokemonName}
            onSelect={onSelect}
          />
          {/* Recurse */}
          {node.evolvesTo.length === 1 && (
            <LinearEvolution
              nodes={node.evolvesTo}
              currentPokemonName={currentPokemonName}
              onSelect={onSelect}
            />
          )}
          {node.evolvesTo.length > 1 && node.evolvesTo.length <= 4 && (
            <BranchingEvolution
              children={node.evolvesTo}
              currentPokemonName={currentPokemonName}
              onSelect={onSelect}
            />
          )}
          {node.evolvesTo.length > 4 && (
            <div className="mt-4">
              <CircularEvolution
                parent={node}
                children={node.evolvesTo}
                currentPokemonName={currentPokemonName}
                onSelect={onSelect}
              />
            </div>
          )}
        </div>
      ))}
    </>
  );
}

// Main Evolution Tree Component
interface EvolutionTreeProps {
  root: EvolutionNode;
  currentPokemonName: string;
  onSelect: (name: string) => void;
}

function EvolutionTree({ root, currentPokemonName, onSelect }: EvolutionTreeProps) {
  // Check if root has many direct evolutions (like Eevee)
  if (root.evolvesTo.length > 4) {
    return (
      <CircularEvolution
        parent={root}
        children={root.evolvesTo}
        currentPokemonName={currentPokemonName}
        onSelect={onSelect}
      />
    );
  }

  // Check if root has branching evolutions (2-4)
  if (root.evolvesTo.length > 1) {
    return (
      <div className="flex flex-col items-center">
        <EvoPokemonCard
          node={root}
          isCurrent={root.name === currentPokemonName}
          onSelect={onSelect}
        />
        <BranchingEvolution
          children={root.evolvesTo}
          currentPokemonName={currentPokemonName}
          onSelect={onSelect}
        />
      </div>
    );
  }

  // Linear evolution chain
  return (
    <div className="flex flex-col items-center">
      <EvoPokemonCard
        node={root}
        isCurrent={root.name === currentPokemonName}
        onSelect={onSelect}
      />
      {root.evolvesTo.length === 1 && (
        <LinearEvolution
          nodes={root.evolvesTo}
          currentPokemonName={currentPokemonName}
          onSelect={onSelect}
        />
      )}
    </div>
  );
}

export function PokemonModule({ module, isOverlay = false }: Props) {
  const { setPokemon, setActiveTab, setStatModifiers, addPokemonModule, toggleExtended } = useModuleStore();
  const { globalGeneration, setGeneration, championsMode } = useGenerationStore();
  const {
    data: pokemon,
    isLoading,
    error,
    activeId,
    hasGenderToggle,
    showFemale,
    setShowFemale,
    spriteOverride,
  } = useGender(module.pokemonName);
  // The active-gender slug (female form when toggled ♀ for a distinct-gender mon,
  // else the base). Gender-divergent data — movepool and competitive sets — is
  // keyed off this so ♀ Meowstic/Indeedee show their own moves and sets.
  const activeName = activeId ?? module.pokemonName;

  // Fetch evolution data
  const { data: evolutionData, isLoading: isEvolutionLoading, isError: isEvolutionError, refetch: refetchEvolution } = useEvolution(module.pokemonName);

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

  // Load Set dropdown state. The dropdown is portaled to <body> with fixed
  // positioning so it isn't clipped by the module's overflow-y-auto body.
  const [showSetsDropdown, setShowSetsDropdown] = useState(false);
  const setsButtonRef = useRef<HTMLButtonElement>(null);
  const [setsMenuPos, setSetsMenuPos] = useState<{ top: number; right: number } | null>(null);
  const toggleSetsDropdown = () => {
    if (!showSetsDropdown) {
      const r = setsButtonRef.current?.getBoundingClientRect();
      if (r) setSetsMenuPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setShowSetsDropdown((v) => !v);
  };
  const { data: smogonSets, isLoading: setsLoading } = useSmogonSets(activeName);

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

    const { minGen: pokeMinGen, maxGen: pokeMaxGen } = getPokemonGenerationRange(foundPokemon.name, foundPokemon.id);
    const existsInCurrentGen = globalGeneration >= pokeMinGen && (pokeMaxGen === null || globalGeneration <= pokeMaxGen);
    if (!existsInCurrentGen) {
      return { error: `${foundPokemon.displayName} is from Gen ${pokeMinGen}, but current generation is Gen ${globalGeneration}` };
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

  // Auto-open the search field on a freshly created empty module. ModuleShell
  // owns the scroll-into-view + newly-created flag; this only adds the search.
  const handleNewlyCreated = () => {
    if (!module.pokemonName) setTimeout(() => startSearch(), 300);
  };

  return (
    <>
    <ModuleShell
      module={module}
      isOverlay={isOverlay}
      titleClassName=""
      onNewlyCreated={handleNewlyCreated}
      className={module.isExtended ? "col-span-1 md:col-span-2" : ""}
      bodyClassName={`relative p-4 ${module.customHeight ? "flex-1 min-h-0 overflow-y-auto" : ""}`}
      title={
        <div className="relative">
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
      }
      headerControls={
        <>
          {pokemon && (
            <>
              {/* Load Set Button with Dropdown */}
              <div className="relative flex items-center">
                <button
                  ref={setsButtonRef}
                  onClick={toggleSetsDropdown}
                  onBlur={() => setTimeout(() => setShowSetsDropdown(false), 200)}
                  className="px-1.5 py-1 hover:bg-slate-700 rounded text-[10px] font-medium text-slate-400 hover:text-blue-400"
                  title="Load competitive set"
                >
                  Sets
                </button>
                {showSetsDropdown && setsMenuPos && createPortal(
                  <div
                    className="fixed z-[100] w-72 bg-slate-800 border border-slate-600 rounded-lg shadow-xl"
                    style={{ top: setsMenuPos.top, right: setsMenuPos.right }}
                  >
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
                  </div>,
                  document.body
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
            onClick={(e) => { e.stopPropagation(); toggleExtended(module.id); }}
            className={`p-1.5 rounded transition-colors ${module.isExtended ? "bg-blue-600/20 text-blue-400" : "text-slate-400 hover:text-white hover:bg-slate-700"}`}
            title={module.isExtended ? "Collapse module" : "Extend module"}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {module.isExtended ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0v4m0-4h4m6 6l5 5m0 0v-4m0 4h-4" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
              )}
            </svg>
          </button>
        </>
      }
    >
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

          {isLoading && <PokemonModuleSkeleton isExtended={module.isExtended} />}

          {error && (
            <div className="text-center py-8 text-red-400">
              <p>Failed to load Pokemon</p>
              <p className="text-sm text-slate-500 mt-1">
                Check the name and try again
              </p>
            </div>
          )}

          {pokemon && (
            <div className={module.isExtended ? "flex gap-4" : ""}>
              {/* Pokemon Info Sidebar (when extended) or Header (when normal) */}
              <div className={module.isExtended ? "w-48 flex-shrink-0" : ""}>
                <div className={`flex ${module.isExtended ? "flex-col items-center text-center" : "items-center"} gap-4 mb-4`}>
                  <div className={`relative ${module.isExtended ? "w-32 h-32" : "w-20 h-20"} bg-slate-800 rounded-lg flex items-center justify-center`}>
                    {/* Female cosmetic sprite (spriteOverride) wins over official
                        artwork — PokéAPI has no female official artwork, so it's
                        the only way to show the gender difference. */}
                    {(spriteOverride ?? pokemon.sprites.official_artwork ?? pokemon.sprites.front_default) ? (
                      <Image
                        src={spriteOverride ?? pokemon.sprites.official_artwork ?? pokemon.sprites.front_default!}
                        alt={pokemon.displayName}
                        width={module.isExtended ? 128 : 80}
                        height={module.isExtended ? 128 : 80}
                        className={spriteOverride || !pokemon.sprites.official_artwork ? "pixelated" : "object-contain"}
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
                    <div className={`flex items-center gap-1.5 flex-wrap ${module.isExtended ? "justify-center" : ""}`}>
                      {genTypes.map((type) => (
                        <TypeBadge key={type.name} type={type.name} size="sm" />
                      ))}
                      {module.pokemonName && getChampionsMegas().find((m) => m.name === module.pokemonName) && (
                        <span className="rounded bg-teal-600/80 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                          Champions
                        </span>
                      )}
                      {championsMode && (
                        isSpeciesInChampions(pokemon.id) ? (
                          <span
                            title={`${pokemon.displayName} is usable in Pokémon Champions${isMegaInChampions(pokemon.id) ? " (its Mega Evolution is too)" : ""}.`}
                            className="rounded bg-amber-400/15 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-300 ring-1 ring-inset ring-amber-400/40"
                          >
                            In Champions{isMegaInChampions(pokemon.id) ? " · Mega" : ""}
                          </span>
                        ) : (
                          <span
                            title={`${pokemon.displayName} is not in the Pokémon Champions roster.`}
                            className="rounded bg-slate-700/70 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400"
                          >
                            Not in Champions
                          </span>
                        )
                      )}
                      {hasGenderToggle && (
                        <GenderToggle showFemale={showFemale} onToggle={setShowFemale} />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content (tabs + tab content) */}
              <div className={module.isExtended ? "flex-1 min-w-0" : ""}>
                {/* Tabs */}
                <div className="flex mb-4 border-b border-slate-700">
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(module.id, tab.id)}
                      className={`px-2 py-1.5 text-xs font-medium transition-colors whitespace-nowrap flex-1 text-center ${
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
                    <StatsDisplay stats={pokemon.stats} moduleId={module.id} abilities={pokemon.abilities} pokemonName={activeName} />
                  )}
                  {module.activeTab === "abilities" && (
                    <>
                      {module.pokemonName && (() => {
                        const champEntry = getChampionsMegas().find((m) => m.name === module.pokemonName);
                        return champEntry ? (
                          <p className="text-2xs text-fg-subtle mb-2">Mega Stone: {champEntry.stone}</p>
                        ) : null;
                      })()}
                      <AbilitiesPanel abilities={pokemon.abilities} />
                    </>
                  )}
                  {module.activeTab === "types" && (
                    <TypeEffectivenessDisplay pokemon={pokemon} />
                  )}
                  {module.activeTab === "moves" && module.pokemonName && (
                    <LearnsetTable
                      pokemonName={activeName ?? module.pokemonName}
                      pokemonTypes={genTypes}
                    />
                  )}
                  {module.activeTab === "locations" && module.pokemonName && (
                    <LocationsPanel pokemonName={module.pokemonName} />
                  )}
                  {module.activeTab === "evolution" && (
                    <div className="flex items-center justify-center py-4">
                      {evolutionData?.root ? (
                        <EvolutionTree
                          root={evolutionData.root}
                          currentPokemonName={evolutionData.currentPokemonName}
                          onSelect={addPokemonModule}
                        />
                      ) : (
                        // Distinguishes loading / error / "this Pokémon doesn't
                        // evolve" — the old single "Loading…" line stuck forever
                        // for non-evolving Pokémon and on fetch errors.
                        <QueryState
                          isLoading={isEvolutionLoading}
                          isError={isEvolutionError}
                          isEmpty={!isEvolutionLoading && !isEvolutionError && !evolutionData?.root}
                          onRetry={() => refetchEvolution()}
                          loadingLabel="Loading evolution data…"
                          emptyLabel="This Pokémon doesn’t evolve."
                          compact
                        >
                          {null}
                        </QueryState>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!pokemon && !isLoading && !error && (
            <div className="text-center py-12 text-slate-400">
              <p>Click the search bar above to find a Pokemon</p>
            </div>
          )}
    </ModuleShell>

    {showImportExport && (
      <Modal
        isOpen
        onClose={() => { setShowImportExport(false); setImportText(""); setImportError(null); }}
        labelledBy="pkmn-import-title"
        size="sm"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <h3 id="pkmn-import-title" className="text-sm font-medium text-fg">Showdown Format</h3>
          <button
            onClick={() => { setShowImportExport(false); setImportText(""); setImportError(null); }}
            aria-label="Close"
            className="p-1 hover:bg-surface-hover rounded text-fg-subtle hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4">
          <p className="text-xs text-fg-subtle mb-2">Edit or paste a Pokemon set in Showdown format:</p>
          <textarea
            autoFocus
            value={importText}
            onChange={(e) => { setImportText(e.target.value); setImportError(null); }}
            placeholder={`Pikachu @ Light Ball
Level: 50
Adamant Nature
EVs: 252 Atk / 4 SpD / 252 Spe
IVs: 0 SpA`}
            className="w-full h-48 bg-surface border border-line rounded p-3 text-xs text-fg font-mono placeholder-fg-subtle focus:outline-none focus:border-accent resize-none"
          />
          {importError && (
            <p className="mt-2 text-xs text-red-400">{importError}</p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => navigator.clipboard.writeText(importText)}
              className="flex-1 px-3 py-2 bg-surface-hover hover:bg-line rounded text-sm text-fg font-medium transition-colors"
            >
              Copy
            </button>
            <button
              onClick={handleImport}
              disabled={!importText.trim()}
              className="flex-1 px-3 py-2 bg-accent hover:bg-accent-hover disabled:bg-surface-hover disabled:text-fg-subtle rounded text-sm text-white font-medium transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </Modal>
    )}
    </>
  );
}
