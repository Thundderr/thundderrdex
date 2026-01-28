"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import { useModuleStore } from "@/stores/moduleStore";
import { useGenerationStore } from "@/stores/generationStore";
import { usePokemonList } from "@/hooks/usePokemonList";
import { usePokemon } from "@/hooks/usePokemon";
import { useLearnset } from "@/hooks/useLearnset";
import { Move } from "@/types/moves";
import { DamageCalcPokemonConfig, DamageCalcStatus } from "@/types/module";
import { StatValues, calculateStats } from "@/lib/utils/statCalculator";
import { NATURES, getNatureByName, STAT_DISPLAY_NAMES, StatKey } from "@/data/natures";
import { TYPE_COLORS } from "@/data/typeChart";
import { getTypesForGeneration } from "@/lib/pokeapi/transformers";
import { TypeBadge } from "@/components/type-chart/TypeBadge";

interface Props {
  moduleId: string;
  config: DamageCalcPokemonConfig;
  isAttacker: boolean;
}

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

// Stat keys for the table
const STAT_KEYS: (keyof StatValues)[] = [
  "hp",
  "attack",
  "defense",
  "specialAttack",
  "specialDefense",
  "speed",
];

const STAT_LABELS: Record<keyof StatValues, string> = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  specialAttack: "Sp. Atk",
  specialDefense: "Sp. Def",
  speed: "Speed",
};

// Map StatValues keys to boost keys
const STAT_TO_BOOST: Record<keyof StatValues, string | null> = {
  hp: null,
  attack: "atk",
  defense: "def",
  specialAttack: "spa",
  specialDefense: "spd",
  speed: "spe",
};

// Status conditions
const STATUS_OPTIONS: DamageCalcStatus[] = [
  "Healthy",
  "Burned",
  "Paralyzed",
  "Poisoned",
  "Badly Poisoned",
  "Asleep",
  "Frozen",
];

// Common competitive items
const COMMON_ITEMS = [
  "Choice Band",
  "Choice Specs",
  "Choice Scarf",
  "Life Orb",
  "Leftovers",
  "Heavy-Duty Boots",
  "Assault Vest",
  "Focus Sash",
  "Rocky Helmet",
  "Eviolite",
  "Black Sludge",
  "Flame Orb",
  "Toxic Orb",
  "Light Clay",
  "Expert Belt",
  "Weakness Policy",
  "Air Balloon",
  "Sitrus Berry",
  "Lum Berry",
];

// Boost options for dropdown
const BOOST_OPTIONS = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];

