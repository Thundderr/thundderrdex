"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { PokemonStats, PokemonAbility } from "@/types/pokemon";
import { useModuleStore } from "@/stores/moduleStore";
import { calculateStats, getEvTotal, StatValues } from "@/lib/utils/statCalculator";
import { getNatureByName, NATURES, STAT_DISPLAY_NAMES } from "@/data/natures";
import { useLearnset } from "@/hooks/useLearnset";
import { useGenerationStore } from "@/stores/generationStore";
import { TYPE_COLORS } from "@/data/typeChart";
import { formatPokemonName } from "@/lib/pokeapi/transformers";
import { filterItems } from "@/data/items";
import { TypeBadge } from "@/components/type-chart/TypeBadge";
import { isMegaPokemon, getMegaStone } from "@/lib/utils/generationConfig";

// Item icon using PokeAPI sprites (kebab-case format)
function ItemIcon({ item, size = 24 }: { item: string; size?: number }) {
  // Convert item name to PokeAPI format (lowercase, hyphens between words)
  const itemId = item.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${itemId}.png`;

  return (
    <img
      src={spriteUrl}
      alt={item}
      width={size}
      height={size}
      className="pixelated flex-shrink-0"
      style={{ imageRendering: 'pixelated' }}
      onError={(e) => {
        // Hide on error (item sprite not found)
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
}

// Category icon matching LearnsetTable
function DamageClassIcon({ damageClass }: { damageClass: string }) {
  const config = {
    physical: { color: "bg-orange-600", label: "P" },
    special: { color: "bg-blue-600", label: "S" },
    status: { color: "bg-slate-600", label: "-" },
  }[damageClass] ?? { color: "bg-slate-600", label: "?" };

  return (
    <span
      className={`inline-flex items-center justify-center w-4 h-4 rounded text-[9px] font-bold text-white ${config.color}`}
      title={damageClass}
    >
      {config.label}
    </span>
  );
}

interface Props {
  stats: PokemonStats;
  moduleId: string;
  abilities?: PokemonAbility[];
  pokemonName?: string | null;
}

const STAT_KEYS: (keyof StatValues)[] = [
  "hp",
  "attack",
  "defense",
  "specialAttack",
  "specialDefense",
  "speed",
];

const STAT_CONFIG: {
  key: keyof StatValues;
  label: string;
  color: string;
  baseMax: number;
}[] = [
  { key: "hp", label: "HP", color: "bg-red-500", baseMax: 255 },
  { key: "attack", label: "Attack", color: "bg-orange-500", baseMax: 190 },
  { key: "defense", label: "Defense", color: "bg-yellow-500", baseMax: 230 },
  { key: "specialAttack", label: "Sp. Atk", color: "bg-blue-500", baseMax: 194 },
  { key: "specialDefense", label: "Sp. Def", color: "bg-green-500", baseMax: 230 },
  { key: "speed", label: "Speed", color: "bg-pink-500", baseMax: 200 },
];

// EV Presets
const EV_PRESETS = [
  { label: "Atk/Spe", evs: { hp: 4, attack: 252, defense: 0, specialAttack: 0, specialDefense: 0, speed: 252 } },
  { label: "SpA/Spe", evs: { hp: 4, attack: 0, defense: 0, specialAttack: 252, specialDefense: 0, speed: 252 } },
  { label: "HP/Def", evs: { hp: 252, attack: 0, defense: 252, specialAttack: 0, specialDefense: 4, speed: 0 } },
  { label: "HP/SpD", evs: { hp: 252, attack: 0, defense: 4, specialAttack: 0, specialDefense: 252, speed: 0 } },
];

// Helper to parse input values and strip leading zeros
const parseInputValue = (value: string): number => {
  const stripped = value.replace(/^0+/, "") || "0";
  return parseInt(stripped, 10) || 0;
};

export function StatsDisplay({ stats, moduleId, abilities, pokemonName }: Props) {
  const { tabs, activeTabId, setLevel, setIv, setEv, setNature, setAllIvs, setAllEvs, setAbility, setItem, setModuleMove } = useModuleStore();
  const { globalGeneration } = useGenerationStore();

  // Fetch learnset for move selection
  const { data: learnset } = useLearnset(pokemonName || null);

  // Move search state
  const [searchingMoveSlot, setSearchingMoveSlot] = useState<number | null>(null);
  const [moveQuery, setMoveQuery] = useState("");
  const [highlightedMoveIndex, setHighlightedMoveIndex] = useState(0);
  const moveInputRef = useRef<HTMLInputElement>(null);
  const moveListRef = useRef<HTMLUListElement>(null);

  // Item search state
  const [isSearchingItem, setIsSearchingItem] = useState(false);
  const [itemQuery, setItemQuery] = useState("");
  const [highlightedItemIndex, setHighlightedItemIndex] = useState(0);
  const itemInputRef = useRef<HTMLInputElement>(null);
  const itemListRef = useRef<HTMLUListElement>(null);

  // Get modules from active tab
  const modules = useMemo(() => {
    const activeTab = tabs.find((t) => t.id === activeTabId);
    return activeTab?.modules || [];
  }, [tabs, activeTabId]);

  const module = modules.find((m) => m.id === moduleId);
  const statModifiers = module?.moduleType === "pokemon" ? module.statModifiers : undefined;

  const calculatedStats = useMemo(() => {
    if (!statModifiers) return null;
    const nature = getNatureByName(statModifiers.nature) || NATURES[0];
    return calculateStats(stats, statModifiers, nature);
  }, [stats, statModifiers]);

  const evTotal = statModifiers ? getEvTotal(statModifiers.evs) : 0;
  const selectedNature = statModifiers ? NATURES.find((n) => n.name === statModifiers.nature) : null;

  // Filter moves for current generation and search query
  // Also filters out moves already selected in other slots (duplicate prevention)
  const filteredMoves = useMemo(() => {
    if (!learnset) return [];

    // Get currently selected moves (excluding the slot being edited)
    const selectedMoves = new Set(
      (statModifiers?.moves || [])
        .filter((m, idx) => m && idx !== searchingMoveSlot)
    );

    const lowerQuery = moveQuery.toLowerCase().trim();
    const seen = new Set<string>();
    const filtered = learnset
      .filter((entry) => entry.generation === globalGeneration)
      .filter((entry) => {
        // Deduplicate moves (same move can be learned via different methods)
        if (seen.has(entry.move.name)) return false;
        seen.add(entry.move.name);
        // Filter out already selected moves
        if (selectedMoves.has(entry.move.name)) return false;
        // Filter by query if provided
        if (lowerQuery && !entry.move.name.toLowerCase().includes(lowerQuery)) return false;
        return true;
      })
      .map((entry) => entry.move);

    // Sort by power descending (like damage calc), then by name
    return filtered.sort((a, b) => {
      const powerA = a.power || 0;
      const powerB = b.power || 0;
      if (powerB !== powerA) return powerB - powerA;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [learnset, moveQuery, globalGeneration, statModifiers?.moves, searchingMoveSlot]);

  // Handle move selection
  const handleMoveSelect = (slotIndex: number, moveName: string) => {
    setModuleMove(moduleId, slotIndex, moveName);
    setSearchingMoveSlot(null);
    setMoveQuery("");
    setHighlightedMoveIndex(0);
  };

  // Handle move keyboard navigation
  const handleMoveKeyDown = (e: React.KeyboardEvent, slotIndex: number) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedMoveIndex((i) => Math.min(i + 1, filteredMoves.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedMoveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredMoves[highlightedMoveIndex]) {
          handleMoveSelect(slotIndex, filteredMoves[highlightedMoveIndex].name);
        }
        break;
      case "Escape":
        setSearchingMoveSlot(null);
        setMoveQuery("");
        break;
    }
  };

  // Reset highlighted index when query changes
  useEffect(() => {
    setHighlightedMoveIndex(0);
  }, [moveQuery]);

  // Scroll to highlighted move
  useEffect(() => {
    if (moveListRef.current && filteredMoves.length > 0) {
      const item = moveListRef.current.children[highlightedMoveIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedMoveIndex, filteredMoves.length]);

  // Focus input when searching
  useEffect(() => {
    if (searchingMoveSlot !== null && moveInputRef.current) {
      moveInputRef.current.focus();
    }
  }, [searchingMoveSlot]);

  // Filter items for search query
  const filteredItems = useMemo(() => {
    return filterItems(itemQuery);
  }, [itemQuery]);

  // Handle item selection
  const handleItemSelect = (itemName: string) => {
    setItem(moduleId, itemName);
    setIsSearchingItem(false);
    setItemQuery("");
    setHighlightedItemIndex(0);
  };

  // Handle item keyboard navigation
  const handleItemKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedItemIndex((i) => Math.min(i + 1, filteredItems.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedItemIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredItems[highlightedItemIndex]) {
          handleItemSelect(filteredItems[highlightedItemIndex]);
        } else if (itemQuery.trim()) {
          // Allow custom item names
          handleItemSelect(itemQuery.trim());
        }
        break;
      case "Escape":
        setIsSearchingItem(false);
        setItemQuery("");
        break;
    }
  };

  // Reset highlighted index when item query changes
  useEffect(() => {
    setHighlightedItemIndex(0);
  }, [itemQuery]);

  // Scroll to highlighted item
  useEffect(() => {
    if (itemListRef.current && filteredItems.length > 0) {
      const item = itemListRef.current.children[highlightedItemIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedItemIndex, filteredItems.length]);

  // Focus item input when searching
  useEffect(() => {
    if (isSearchingItem && itemInputRef.current) {
      itemInputRef.current.focus();
    }
  }, [isSearchingItem]);

  // Check if current Pokemon is a Mega (for locking item)
  const isCurrentMega = isMegaPokemon(pokemonName ?? null);
  const megaStone = pokemonName ? getMegaStone(pokemonName) : null;

  // Auto-set Mega Stone when a Mega Pokemon is selected
  useEffect(() => {
    if (isCurrentMega && megaStone && statModifiers?.item !== megaStone) {
      setItem(moduleId, megaStone);
    }
  }, [isCurrentMega, megaStone, moduleId, setItem, statModifiers?.item]);

  // Auto-set first ability when Pokemon changes and no ability is selected
  const hasSingleAbility = abilities && abilities.length === 1;
  useEffect(() => {
    if (abilities && abilities.length > 0 && !statModifiers?.ability) {
      setAbility(moduleId, abilities[0].name);
    }
  }, [abilities, moduleId, setAbility, statModifiers?.ability]);

  if (!statModifiers || !calculatedStats) return null;

  const calculatedTotal =
    calculatedStats.hp +
    calculatedStats.attack +
    calculatedStats.defense +
    calculatedStats.specialAttack +
    calculatedStats.specialDefense +
    calculatedStats.speed;

  return (
    <div className="space-y-3">
      {/* Header Row */}
      <div className="grid grid-cols-[56px_36px_1fr_44px_36px_40px] gap-1 text-[10px] text-slate-500 uppercase tracking-wider">
        <span></span>
        <span className="text-right">Base</span>
        <span></span>
        <span className="text-right">Calc</span>
        <span className="text-center">IV</span>
        <span className="text-center">EV</span>
      </div>

      {/* Stats Rows */}
      <div className="space-y-1.5">
        {STAT_CONFIG.map(({ key, label, color, baseMax }) => {
          const baseValue = stats[key];
          const calcValue = calculatedStats[key];
          const percentage = Math.min((baseValue / baseMax) * 100, 100);
          const natureEffect = selectedNature?.increasedStat === key
            ? "increased"
            : selectedNature?.decreasedStat === key
              ? "decreased"
              : null;

          return (
            <div
              key={key}
              className="grid grid-cols-[56px_36px_1fr_44px_36px_40px] gap-1 items-center"
            >
              <span className={`text-xs text-right ${
                natureEffect === "increased" ? "text-green-400" :
                natureEffect === "decreased" ? "text-red-400" : "text-slate-300"
              }`}>
                {label}
              </span>
              <span className="text-right text-white font-mono text-xs">
                {baseValue}
              </span>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${color} transition-all duration-300`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className={`text-right font-mono text-xs ${
                natureEffect === "increased" ? "text-green-400" :
                natureEffect === "decreased" ? "text-red-400" : "text-white"
              }`}>
                {calcValue}
              </span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={statModifiers.ivs[key]}
                onChange={(e) => setIv(moduleId, key, Math.max(0, Math.min(31, parseInputValue(e.target.value))))}
                className="w-9 bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-[11px] text-white text-center focus:outline-none focus:border-blue-500"
              />
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={statModifiers.evs[key]}
                onChange={(e) => setEv(moduleId, key, Math.max(0, Math.min(252, parseInputValue(e.target.value))))}
                className="w-10 bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-[11px] text-white text-center focus:outline-none focus:border-blue-500"
              />
            </div>
          );
        })}
      </div>

      {/* Totals Row */}
      <div className="grid grid-cols-[56px_36px_1fr_44px_36px_40px] gap-1 items-center pt-1 border-t border-slate-700">
        <span className="text-xs text-right font-semibold text-slate-300">Total</span>
        <span className="text-right text-white font-mono text-xs font-bold">
          {stats.total}
        </span>
        <span></span>
        <span className="text-right text-white font-mono text-xs font-bold">
          {calculatedTotal}
        </span>
        <span></span>
        <span className={`text-[10px] text-center ${
          evTotal > 510 ? "text-red-400" : evTotal === 510 ? "text-green-400" : "text-slate-400"
        }`}>
          {evTotal}
        </span>
      </div>

      {/* Level and Nature Controls */}
      <div className="flex items-center gap-3 pt-2 border-t border-slate-700">
        <div className="flex items-center gap-1.5">
          <label className="text-[10px] text-slate-400">Lv</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={statModifiers.level}
            onChange={(e) => setLevel(moduleId, Math.max(1, Math.min(100, parseInputValue(e.target.value) || 1)))}
            className="w-12 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white text-center focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-1">
          <label className="text-[10px] text-slate-400">Nature</label>
          <select
            value={statModifiers.nature}
            onChange={(e) => setNature(moduleId, e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            {NATURES.map((nature) => (
              <option key={nature.name} value={nature.name}>
                {nature.name}
                {nature.increasedStat
                  ? ` (+${STAT_DISPLAY_NAMES[nature.increasedStat]}, -${STAT_DISPLAY_NAMES[nature.decreasedStat!]})`
                  : " (Neutral)"}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px]">
        <div className="flex items-center gap-1">
          <span className="text-slate-500">IVs:</span>
          <button
            onClick={() => setAllIvs(moduleId, 31)}
            className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
          >
            31
          </button>
          <button
            onClick={() => setAllIvs(moduleId, 15)}
            className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
          >
            15
          </button>
          <button
            onClick={() => setAllIvs(moduleId, 0)}
            className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
          >
            0
          </button>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-slate-500">EVs:</span>
          {EV_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => setAllEvs(moduleId, preset.evs)}
              className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
            >
              {preset.label}
            </button>
          ))}
          <button
            onClick={() => setAllEvs(moduleId, { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 })}
            className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Ability and Item Row */}
      <div className="flex items-center gap-3 pt-2 border-t border-slate-700">
        {abilities && abilities.length > 0 && (
          <div className="flex items-center gap-1.5 flex-1">
            <label className="text-[10px] text-slate-400">Ability</label>
            {hasSingleAbility ? (
              // Single ability: show as locked text
              <div className="flex-1 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-300 cursor-default">
                {formatPokemonName(abilities[0].name)}
              </div>
            ) : (
              <select
                value={statModifiers.ability || ""}
                onChange={(e) => setAbility(moduleId, e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {abilities.map((ability) => (
                  <option key={ability.name} value={ability.name}>
                    {formatPokemonName(ability.name)}{ability.isHidden ? " (H)" : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
        <div className="flex items-center gap-1.5 flex-1 relative">
          <label className="text-[10px] text-slate-400">Item</label>
          {isCurrentMega ? (
            // Mega Pokemon: show locked item
            <div
              className="flex-1 flex items-center justify-between px-1.5 py-0.5 rounded text-xs bg-slate-800 border border-amber-600/50 text-amber-400 cursor-not-allowed"
              title="Mega Pokemon require their Mega Stone"
            >
              <div className="flex items-center gap-1 min-w-0">
                {statModifiers.item && <ItemIcon item={statModifiers.item} size={16} />}
                <span className="truncate">{statModifiers.item}</span>
              </div>
              <svg className="w-3 h-3 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          ) : isSearchingItem ? (
            <div className="flex-1 relative">
              <input
                ref={itemInputRef}
                type="text"
                value={itemQuery}
                onChange={(e) => setItemQuery(e.target.value)}
                onBlur={() => setTimeout(() => {
                  setIsSearchingItem(false);
                  setItemQuery("");
                }, 200)}
                onKeyDown={handleItemKeyDown}
                placeholder="Search item..."
                className="w-full bg-slate-800 border border-blue-500 rounded px-1.5 py-0.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                autoFocus
              />
              {filteredItems.length > 0 && (
                <ul
                  ref={itemListRef}
                  className="absolute z-50 w-full bottom-full mb-1 bg-slate-800 border border-slate-700 rounded shadow-xl max-h-40 overflow-auto"
                >
                  {filteredItems.map((item, index) => (
                    <li
                      key={item}
                      onMouseEnter={() => setHighlightedItemIndex(index)}
                      onClick={() => handleItemSelect(item)}
                      className={`flex items-center gap-1.5 px-2 py-1 text-xs cursor-pointer ${
                        index === highlightedItemIndex ? "bg-slate-700" : "hover:bg-slate-700/50"
                      }`}
                    >
                      <ItemIcon item={item} size={16} />
                      <span className="text-white">{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <button
              onClick={() => setIsSearchingItem(true)}
              className="flex-1 flex items-center gap-1.5 text-left bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white hover:bg-slate-700 transition-colors"
            >
              {statModifiers.item ? (
                <>
                  <ItemIcon item={statModifiers.item} size={16} />
                  <span className="truncate">{statModifiers.item}</span>
                </>
              ) : (
                <span className="text-slate-500">None</span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Moves Grid (2x2) */}
      {pokemonName && (
        <div className="pt-2 border-t border-slate-700">
          <label className="text-[10px] text-slate-400 mb-1.5 block">Moves</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 relative">
            {[0, 1, 2, 3].map((slotIndex) => {
              const moveName = statModifiers.moves?.[slotIndex] ?? null;
              const isSearching = searchingMoveSlot === slotIndex;
              // Left column (0, 2) aligns left, right column (1, 3) aligns right
              const isLeftColumn = slotIndex % 2 === 0;

              return (
                <div key={slotIndex} className="relative">
                  {isSearching ? (
                    <div className="relative">
                      <input
                        ref={moveInputRef}
                        type="text"
                        value={moveQuery}
                        onChange={(e) => setMoveQuery(e.target.value)}
                        onBlur={() => setTimeout(() => {
                          setSearchingMoveSlot(null);
                          setMoveQuery("");
                        }, 200)}
                        onKeyDown={(e) => handleMoveKeyDown(e, slotIndex)}
                        placeholder="Search move..."
                        className="w-full bg-slate-800 border border-blue-500 rounded px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none"
                        autoFocus
                      />
                      {filteredMoves.length > 0 && (
                        <ul
                          ref={moveListRef}
                          className={`absolute z-50 bottom-full mb-1 bg-slate-800 border border-slate-700 rounded shadow-xl max-h-[320px] overflow-auto w-[320px] max-w-[calc(100vw-1rem)] left-0 ${!isLeftColumn ? "sm:left-auto sm:right-0" : ""}`}
                        >
                          {/* Header row */}
                          <li className="flex items-center gap-1 px-2 py-1.5 text-[9px] text-slate-500 border-b border-slate-700 bg-slate-800/95 sticky top-0">
                            <span className="w-[115px] flex-shrink-0">Move</span>
                            <span className="w-[52px] text-center flex-shrink-0">Type</span>
                            <span className="w-5 text-center flex-shrink-0">Cat</span>
                            <span className="flex-1 text-right">Pwr</span>
                            <span className="w-6 text-right flex-shrink-0">Acc</span>
                            <span className="w-5 text-right flex-shrink-0">PP</span>
                          </li>
                          {filteredMoves.map((move, index) => (
                            <li
                              key={move.name}
                              onMouseEnter={() => setHighlightedMoveIndex(index)}
                              onClick={() => handleMoveSelect(slotIndex, move.name)}
                              className={`px-2 py-1.5 cursor-pointer ${
                                index === highlightedMoveIndex ? "bg-slate-700" : "hover:bg-slate-700/50"
                              }`}
                            >
                              {/* Main stats row */}
                              <div className="flex items-center gap-1 text-[11px]">
                                <span className="w-[115px] text-white flex-shrink-0">{formatPokemonName(move.name)}</span>
                                <span className="w-[52px] flex justify-center flex-shrink-0">
                                  <TypeBadge type={move.type} size="xs" fixedWidth />
                                </span>
                                <span className="w-5 flex justify-center flex-shrink-0">
                                  <DamageClassIcon damageClass={move.damageClass} />
                                </span>
                                <span className="flex-1 text-right text-slate-300 font-mono text-[10px]">
                                  {move.power ?? "-"}
                                </span>
                                <span className="w-6 text-right text-slate-300 font-mono text-[10px] flex-shrink-0">
                                  {move.accuracy ?? "-"}
                                </span>
                                <span className="w-5 text-right text-slate-400 font-mono text-[10px] flex-shrink-0">
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
                  ) : moveName ? (
                    (() => {
                      const moveEntry = learnset?.find((e) => e.move.name === moveName);
                      const moveData = moveEntry?.move;
                      return (
                        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-[11px]">
                          <span
                            className="flex-1 text-white truncate cursor-pointer hover:text-blue-400"
                            onClick={() => setSearchingMoveSlot(slotIndex)}
                          >
                            {moveData?.displayName || formatPokemonName(moveName)}
                          </span>
                          <button
                            onClick={() => setModuleMove(moduleId, slotIndex, null)}
                            className="p-0.5 text-slate-500 hover:text-red-400 rounded flex-shrink-0"
                            title="Remove move"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      );
                    })()
                  ) : (
                    <button
                      onClick={() => setSearchingMoveSlot(slotIndex)}
                      className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] text-slate-500 hover:text-slate-300 hover:bg-slate-700 rounded border border-dashed border-slate-600 hover:border-slate-500 transition-colors"
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
      )}
    </div>
  );
}