// Damage class icon matching LearnsetTable/MoveSelector style
function DamageClassIcon({ damageClass }: { damageClass: string }) {
  const config = {
    physical: { color: "bg-orange-600", label: "P" },
    special: { color: "bg-blue-600", label: "S" },
    status: { color: "bg-slate-600", label: "-" },
  }[damageClass] ?? { color: "bg-slate-600", label: "?" };

  return (
    <span
      className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-white flex-shrink-0 ${config.color}`}
      title={damageClass}
    >
      {config.label}
    </span>
  );
}

export function PokemonConfigPanel({ moduleId, config, isAttacker }: Props) {
  const { setDamageCalcAttacker, setDamageCalcDefender, setDamageCalcMove } = useModuleStore();
  const { globalGeneration, setGeneration } = useGenerationStore();
  const { data: pokemonList } = usePokemonList();
  const { data: pokemon } = usePokemon(config.pokemonName);
  const { data: learnset, isLoading: learnsetLoading } = useLearnset(config.pokemonName);

  const [isSearching, setIsSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Move slot editing state
  const [editingMoveSlot, setEditingMoveSlot] = useState<number | null>(null);
  const [moveQuery, setMoveQuery] = useState("");
  const [moveHighlightedIndex, setMoveHighlightedIndex] = useState(0);
  const moveInputRef = useRef<HTMLInputElement>(null);
  const moveListRef = useRef<HTMLUListElement>(null);

  // Import/Export modal state
  const [showImportExport, setShowImportExport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  const setConfig = isAttacker ? setDamageCalcAttacker : setDamageCalcDefender;

  // Get types for the selected generation
  const genTypes = useMemo(() => {
    if (!pokemon) return [];
    return getTypesForGeneration(pokemon, globalGeneration);
  }, [pokemon, globalGeneration]);

  // Check if Pokemon exists in the current generation
  const pokemonExistsInGen = useMemo(() => {
    if (!pokemon) return true;
    const pokeGen = getPokemonGeneration(pokemon.id);
    return pokeGen <= globalGeneration;
  }, [pokemon, globalGeneration]);

  // Get abilities for the Pokemon
  const abilities = useMemo(() => {
    if (!pokemon) return [];
    return pokemon.abilities.map((a) => a.displayName);
  }, [pokemon]);

  // Get current nature object
  const currentNature = useMemo(() => {
    return getNatureByName(config.nature) || NATURES[0];
  }, [config.nature]);

  // Calculate final stats
  const calculatedStats = useMemo(() => {
    if (!pokemon) return null;
    return calculateStats(
      pokemon.stats,
      { level: config.level, ivs: config.ivs, evs: config.evs, nature: config.nature },
      currentNature
    );
  }, [pokemon, config.level, config.ivs, config.evs, config.nature, currentNature]);

  // Get available damaging moves from learnset
  const availableMoves = useMemo(() => {
    if (!learnset) return [];

    const seenMoves = new Set<string>();
    const filteredMoves: Move[] = [];

    for (const entry of learnset) {
      if (entry.generation > globalGeneration) continue;
      if (seenMoves.has(entry.move.name)) continue;
      // Only include moves with power (damaging moves)
      if (entry.move.power === null || entry.move.power === 0) continue;

      seenMoves.add(entry.move.name);
      filteredMoves.push(entry.move);
    }

    // Sort by power (descending), then name
    return filteredMoves.sort((a, b) => {
      const powerA = a.power || 0;
      const powerB = b.power || 0;
      if (powerB !== powerA) return powerB - powerA;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [learnset, globalGeneration]);

  // Filter moves by search query for move slot editing
  // Also filters out moves already selected in other slots (duplicate prevention)
  const filteredMoveOptions = useMemo(() => {
    // Get currently selected moves (excluding the slot being edited)
    const selectedMoves = new Set(
      (config.moves || [])
        .filter((m, idx) => m && idx !== editingMoveSlot)
    );

    // Filter out already selected moves
    const nonDuplicateMoves = availableMoves.filter(
      (move) => !selectedMoves.has(move.name)
    );

    if (!moveQuery) return nonDuplicateMoves;
    const lowerQuery = moveQuery.toLowerCase();
    return nonDuplicateMoves.filter(
      (move) =>
        move.displayName.toLowerCase().includes(lowerQuery) ||
        move.type.toLowerCase().includes(lowerQuery)
    );
  }, [availableMoves, moveQuery, config.moves, editingMoveSlot]);

  // Get move data for a slot
  const getMoveData = useCallback(
    (moveName: string | null): Move | null => {
      if (!moveName || !learnset) return null;
      const entry = learnset.find((e) => e.move.name === moveName);
      return entry?.move || null;
    },
    [learnset]
  );

  // Calculate effective speed (accounting for paralysis, Choice Scarf, boosts)
  const effectiveSpeed = useMemo(() => {
    if (!calculatedStats) return null;
    let speed = calculatedStats.speed;

    // Apply boost modifier
    const boostStage = config.boosts.spe;
    if (boostStage > 0) {
      speed = Math.floor(speed * (2 + boostStage) / 2);
    } else if (boostStage < 0) {
      speed = Math.floor(speed * 2 / (2 - boostStage));
    }

    // Paralysis halves speed
    if (config.status === "Paralyzed") {
      speed = Math.floor(speed * 0.5);
    }

    // Choice Scarf boosts speed by 50%
    if (config.item === "Choice Scarf") {
      speed = Math.floor(speed * 1.5);
    }

    return speed;
  }, [calculatedStats, config.boosts.spe, config.status, config.item]);

  // Filter Pokemon search results
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
    setConfig(moduleId, { ...config, pokemonName: name, ability: null });
    setQuery("");
    setIsSearching(false);
    setHighlightedIndex(0);
  };

  const startSearch = () => {
    setIsSearching(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const updateConfig = (updates: Partial<DamageCalcPokemonConfig>) => {
    setConfig(moduleId, { ...config, ...updates });
  };

  // Parse input value, removing leading zeros
  const parseInputValue = (value: string): number => {
    const stripped = value.replace(/^0+/, "") || "0";
    return parseInt(stripped, 10) || 0;
  };

  const updateIv = (stat: keyof StatValues, rawValue: string) => {
    const value = parseInputValue(rawValue);
    const clampedValue = Math.max(0, Math.min(31, value));
    updateConfig({ ivs: { ...config.ivs, [stat]: clampedValue } });
  };

  const updateEv = (stat: keyof StatValues, rawValue: string) => {
    const value = parseInputValue(rawValue);
    const clampedValue = Math.max(0, Math.min(252, value));
    updateConfig({ evs: { ...config.evs, [stat]: clampedValue } });
  };

  const updateBoost = (boostKey: string, value: number) => {
    updateConfig({ boosts: { ...config.boosts, [boostKey]: value } });
  };

  const updateMove = (slotIndex: number, moveName: string | null) => {
    const newMoves = [...(config.moves || [null, null, null, null])];
    newMoves[slotIndex] = moveName;
    updateConfig({ moves: newMoves });
    // Auto-select the move for damage calc when adding to attacker
    if (moveName && isAttacker) {
      setDamageCalcMove(moduleId, moveName);
    }
  };

  const handleMoveSlotKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setMoveHighlightedIndex((i) => Math.min(i + 1, filteredMoveOptions.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setMoveHighlightedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredMoveOptions[moveHighlightedIndex] && editingMoveSlot !== null) {
          updateMove(editingMoveSlot, filteredMoveOptions[moveHighlightedIndex].name);
          setEditingMoveSlot(null);
          setMoveQuery("");
        }
        break;
      case "Escape":
        setEditingMoveSlot(null);
        setMoveQuery("");
        break;
    }
  };

  const selectMoveForCalc = (moveName: string | null) => {
    if (moveName && isAttacker) {
      setDamageCalcMove(moduleId, moveName);
    }
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

  // Set default ability when Pokemon changes
  useEffect(() => {
    if (pokemon && !config.ability && abilities.length > 0) {
      updateConfig({ ability: abilities[0] });
    }
  }, [pokemon, abilities]);

  // Focus move input when editing
  useEffect(() => {
    if (editingMoveSlot !== null) {
      setMoveQuery("");
      setMoveHighlightedIndex(0);
      setTimeout(() => moveInputRef.current?.focus(), 0);
    }
  }, [editingMoveSlot]);

  // Scroll to highlighted move
  useEffect(() => {
    if (moveListRef.current && filteredMoveOptions.length > 0) {
      const item = moveListRef.current.children[moveHighlightedIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [moveHighlightedIndex, filteredMoveOptions.length]);

  const evTotal = Object.values(config.evs).reduce((sum, v) => sum + v, 0);
  const maxHp = calculatedStats?.hp || 100;
  const currentHp = Math.floor((config.currentHpPercent / 100) * maxHp);

  // Showdown format serializer
  const serializeToShowdown = (): string => {
    if (!pokemon) return "";

    const lines: string[] = [];

    // Line 1: Pokemon @ Item
    let line1 = pokemon.displayName;
    if (config.item) {
      line1 += ` @ ${config.item}`;
    }
    lines.push(line1);

    // Level (only if not 100)
    if (config.level !== 100) {
      lines.push(`Level: ${config.level}`);
    }

    // Ability
    if (config.ability) {
      lines.push(`Ability: ${config.ability}`);
    }

    // Nature
    lines.push(`${config.nature} Nature`);

    // EVs (only non-zero)
    const evParts: string[] = [];
    const evMap: Record<keyof StatValues, string> = {
      hp: "HP", attack: "Atk", defense: "Def",
      specialAttack: "SpA", specialDefense: "SpD", speed: "Spe"
    };
    for (const [key, label] of Object.entries(evMap)) {
      const value = config.evs[key as keyof StatValues];
      if (value > 0) {
        evParts.push(`${value} ${label}`);
      }
    }
    if (evParts.length > 0) {
      lines.push(`EVs: ${evParts.join(" / ")}`);
    }

    // IVs (only non-31)
    const ivParts: string[] = [];
    for (const [key, label] of Object.entries(evMap)) {
      const value = config.ivs[key as keyof StatValues];
      if (value < 31) {
        ivParts.push(`${value} ${label}`);
      }
    }
    if (ivParts.length > 0) {
      lines.push(`IVs: ${ivParts.join(" / ")}`);
    }

    // Moves
    for (const move of config.moves || []) {
      if (move) {
        const moveData = getMoveData(move);
        if (moveData) {
          lines.push(`- ${moveData.displayName}`);
        }
      }
    }

    return lines.join("\n");
  };

  // Showdown format parser
  const parseShowdown = (text: string): { error: string } | { config: Partial<DamageCalcPokemonConfig> & { pokemonName: string } } => {
    // Normalize whitespace: replace tabs with spaces, collapse multiple spaces
    const normalizedText = text.replace(/\t/g, " ").replace(/ +/g, " ");
    const lines = normalizedText.trim().split("\n").map(l => l.trim()).filter(l => l);
    if (lines.length === 0) {
      return { error: "No text to parse" };
    }

    // Parse first line: Pokemon @ Item or Pokemon (nickname) @ Item
    const firstLine = lines[0];
    let pokemonName: string;
    let item: string | null = null;

    if (firstLine.includes(" @ ")) {
      const [pokePart, itemPart] = firstLine.split(" @ ");
      pokemonName = pokePart.trim();
      item = itemPart.trim();
    } else {
      pokemonName = firstLine.trim();
    }

    // Handle nickname format: Nickname (Pokemon)
    const nicknameMatch = pokemonName.match(/^.+\s*\(([^)]+)\)$/);
    if (nicknameMatch) {
      pokemonName = nicknameMatch[1].trim();
    }

    // Normalize pokemon name for API lookup - handle spaces, punctuation, etc.
    const normalizedName = pokemonName.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    // Also create a simple lowercase version for fuzzy matching
    const simpleName = pokemonName.toLowerCase().replace(/[^a-z0-9]/g, "");

    // Check if Pokemon exists in the list and in current generation
    const foundPokemon = pokemonList?.find(p => {
      // Direct name match
      if (p.name === normalizedName) return true;
      // Display name match (case insensitive)
      if (p.displayName.toLowerCase() === pokemonName.toLowerCase()) return true;
      // Fuzzy match: compare simplified versions (no spaces/punctuation)
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

    // Parse remaining lines
    let level = 100;
    let ability: string | null = null;
    let nature = "Hardy";
    const evs: StatValues = { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };
    const ivs: StatValues = { hp: 31, attack: 31, defense: 31, specialAttack: 31, specialDefense: 31, speed: 31 };
    const moves: (string | null)[] = [null, null, null, null];
    let moveIndex = 0;

    const statMap: Record<string, keyof StatValues> = {
      "hp": "hp", "atk": "attack", "def": "defense",
      "spa": "specialAttack", "spd": "specialDefense", "spe": "speed"
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      // Level
      if (line.toLowerCase().startsWith("level:")) {
        level = parseInt(line.split(":")[1].trim()) || 100;
        level = Math.max(1, Math.min(100, level));
        continue;
      }

      // Ability
      if (line.toLowerCase().startsWith("ability:")) {
        ability = line.split(":")[1].trim();
        continue;
      }

      // Nature
      if (line.toLowerCase().endsWith("nature")) {
        nature = line.replace(/\s*nature\s*$/i, "").trim();
        continue;
      }

      // EVs
      if (line.toLowerCase().startsWith("evs:")) {
        const evStr = line.substring(4).trim();
        const evParts = evStr.split("/").map(s => s.trim());
        for (const part of evParts) {
          const match = part.match(/^(\d+)\s*(\w+)$/);
          if (match) {
            const value = parseInt(match[1]);
            const stat = statMap[match[2].toLowerCase()];
            if (stat) {
              evs[stat] = Math.min(252, Math.max(0, value));
            }
          }
        }
        continue;
      }

      // IVs
      if (line.toLowerCase().startsWith("ivs:")) {
        const ivStr = line.substring(4).trim();
        const ivParts = ivStr.split("/").map(s => s.trim());
        for (const part of ivParts) {
          const match = part.match(/^(\d+)\s*(\w+)$/);
          if (match) {
            const value = parseInt(match[1]);
            const stat = statMap[match[2].toLowerCase()];
            if (stat) {
              ivs[stat] = Math.min(31, Math.max(0, value));
            }
          }
        }
        continue;
      }

      // Moves (start with -)
      if (line.startsWith("-") && moveIndex < 4) {
        const moveName = line.substring(1).trim();
        // Normalize move name for lookup
        const normalizedMove = moveName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
        moves[moveIndex] = normalizedMove;
        moveIndex++;
        continue;
      }
    }

    // Validate item is in common items (or set to null if not found)
    if (item && !COMMON_ITEMS.includes(item)) {
      item = null; // Item not in our list, ignore
    }

    // Validate nature
    const validNature = NATURES.find(n => n.name.toLowerCase() === nature.toLowerCase());
    if (!validNature) {
      nature = "Hardy";
    } else {
      nature = validNature.name;
    }

    return {
      config: {
        pokemonName: foundPokemon.name,
        level,
        ability,
        item,
        nature,
        evs,
        ivs,
        moves,
      }
    };
  };

  const handleImport = () => {
    const result = parseShowdown(importText);
    if ("error" in result) {
      setImportError(result.error);
      return;
    }

    // Apply the parsed config
    updateConfig({
      pokemonName: result.config.pokemonName,
      level: result.config.level,
      ability: result.config.ability,
      item: result.config.item,
      nature: result.config.nature,
      evs: result.config.evs,
      ivs: result.config.ivs,
      moves: result.config.moves,
    });

    setShowImportExport(false);
    setImportText("");
    setImportError(null);
  };

  return (
    <div className="bg-slate-800 rounded-lg p-2 space-y-2">
      {/* Pokemon Search / Display */}
      {isSearching ? (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onBlur={() =>
              setTimeout(() => {
                setIsSearching(false);
                setQuery("");
              }, 200)
            }
            onKeyDown={handleKeyDown}
            placeholder="Search Pokemon..."
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
            autoFocus
          />
          {filteredResults.length > 0 && (
            <ul
              ref={listRef}
              className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded shadow-xl max-h-48 overflow-auto"
            >
              {filteredResults.map((poke, index) => {
                const pokeGen = getPokemonGeneration(poke.id);
                const existsInGen = pokeGen <= globalGeneration;

                return (
                  <li
                    key={poke.id}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => existsInGen && handleSelect(poke.name)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                      index === highlightedIndex
                        ? "bg-slate-700"
                        : "hover:bg-slate-700/50"
                    } ${!existsInGen ? "cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <Image
                      src={poke.spriteUrl}
                      alt=""
                      width={24}
                      height={24}
                      className={`pixelated ${!existsInGen ? "opacity-40 grayscale" : ""}`}
                      unoptimized
                    />
                    <span
                      className={`flex-1 truncate ${existsInGen ? "text-white" : "text-slate-500"}`}
                    >
                      {poke.displayName}
                    </span>
                    {!existsInGen && (
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setGeneration(pokeGen);
                        }}
                        className="px-1.5 py-0.5 text-[10px] bg-blue-600 hover:bg-blue-500 text-white rounded"
                      >
                        Gen {pokeGen}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : pokemon ? (
        <div
          className={`flex items-center gap-3 cursor-pointer hover:bg-slate-700/50 rounded p-1 -m-1 ${!pokemonExistsInGen ? "opacity-60" : ""}`}
          onClick={startSearch}
        >
          <div className="relative flex-shrink-0">
            <Image
              src={pokemon.sprites.front_default || ""}
              alt={pokemon.displayName}
              width={48}
              height={48}
              className={`pixelated ${!pokemonExistsInGen ? "grayscale" : ""}`}
              unoptimized
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${!pokemonExistsInGen ? "text-slate-400 line-through" : "text-white"}`}>
              {pokemon.displayName}
            </p>
            <div className="flex gap-1 mt-1">
              {genTypes.map((type) => (
                <span
                  key={type.name}
                  className="px-1.5 py-0.5 text-[10px] rounded text-white"
                  style={{ backgroundColor: TYPE_COLORS[type.name] }}
                >
                  {type.name.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
          {!pokemonExistsInGen && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setGeneration(getPokemonGeneration(pokemon.id));
              }}
              className="px-2 py-1 text-[10px] bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors flex-shrink-0"
              title={`Switch to Gen ${getPokemonGeneration(pokemon.id)}`}
            >
              Gen {getPokemonGeneration(pokemon.id)}
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={startSearch}
          className="w-full flex items-center justify-center gap-2 py-6 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors border-2 border-dashed border-slate-600 hover:border-slate-500"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span className="text-sm">Select Pokemon</span>
        </button>
      )}

      {/* Only show config options when Pokemon is selected */}
      {config.pokemonName && pokemon && (
        <>
          {/* Level and Import/Export Row */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-slate-400">Lv</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={config.level}
                onChange={(e) =>
                  updateConfig({
                    level: Math.max(1, Math.min(100, parseInputValue(e.target.value) || 1)),
                  })
                }
                className="w-10 bg-slate-700 border border-slate-600 rounded px-1 py-1 text-white text-center focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex-1" />
            <button
              onClick={() => {
                setImportText(serializeToShowdown());
                setImportError(null);
                setShowImportExport(true);
              }}
              className="px-2 py-1 text-[10px] font-medium rounded border transition-colors bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600"
              title="Import/Export Showdown format"
            >
              Showdown
            </button>
          </div>

          {/* Stats Table */}
          <div className="border border-slate-700 rounded overflow-hidden text-[11px]">
            {/* Header */}
            <div className="grid grid-cols-[60px_36px_36px_44px_44px_44px_40px] bg-slate-900/50 text-slate-400 uppercase">
              <div className="px-2 py-1"></div>
              <div className="px-1 py-1 text-center">Base</div>
              <div className="px-1 py-1 text-center">IVs</div>
              <div className="px-1 py-1 text-center">EVs</div>
              <div className="px-1 py-1 text-center"></div>
              <div className="px-1 py-1 text-center"></div>
              <div className="px-1 py-1 text-center"></div>
            </div>
            {/* Stat Rows */}
            {STAT_KEYS.map((stat) => {
              const boostKey = STAT_TO_BOOST[stat];
              const boostValue = boostKey ? config.boosts[boostKey as keyof typeof config.boosts] : 0;
              const baseStat = pokemon.stats[stat];
              const calculatedStat = calculatedStats ? calculatedStats[stat] : 0;
              const nature = currentNature;
              const statKey = stat as StatKey;
              const isIncreased = stat !== "hp" && nature.increasedStat === statKey;
              const isDecreased = stat !== "hp" && nature.decreasedStat === statKey;
              const isSpeedRow = stat === "speed";

              return (
                <div
                  key={stat}
                  className="grid grid-cols-[60px_36px_36px_44px_44px_44px_40px] border-t border-slate-700/50"
                >
                  <div className={`px-2 py-1.5 font-medium ${
                    isIncreased ? "text-green-400" : isDecreased ? "text-red-400" : "text-slate-300"
                  }`}>
                    {STAT_LABELS[stat]}
                  </div>
                  <div className="px-1 py-1.5 text-center text-slate-400">
                    {baseStat}
                  </div>
                  <div className="px-0.5 py-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={config.ivs[stat]}
                      onChange={(e) => updateIv(stat, e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-white text-center focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="px-0.5 py-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={config.evs[stat]}
                      onChange={(e) => updateEv(stat, e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-white text-center focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="px-1 py-1.5 text-center text-white font-medium">
                    {calculatedStat}
                  </div>
                  <div className="px-0.5 py-1">
                    {boostKey ? (
                      <select
                        value={boostValue}
                        onChange={(e) => updateBoost(boostKey, parseInt(e.target.value))}
                        className={`w-full bg-slate-700 border border-slate-600 rounded px-0 py-0.5 text-center focus:outline-none focus:border-blue-500 ${
                          boostValue > 0 ? "text-green-400" : boostValue < 0 ? "text-red-400" : "text-slate-400"
                        }`}
                      >
                        {BOOST_OPTIONS.map((b) => (
                          <option key={b} value={b}>
                            {b > 0 ? `+${b}` : b === 0 ? "--" : b}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="block text-center text-slate-600">--</span>
                    )}
                  </div>
                  <div className="px-1 py-1.5 text-center">
                    {isSpeedRow && effectiveSpeed !== null && effectiveSpeed !== calculatedStat && (
                      <span className="text-cyan-400 font-medium" title="Effective Speed">
                        {effectiveSpeed}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {/* Total Row */}
            <div className="grid grid-cols-[60px_36px_36px_44px_44px_44px_40px] border-t border-slate-700 bg-slate-900/30">
              <div className="px-2 py-1.5 text-slate-400 font-medium">Total</div>
              <div className="px-1 py-1.5 text-center text-slate-500">
                {pokemon.stats.total}
              </div>
              <div className="px-1 py-1.5"></div>
              <div className={`px-1 py-1.5 text-center font-medium ${
                evTotal > 510 ? "text-red-400" : evTotal === 510 ? "text-green-400" : "text-slate-400"
              }`}>
                {evTotal}
              </div>
              <div className="px-1 py-1.5"></div>
              <div className="px-1 py-1.5"></div>
              <div className="px-1 py-1.5"></div>
            </div>
          </div>

          {/* Nature Row */}
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-slate-400 w-14">Nature</label>
            <select
              value={config.nature}
              onChange={(e) => updateConfig({ nature: e.target.value })}
              className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              {NATURES.map((nature) => (
                <option key={nature.name} value={nature.name}>
                  {nature.name}
                  {nature.increasedStat
                    ? ` (+${STAT_DISPLAY_NAMES[nature.increasedStat]}, -${STAT_DISPLAY_NAMES[nature.decreasedStat!]})`
                    : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Ability Row */}
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-slate-400 w-14">Ability</label>
            <select
              value={config.ability || ""}
              onChange={(e) => updateConfig({ ability: e.target.value || null })}
              className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">None</option>
              {abilities.map((ability) => (
                <option key={ability} value={ability}>
                  {ability}
                </option>
              ))}
            </select>
          </div>

          {/* Item Row */}
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-slate-400 w-14">Item</label>
            <select
              value={config.item || ""}
              onChange={(e) => updateConfig({ item: e.target.value || null })}
              className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">None</option>
              {COMMON_ITEMS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {/* Status Row */}
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-slate-400 w-14">Status</label>
            <select
              value={config.status}
              onChange={(e) => updateConfig({ status: e.target.value as DamageCalcStatus })}
              className={`flex-1 bg-slate-700 border rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 ${
                config.status === "Burned" ? "border-orange-500" :
                config.status === "Paralyzed" ? "border-yellow-500" :
                config.status === "Poisoned" || config.status === "Badly Poisoned" ? "border-purple-500" :
                config.status === "Asleep" ? "border-slate-400" :
                config.status === "Frozen" ? "border-cyan-500" :
                "border-slate-600"
              }`}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {/* Current HP Section */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="text-[11px] text-slate-400 w-14">HP</label>
              <div className="flex items-center gap-1 flex-1">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={currentHp}
                  onChange={(e) => {
                    const hp = Math.max(0, Math.min(maxHp, parseInputValue(e.target.value)));
                    updateConfig({ currentHpPercent: Math.round((hp / maxHp) * 100) });
                  }}
                  className="w-14 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white text-center focus:outline-none focus:border-blue-500"
                />
                <span className="text-[11px] text-slate-400">/{maxHp}</span>
                <span className="text-[11px] text-slate-500 ml-1">(</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={config.currentHpPercent}
                  onChange={(e) =>
                    updateConfig({
                      currentHpPercent: Math.max(0, Math.min(100, parseInputValue(e.target.value))),
                    })
                  }
                  className="w-12 bg-slate-700 border border-slate-600 rounded px-1 py-1 text-xs text-white text-center focus:outline-none focus:border-blue-500"
                />
                <span className="text-[11px] text-slate-500">%)</span>
              </div>
            </div>
            {/* Health Bar */}
            <div className="h-3 bg-slate-700 rounded overflow-hidden">
              <div
                className={`h-full transition-all ${
                  config.currentHpPercent > 50 ? "bg-green-500" :
                  config.currentHpPercent > 25 ? "bg-yellow-500" :
                  "bg-red-500"
                }`}
                style={{ width: `${config.currentHpPercent}%` }}
              />
            </div>
          </div>

          {/* Move Slots */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-slate-500 uppercase">Moves</label>
              {learnsetLoading && (
                <span className="text-[10px] text-slate-500">Loading...</span>
              )}
            </div>
            <div className="space-y-1">
              {[0, 1, 2, 3].map((slotIndex) => {
                const moveName = config.moves?.[slotIndex] || null;
                const moveData = getMoveData(moveName);
                const isEditing = editingMoveSlot === slotIndex;

                return (
                  <div key={slotIndex} className="relative">
                    {isEditing ? (
                      <div>
                        <input
                          ref={moveInputRef}
                          type="text"
                          value={moveQuery}
                          onChange={(e) => setMoveQuery(e.target.value)}
                          onBlur={() =>
                            setTimeout(() => {
                              setEditingMoveSlot(null);
                              setMoveQuery("");
                            }, 200)
                          }
                          onKeyDown={handleMoveSlotKeyDown}
                          placeholder="Search moves..."
                          className="w-full px-2 py-1.5 bg-slate-700 border border-blue-500 rounded text-white placeholder-slate-400 focus:outline-none text-xs"
                          autoFocus
                        />
                        {filteredMoveOptions.length > 0 && (
                          <ul
                            ref={moveListRef}
                            className="absolute z-50 w-full bottom-full mb-1 bg-slate-800 border border-slate-700 rounded shadow-xl max-h-[320px] overflow-auto"
                          >
                            {/* Header row */}
                            <li className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] text-slate-500 border-b border-slate-700 bg-slate-800/95 sticky top-0">
                              <span className="flex-1 min-w-0">Move</span>
                              <span className="w-[52px] text-center">Type</span>
                              <span className="w-5 text-center">Cat</span>
                              <span className="w-8 text-right">Pwr</span>
                              <span className="w-8 text-right">Acc</span>
                              <span className="w-6 text-right">PP</span>
                            </li>
                            {filteredMoveOptions.map((move, index) => (
                              <li
                                key={move.name}
                                onMouseEnter={() => setMoveHighlightedIndex(index)}
                                onClick={() => {
                                  updateMove(slotIndex, move.name);
                                  setEditingMoveSlot(null);
                                  setMoveQuery("");
                                }}
                                className={`px-3 py-1.5 cursor-pointer ${
                                  index === moveHighlightedIndex
                                    ? "bg-slate-700"
                                    : "hover:bg-slate-700/50"
                                }`}
                              >
                                {/* Main stats row */}
                                <div className="flex items-center gap-1.5 text-[11px]">
                                  <span className="flex-1 text-white truncate min-w-0">
                                    {move.displayName}
                                  </span>
                                  <span className="w-[52px] flex justify-center flex-shrink-0">
                                    <TypeBadge type={move.type} size="xs" fixedWidth />
                                  </span>
                                  <span className="w-5 flex justify-center flex-shrink-0">
                                    <DamageClassIcon damageClass={move.damageClass} />
                                  </span>
                                  <span className="w-8 text-right text-slate-300 font-mono text-[10px] flex-shrink-0">
                                    {move.power ?? "-"}
                                  </span>
                                  <span className="w-8 text-right text-slate-300 font-mono text-[10px] flex-shrink-0">
                                    {move.accuracy ?? "-"}
                                  </span>
                                  <span className="w-6 text-right text-slate-400 font-mono text-[10px] flex-shrink-0">
                                    {move.pp}
                                  </span>
                                </div>
                                {/* Effect description row */}
                                {move.description && (
                                  <div className="mt-1.5 text-[9px] text-slate-400 line-clamp-2 leading-tight">
                                    {move.description}
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : moveData ? (
                      <div
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] cursor-pointer ${
                          isAttacker ? "hover:bg-slate-600" : "bg-slate-700/50 hover:bg-slate-700"
                        }`}
                        onClick={() => {
                          selectMoveForCalc(moveName);
                          setEditingMoveSlot(slotIndex);
                        }}
                      >
                        <TypeBadge type={moveData.type} size="xs" fixedWidth />
                        <DamageClassIcon damageClass={moveData.damageClass} />
                        <span className="flex-1 text-white truncate">
                          {moveData.displayName}
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          {moveData.power} BP
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateMove(slotIndex, null);
                          }}
                          className="p-0.5 text-slate-500 hover:text-red-400 rounded"
                          title="Remove move"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingMoveSlot(slotIndex)}
                        className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] text-slate-500 hover:text-slate-300 hover:bg-slate-700 rounded border border-dashed border-slate-600 hover:border-slate-500 transition-colors"
                        disabled={learnsetLoading || !pokemon}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Move {slotIndex + 1}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

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
Ability: Static
Adamant Nature
EVs: 252 Atk / 4 SpD / 252 Spe
- Volt Tackle
- Iron Tail
- Quick Attack
- Thunder Wave`}
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
