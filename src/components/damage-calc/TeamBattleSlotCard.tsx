"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import { usePokemonList } from "@/hooks/usePokemonList";
import { usePokemon } from "@/hooks/usePokemon";
import { useLearnset } from "@/hooks/useLearnset";
import { useSmogonSets, SmogonSet } from "@/hooks/useSmogonSets";
import { useGenerationStore } from "@/stores/generationStore";
import { useModuleStore } from "@/stores/moduleStore";
import { DamageCalcPokemonConfig, DamageCalcStatus, TeamBattleSlot } from "@/types/module";
import { StatValues, calculateStats } from "@/lib/utils/statCalculator";
import { NATURES, getNatureByName, StatKey } from "@/data/natures";
import { TYPE_COLORS } from "@/data/typeChart";
import { getTypesForGeneration } from "@/lib/pokeapi/transformers";
import { TypeBadge } from "@/components/type-chart/TypeBadge";
import {
  getItemsForGeneration,
  getCommonItemsForGeneration,
  isMegaPokemon,
  getMegaStone,
} from "@/lib/utils/generationConfig";
import { getPokemonGenerationRange } from "@/lib/utils/pokemonGeneration";
import { Move } from "@/types/moves";
import { genderState } from "@/lib/pokemon/gender";
import { GenderToggle } from "@/components/pokemon-module/GenderToggle";

// ─── Item icon ──────────────────────────────────────────────────────

function ItemIcon({ item, size = 16 }: { item: string; size?: number }) {
  const itemId = item.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${itemId}.png`;
  return (
    <img src={spriteUrl} alt={item} width={size} height={size}
      className="pixelated flex-shrink-0" style={{ imageRendering: "pixelated" }}
      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
  );
}

// ─── Numeric input with clean backspace/zero behavior ───────────────

function NumericInput({
  value, onChange, min = 0, max, className,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(String(value));
  const ref = useRef<HTMLInputElement>(null);

  // Sync display when value changes externally
  useEffect(() => {
    if (document.activeElement !== ref.current) {
      setDisplay(String(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    if (raw === "") {
      setDisplay("0");
      onChange(min);
      return;
    }
    // Strip leading zeros: "01" → "1"
    const stripped = raw.replace(/^0+/, "") || "0";
    const num = Math.max(min, Math.min(max, parseInt(stripped, 10)));
    setDisplay(String(num));
    onChange(num);
  };

  const handleBlur = () => {
    const num = Math.max(min, Math.min(max, parseInt(display, 10) || min));
    setDisplay(String(num));
    onChange(num);
  };

  return (
    <input ref={ref} type="text" inputMode="numeric" value={display}
      onChange={handleChange} onBlur={handleBlur}
      className={className} />
  );
}

// ─── Constants ───────────────────────────────────────────────────────

const DEFAULT_CONFIG: DamageCalcPokemonConfig = {
  pokemonName: null,
  level: 100,
  nature: "Hardy",
  ability: null,
  item: null,
  ivs: { hp: 31, attack: 31, defense: 31, specialAttack: 31, specialDefense: 31, speed: 31 },
  evs: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
  boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  status: "Healthy",
  currentHpPercent: 100,
  teraType: null,
  moves: [null, null, null, null],
  useZMove: false,
  isDynamaxed: false,
  useGigantamax: false,
  dynamaxLevel: 10,
};

const STATUS_OPTIONS: DamageCalcStatus[] = [
  "Healthy", "Burned", "Paralyzed", "Poisoned", "Badly Poisoned", "Asleep", "Frozen",
];

const STAT_ABBR: Record<StatKey, string> = {
  attack: "Atk",
  defense: "Def",
  specialAttack: "SpA",
  specialDefense: "SpD",
  speed: "Spe",
};

const EV_STATS: { key: keyof StatValues; label: string }[] = [
  { key: "hp", label: "HP" },
  { key: "attack", label: "Atk" },
  { key: "defense", label: "Def" },
  { key: "specialAttack", label: "SpA" },
  { key: "specialDefense", label: "SpD" },
  { key: "speed", label: "Spe" },
];

const SHOWDOWN_STAT_MAP: Record<keyof StatValues, string> = {
  hp: "HP", attack: "Atk", defense: "Def",
  specialAttack: "SpA", specialDefense: "SpD", speed: "Spe",
};

const SHOWDOWN_STAT_REVERSE: Record<string, keyof StatValues> = {
  hp: "hp", atk: "attack", def: "defense",
  spa: "specialAttack", spd: "specialDefense", spe: "speed",
};

const STAT_TO_BOOST: Record<keyof StatValues, string | null> = {
  hp: null, attack: "atk", defense: "def",
  specialAttack: "spa", specialDefense: "spd", speed: "spe",
};

const BOOST_OPTIONS = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];

// ─── Component ───────────────────────────────────────────────────────

interface Props {
  moduleId: string;
  side: "attacker" | "defender";
  slotIndex: number;
  slot: TeamBattleSlot | null;
  isActive: boolean;
  isAttackerSide: boolean;
  onSelect: () => void;
}

export function TeamBattleSlotCard({
  moduleId, side, slotIndex, slot, isActive, isAttackerSide, onSelect,
}: Props) {
  const { updateTeamBattleSlotConfig, setTeamBattleSlot, clearTeamBattleSlot, setDamageCalcMove } =
    useModuleStore();
  const { globalGeneration, setGeneration } = useGenerationStore();
  const { data: pokemonList } = usePokemonList();
  const { data: pokemon } = usePokemon(slot?.config.pokemonName ?? null);
  const { data: learnset } = useLearnset(slot?.config.pokemonName ?? null);
  const { data: smogonSets } = useSmogonSets(slot?.config.pokemonName ?? null);

  const config = slot?.config ?? DEFAULT_CONFIG;
  const types = pokemon ? getTypesForGeneration(pokemon, globalGeneration) : [];
  const gender = config.pokemonName ? genderState(config.pokemonName, pokemon) : null;

  // ── Dropdown state (one at a time) ──
  type DropdownType = null | "pokemon" | "item" | "loadSet" | { type: "move"; slot: number };
  const [activeDropdown, setActiveDropdown] = useState<DropdownType>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // ── Import/Export modal ──
  const [showImportExport, setShowImportExport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  // ── Config change handler (dual-write via store) ──
  const handleConfigChange = useCallback(
    (updates: Partial<DamageCalcPokemonConfig>) => {
      if (slot) {
        updateTeamBattleSlotConfig(moduleId, side, slotIndex, updates);
      } else {
        setTeamBattleSlot(moduleId, side, slotIndex, { ...DEFAULT_CONFIG, ...updates });
      }
    },
    [moduleId, side, slotIndex, slot, updateTeamBattleSlotConfig, setTeamBattleSlot]
  );

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearTeamBattleSlot(moduleId, side, slotIndex);
  };

  // ── Abilities ──
  const abilities = useMemo(() => pokemon?.abilities.map(a => a.displayName) ?? [], [pokemon]);

  useEffect(() => {
    if (pokemon && !config.ability && abilities.length > 0) {
      handleConfigChange({ ability: abilities[0] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pokemon, abilities]);

  useEffect(() => {
    if (config.pokemonName) {
      const megaStone = getMegaStone(config.pokemonName);
      if (megaStone && config.item !== megaStone) handleConfigChange({ item: megaStone });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.pokemonName]);

  const isCurrentMega = isMegaPokemon(config.pokemonName);

  // ── Pokemon search ──
  const filteredPokemon = useMemo(() => {
    if (activeDropdown !== "pokemon" || !searchQuery || !pokemonList) return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    return pokemonList
      .filter(p => p.name.includes(q) || p.displayName.toLowerCase().includes(q) || p.id.toString() === q)
      .slice(0, 8)
      .sort((a, b) => {
        const aS = a.name.startsWith(q), bS = b.name.startsWith(q);
        if (aS && !bS) return -1;
        if (!aS && bS) return 1;
        return a.id - b.id;
      });
  }, [activeDropdown, searchQuery, pokemonList]);

  // ── Item search ──
  const allItems = useMemo(() => getItemsForGeneration(globalGeneration), [globalGeneration]);
  const commonItems = useMemo(() => getCommonItemsForGeneration(globalGeneration), [globalGeneration]);
  const filteredItems = useMemo(() => {
    if (activeDropdown !== "item") return [];
    if (!searchQuery.trim()) return commonItems;
    const q = searchQuery.toLowerCase().trim();
    return allItems.filter(i => i.toLowerCase().includes(q)).slice(0, 12);
  }, [activeDropdown, searchQuery, allItems, commonItems]);

  // ── Move search ──
  const availableMoves = useMemo(() => {
    if (!learnset) return [];
    const seen = new Set<string>();
    const moves: Move[] = [];
    for (const entry of learnset) {
      if (entry.generation > globalGeneration) continue;
      if (seen.has(entry.move.name)) continue;
      if (entry.move.power === null || entry.move.power === 0) continue;
      seen.add(entry.move.name);
      moves.push(entry.move);
    }
    return moves.sort((a, b) => (b.power || 0) - (a.power || 0) || a.displayName.localeCompare(b.displayName));
  }, [learnset, globalGeneration]);

  const editingMoveSlot = activeDropdown && typeof activeDropdown === "object" && activeDropdown.type === "move"
    ? activeDropdown.slot : null;

  const filteredMoves = useMemo(() => {
    if (editingMoveSlot === null) return [];
    const selected = new Set((config.moves || []).filter((m, i) => m && i !== editingMoveSlot));
    const nonDup = availableMoves.filter(m => !selected.has(m.name));
    if (!searchQuery.trim()) return nonDup.slice(0, 15);
    const q = searchQuery.toLowerCase().trim();
    return nonDup.filter(m => m.displayName.toLowerCase().includes(q) || m.type.toLowerCase().includes(q)).slice(0, 15);
  }, [editingMoveSlot, availableMoves, config.moves, searchQuery]);

  // ── Keyboard nav list length ──
  const currentListLength = activeDropdown === "pokemon" ? filteredPokemon.length
    : activeDropdown === "item" ? filteredItems.length
    : editingMoveSlot !== null ? filteredMoves.length : 0;

  // ── Dropdown helpers ──
  const openDropdown = (type: DropdownType) => {
    setActiveDropdown(type);
    setSearchQuery("");
    setHighlightedIndex(0);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const closeDropdown = () => {
    setActiveDropdown(null);
    setSearchQuery("");
    setHighlightedIndex(0);
  };

  useEffect(() => { setHighlightedIndex(0); }, [searchQuery]);

  useEffect(() => {
    if (listRef.current && currentListLength > 0) {
      const el = listRef.current.children[highlightedIndex] as HTMLElement;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex, currentListLength]);

  // ── Keyboard navigation ──
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!activeDropdown) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex(i => Math.min(i + 1, currentListLength - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex(i => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (activeDropdown === "pokemon" && filteredPokemon[highlightedIndex]) {
          const p = filteredPokemon[highlightedIndex];
          const { minGen, maxGen } = getPokemonGenerationRange(p.name, p.id);
          const existsInGen = globalGeneration >= minGen && (maxGen === null || globalGeneration <= maxGen);
          if (!existsInGen) break;
          handleConfigChange({ pokemonName: p.name, ability: null, item: null });
          closeDropdown();
        } else if (activeDropdown === "item" && filteredItems[highlightedIndex]) {
          handleConfigChange({ item: filteredItems[highlightedIndex] });
          closeDropdown();
        } else if (editingMoveSlot !== null && filteredMoves[highlightedIndex]) {
          const moveName = filteredMoves[highlightedIndex].name;
          const newMoves = [...(config.moves || [null, null, null, null])];
          newMoves[editingMoveSlot] = moveName;
          handleConfigChange({ moves: newMoves });
          if (isAttackerSide) setDamageCalcMove(moduleId, moveName);
          closeDropdown();
        }
        break;
      case "Escape":
        closeDropdown();
        break;
    }
  };

  // ── EV/IV helpers ──
  const parseInput = (v: string) => parseInt(v.replace(/^0+/, "") || "0", 10) || 0;
  const updateEv = (stat: keyof StatValues, raw: string) => {
    handleConfigChange({ evs: { ...config.evs, [stat]: Math.max(0, Math.min(252, parseInput(raw))) } });
  };
  const updateIv = (stat: keyof StatValues, raw: string) => {
    handleConfigChange({ ivs: { ...config.ivs, [stat]: Math.max(0, Math.min(31, parseInput(raw))) } });
  };
  const evTotal = Object.values(config.evs).reduce((sum, v) => sum + v, 0);

  // ── Calculated stats ──
  const currentNature = useMemo(() => getNatureByName(config.nature) || NATURES[0], [config.nature]);
  const calculatedStats = useMemo(() => {
    if (!pokemon) return null;
    return calculateStats(
      pokemon.stats,
      { level: config.level, ivs: config.ivs, evs: config.evs, nature: config.nature },
      currentNature
    );
  }, [pokemon, config.level, config.ivs, config.evs, config.nature, currentNature]);

  const maxHp = calculatedStats?.hp ?? 0;
  const currentHp = maxHp > 0 ? Math.floor(((config.currentHpPercent ?? 100) / 100) * maxHp) : 0;

  const updateBoost = (boostKey: string, value: number) => {
    handleConfigChange({ boosts: { ...config.boosts, [boostKey]: value } });
  };

  // ── Move data helper ──
  const getMoveData = useCallback(
    (name: string | null): Move | null => {
      if (!name || !learnset) return null;
      return learnset.find(e => e.move.name === name)?.move ?? null;
    },
    [learnset]
  );

  // ── Showdown export ──
  const serializeToShowdown = (): string => {
    if (!pokemon) return "";
    const lines: string[] = [];
    let line1 = pokemon.displayName;
    if (config.item) line1 += ` @ ${config.item}`;
    lines.push(line1);
    if (config.level !== 100) lines.push(`Level: ${config.level}`);
    if (config.ability) lines.push(`Ability: ${config.ability}`);
    lines.push(`${config.nature} Nature`);
    const evParts: string[] = [];
    for (const [key, label] of Object.entries(SHOWDOWN_STAT_MAP)) {
      const v = config.evs[key as keyof StatValues];
      if (v > 0) evParts.push(`${v} ${label}`);
    }
    if (evParts.length > 0) lines.push(`EVs: ${evParts.join(" / ")}`);
    const ivParts: string[] = [];
    for (const [key, label] of Object.entries(SHOWDOWN_STAT_MAP)) {
      const v = config.ivs[key as keyof StatValues];
      if (v < 31) ivParts.push(`${v} ${label}`);
    }
    if (ivParts.length > 0) lines.push(`IVs: ${ivParts.join(" / ")}`);
    for (const move of config.moves || []) {
      if (move) {
        const md = getMoveData(move);
        if (md) lines.push(`- ${md.displayName}`);
      }
    }
    return lines.join("\n");
  };

  // ── Showdown import ──
  const parseShowdown = (text: string): { error: string } | { error?: undefined; config: Partial<DamageCalcPokemonConfig> & { pokemonName: string } } => {
    const normalized = text.replace(/\t/g, " ").replace(/ +/g, " ");
    const lines = normalized.trim().split("\n").map(l => l.trim()).filter(l => l);
    if (lines.length === 0) return { error: "No text to parse" };

    const firstLine = lines[0];
    let pokeName: string;
    let item: string | null = null;

    if (firstLine.includes(" @ ")) {
      const [pp, ip] = firstLine.split(" @ ");
      pokeName = pp.trim();
      item = ip.trim();
    } else {
      pokeName = firstLine.trim();
    }

    const nick = pokeName.match(/^.+\s*\(([^)]+)\)$/);
    if (nick) pokeName = nick[1].trim();

    const normName = pokeName.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    const simpleName = pokeName.toLowerCase().replace(/[^a-z0-9]/g, "");

    const found = pokemonList?.find(p => {
      if (p.name === normName) return true;
      if (p.displayName.toLowerCase() === pokeName.toLowerCase()) return true;
      if (p.displayName.toLowerCase().replace(/[^a-z0-9]/g, "") === simpleName) return true;
      return false;
    });

    if (!found) return { error: `Pokemon "${pokeName}" not found` };

    const { minGen, maxGen } = getPokemonGenerationRange(found.name, found.id);
    const exists = globalGeneration >= minGen && (maxGen === null || globalGeneration <= maxGen);
    if (!exists) return { error: `${found.displayName} not in Gen ${globalGeneration}` };

    let level = 100;
    let ability: string | null = null;
    let nature = "Hardy";
    const evs: StatValues = { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };
    const ivs: StatValues = { hp: 31, attack: 31, defense: 31, specialAttack: 31, specialDefense: 31, speed: 31 };
    const moves: (string | null)[] = [null, null, null, null];
    let mi = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.toLowerCase().startsWith("level:")) { level = Math.max(1, Math.min(100, parseInt(line.split(":")[1]) || 100)); continue; }
      if (line.toLowerCase().startsWith("ability:")) { ability = line.split(":")[1].trim(); continue; }
      if (line.toLowerCase().endsWith("nature")) { nature = line.replace(/\s*nature\s*$/i, "").trim(); continue; }
      if (line.toLowerCase().startsWith("evs:")) {
        for (const part of line.substring(4).split("/").map(s => s.trim())) {
          const m = part.match(/^(\d+)\s*(\w+)$/);
          if (m) { const stat = SHOWDOWN_STAT_REVERSE[m[2].toLowerCase()]; if (stat) evs[stat] = Math.min(252, Math.max(0, parseInt(m[1]))); }
        }
        continue;
      }
      if (line.toLowerCase().startsWith("ivs:")) {
        for (const part of line.substring(4).split("/").map(s => s.trim())) {
          const m = part.match(/^(\d+)\s*(\w+)$/);
          if (m) { const stat = SHOWDOWN_STAT_REVERSE[m[2].toLowerCase()]; if (stat) ivs[stat] = Math.min(31, Math.max(0, parseInt(m[1]))); }
        }
        continue;
      }
      if (line.startsWith("-") && mi < 4) {
        moves[mi] = line.substring(1).trim().toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
        mi++;
      }
    }

    if (item && !allItems.includes(item)) {
      const matched = allItems.find(i => i.toLowerCase() === item!.toLowerCase());
      item = matched || null;
    }
    const validNature = NATURES.find(n => n.name.toLowerCase() === nature.toLowerCase());
    nature = validNature?.name ?? "Hardy";

    return { config: { pokemonName: found.name, level, ability, item, nature, evs, ivs, moves } };
  };

  const handleImport = () => {
    const result = parseShowdown(importText);
    if ("error" in result && result.error) { setImportError(result.error); return; }
    if ("config" in result) handleConfigChange(result.config);
    setShowImportExport(false);
    setImportText("");
    setImportError(null);
  };

  const handleExport = () => {
    const text = serializeToShowdown();
    if (text) {
      navigator.clipboard.writeText(text);
      setImportText(text);
      setShowImportExport(true);
      setImportError(null);
    }
  };

  // ── Load Smogon set ──
  const applySmogonSet = (set: SmogonSet) => {
    const getFirst = <T,>(val: T | T[] | undefined): T | undefined => Array.isArray(val) ? val[0] : val;
    const mapStats = (s: SmogonSet["evs"], def: number): StatValues => ({
      hp: s?.hp ?? def, attack: s?.atk ?? def, defense: s?.def ?? def,
      specialAttack: s?.spa ?? def, specialDefense: s?.spd ?? def, speed: s?.spe ?? def,
    });
    const normMove = (m: string) => m.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    const moves: (string | null)[] = [null, null, null, null];
    set.moves.slice(0, 4).forEach((m, i) => {
      const name = Array.isArray(m) ? m[0] : m;
      if (name) moves[i] = normMove(name);
    });
    handleConfigChange({
      level: set.level ?? 100,
      ability: getFirst(set.ability) ?? null,
      item: getFirst(set.item) ?? null,
      nature: getFirst(set.nature) ?? "Hardy",
      evs: mapStats(set.evs, 0),
      ivs: mapStats(set.ivs, 31),
      moves,
    });
    closeDropdown();
  };

  // ── JSX ────────────────────────────────────────────────────────────

  return (
    <div
      className={`h-full rounded border transition-colors flex relative ${
        isActive
          ? isAttackerSide ? "border-red-500/50 bg-slate-800/80" : "border-blue-500/50 bg-slate-800/80"
          : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600/50"
      }`}
    >
      {/* ── Slot number strip ── */}
      <div className="w-5 flex-shrink-0 flex flex-col items-center justify-center border-r border-slate-700/30">
        <span className="text-[10px] font-bold text-slate-500">{slotIndex + 1}</span>
        <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
          isActive ? (isAttackerSide ? "bg-red-400" : "bg-blue-400") : "bg-slate-600"
        }`} />
      </div>

      {/* ── Col 1: Pokemon info ── */}
      <div className="flex-1 min-w-[10rem] flex flex-col border-r border-slate-700/30 p-2 gap-1.5">
        {/* Top row: Name | Type(s) | Level */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            {activeDropdown === "pokemon" ? (
              <input ref={inputRef} value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => setTimeout(closeDropdown, 150)}
                placeholder="Search..."
                className="w-full bg-slate-700 text-white text-xs px-2 py-1 rounded outline-none" />
            ) : (
              <button onClick={() => openDropdown("pokemon")}
                className="w-full text-left text-xs px-2 py-1 rounded bg-slate-700/50 hover:bg-slate-700 text-white truncate font-medium">
                {pokemon?.displayName || "Select Pokemon..."}
              </button>
            )}
            {activeDropdown === "pokemon" && filteredPokemon.length > 0 && (
              <ul ref={listRef}
                className="absolute z-50 top-full left-0 w-[220px] max-w-[calc(100vw-1rem)] mt-0.5 bg-slate-800 border border-slate-600 rounded shadow-xl max-h-48 overflow-y-auto">
                {filteredPokemon.map((p, i) => {
                  const { minGen, maxGen } = getPokemonGenerationRange(p.name, p.id);
                  const existsInGen = globalGeneration >= minGen && (maxGen === null || globalGeneration <= maxGen);
                  return (
                    <li key={p.name}
                      onMouseDown={e => {
                        e.preventDefault();
                        if (!existsInGen) return;
                        handleConfigChange({ pokemonName: p.name, ability: null, item: null }); closeDropdown();
                      }}
                      className={`flex items-center gap-2 px-2 py-1 text-xs ${
                        !existsInGen ? "cursor-not-allowed" : "cursor-pointer"
                      } ${i === highlightedIndex ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-700"}`}>
                      <div className="relative flex-shrink-0">
                        <img src={p.spriteUrl} alt="" width={20} height={20}
                          className={`pixelated ${!existsInGen ? "opacity-40 grayscale" : ""}`} />
                        {!existsInGen && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-full h-0.5 bg-red-500 rotate-[-20deg]" />
                          </div>
                        )}
                      </div>
                      <span className={`flex-1 truncate ${!existsInGen ? "text-slate-500 line-through" : ""}`}>
                        {p.displayName}
                      </span>
                      {!existsInGen && (
                        <button
                          onMouseDown={e => { e.preventDefault(); e.stopPropagation(); setGeneration(minGen); }}
                          className="px-1.5 py-0.5 text-[10px] bg-blue-600 hover:bg-blue-500 text-white rounded flex-shrink-0">
                          Gen {minGen}{maxGen ? `-${maxGen}` : ""}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {types.length > 0 && (
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {types.map(t => <TypeBadge key={t.name} type={t.name} size="sm" />)}
            </div>
          )}
          {gender?.kind === "distinct" && (
            <GenderToggle
              showFemale={/-female$/.test(config.pokemonName ?? "")}
              onToggle={(female) =>
                handleConfigChange({ pokemonName: female ? gender.femaleId : gender.maleId })
              }
            />
          )}
        </div>

        {/* Bottom area: Icon (left) | Select/Deselect (middle) | Load Set/Import/Export (right) */}
        <div className="flex-1 flex items-center gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 flex items-center justify-center">
            {pokemon ? (
              <Image src={pokemon.sprites.front_default || ""} alt={pokemon.displayName}
                width={128} height={128} className="pixelated" unoptimized />
            ) : (
              <div className="w-24 h-24 rounded bg-slate-700/30" />
            )}
          </div>

          {/* Level + Select */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="flex items-center gap-0.5">
              <span className="text-[10px] text-slate-500">Lv</span>
              <NumericInput value={config.level} min={1} max={100}
                onChange={v => handleConfigChange({ level: v })}
                className="w-9 bg-slate-700/50 text-white text-[11px] text-center rounded px-0.5 py-0.5 outline-none" />
            </div>
            <button onClick={e => { e.stopPropagation(); onSelect(); }}
              className={`w-16 h-16 flex-shrink-0 flex items-center justify-center text-[11px] font-semibold rounded transition-colors ${
                isActive
                  ? isAttackerSide ? "bg-red-600 text-white" : "bg-blue-600 text-white"
                  : "bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white"
              }`}>
              Select
            </button>
          </div>

          {/* Load Set / Import / Export */}
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <div className="relative">
              <button onClick={() => activeDropdown === "loadSet" ? closeDropdown() : openDropdown("loadSet")}
                disabled={!smogonSets?.length}
                className="w-full px-3 py-1.5 text-[10px] bg-slate-700/60 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 rounded transition-colors text-center">
                Load Set
              </button>
              {activeDropdown === "loadSet" && smogonSets && smogonSets.length > 0 && (
                <ul className="absolute z-50 bottom-full left-0 mb-0.5 w-[220px] max-w-[calc(100vw-1rem)] bg-slate-800 border border-slate-600 rounded shadow-xl max-h-48 overflow-y-auto">
                  {smogonSets.map((set, i) => (
                    <li key={i}
                      onMouseDown={e => { e.preventDefault(); applySmogonSet(set); }}
                      className="px-2 py-1 cursor-pointer text-[10px] text-slate-300 hover:bg-slate-700 truncate">
                      <span className="text-slate-500 mr-1">{set.formatDisplay}</span>
                      {set.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button onClick={() => { setImportText(""); setImportError(null); setShowImportExport(true); }}
              className="px-3 py-1.5 text-[10px] bg-slate-700/60 hover:bg-slate-600 text-slate-400 rounded transition-colors text-center">
              Import
            </button>
            <button onClick={handleExport} disabled={!pokemon}
              className="px-3 py-1.5 text-[10px] bg-slate-700/60 hover:bg-slate-600 disabled:opacity-30 text-slate-400 rounded transition-colors text-center">
              Export
            </button>
          </div>
        </div>
      </div>

      {/* ── Col 2: Stats table (like base damage calc) + HP bar ── */}
      <div className="flex-1 min-w-0 flex flex-col border-r border-slate-700/30 text-[10px]">
        {/* Stat rows — each takes equal vertical space */}
        <div className="flex-1 min-h-0 flex flex-col">
          {EV_STATS.map(({ key, label }) => {
            const boostKey = STAT_TO_BOOST[key];
            const boostValue = boostKey ? config.boosts[boostKey as keyof typeof config.boosts] : 0;
            const baseStat = pokemon?.stats[key] ?? 0;
            const rawStat = calculatedStats ? calculatedStats[key] : 0;
            let calcStat = rawStat;
            if (key !== "hp" && boostValue !== 0) {
              calcStat = boostValue > 0
                ? Math.floor(rawStat * (2 + boostValue) / 2)
                : Math.floor(rawStat * 2 / (2 + Math.abs(boostValue)));
            }
            const isInc = key !== "hp" && currentNature.increasedStat === (key as StatKey);
            const isDec = key !== "hp" && currentNature.decreasedStat === (key as StatKey);

            return (
              <div key={key}
                className="flex-1 min-h-0 grid grid-cols-[28px_32px_40px_40px_40px_44px] items-center border-b border-slate-700/20 px-1">
                <div className={`font-semibold text-[10px] ${isInc ? "text-green-400" : isDec ? "text-red-400" : "text-slate-300"}`}>
                  {label}
                </div>
                <div className="text-center text-slate-500">{baseStat}</div>
                <div className="px-0.5">
                  <NumericInput value={config.ivs[key]} min={0} max={31}
                    onChange={v => handleConfigChange({ ivs: { ...config.ivs, [key]: v } })}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-0.5 text-white text-center text-[10px] focus:outline-none focus:border-blue-500" />
                </div>
                <div className="px-0.5">
                  <NumericInput value={config.evs[key]} min={0} max={252}
                    onChange={v => handleConfigChange({ evs: { ...config.evs, [key]: v } })}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-0.5 text-white text-center text-[10px] focus:outline-none focus:border-blue-500" />
                </div>
                <div className={`text-center font-semibold ${
                  boostValue > 0 ? "text-green-400" : boostValue < 0 ? "text-red-400" : "text-white"
                }`}>
                  {calcStat || "—"}
                </div>
                <div className="px-0.5">
                  {boostKey ? (
                    <select value={boostValue}
                      onChange={e => updateBoost(boostKey, parseInt(e.target.value))}
                      className={`w-full bg-slate-700 border border-slate-600 rounded px-0 text-2xs text-center focus:outline-none focus:border-blue-500 ${
                        boostValue > 0 ? "text-green-400" : boostValue < 0 ? "text-red-400" : "text-slate-500"
                      }`}>
                      {BOOST_OPTIONS.map(b => (
                        <option key={b} value={b}>{b > 0 ? `+${b}` : b === 0 ? "—" : b}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="block text-center text-slate-600">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {/* HP bar — fixed at bottom */}
        <div className="flex-shrink-0 px-1.5 py-0.5 border-t border-slate-700/40">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-semibold text-slate-400 flex-shrink-0">HP</span>
            <NumericInput value={currentHp} min={0} max={maxHp || 999}
              onChange={v => { if (maxHp > 0) handleConfigChange({ currentHpPercent: Math.round((v / maxHp) * 100) }); }}
              className="w-10 bg-slate-700 border border-slate-600 rounded px-0.5 text-[10px] text-white text-center focus:outline-none focus:border-blue-500" />
            <span className="text-[10px] text-slate-500 flex-shrink-0">/{maxHp}</span>
            <span className="text-[10px] text-slate-600 flex-shrink-0">(</span>
            <NumericInput value={config.currentHpPercent} min={0} max={100}
              onChange={v => handleConfigChange({ currentHpPercent: v })}
              className="w-8 bg-slate-700 border border-slate-600 rounded px-0.5 text-[10px] text-white text-center focus:outline-none focus:border-blue-500" />
            <span className="text-[10px] text-slate-600 flex-shrink-0">%)</span>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-slate-700 ml-1">
              <div
                className={`h-full transition-all ${
                  config.currentHpPercent > 50 ? "bg-green-500" :
                  config.currentHpPercent > 25 ? "bg-yellow-500" : "bg-red-500"
                }`}
                style={{ width: `${config.currentHpPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Col 3: Nature, Ability, Item, Status ── */}
      <div className="w-[130px] flex-shrink-0 flex flex-col justify-between p-1.5 gap-1 border-r border-slate-700/30">
        <select value={config.nature} onChange={e => handleConfigChange({ nature: e.target.value })}
          className="bg-slate-700/50 text-[10px] text-white rounded px-1 py-1 outline-none cursor-pointer w-full truncate">
          {NATURES.map(n => {
            const inc = n.increasedStat ? STAT_ABBR[n.increasedStat] : null;
            const dec = n.decreasedStat ? STAT_ABBR[n.decreasedStat] : null;
            return (
              <option key={n.name} value={n.name}>
                {n.name}{inc && dec ? ` (+${inc} -${dec})` : ""}
              </option>
            );
          })}
        </select>

        <select value={config.ability || ""} onChange={e => handleConfigChange({ ability: e.target.value || null })}
          className="bg-slate-700/50 text-[10px] text-white rounded px-1 py-1 outline-none cursor-pointer w-full truncate">
          <option value="">No Ability</option>
          {abilities.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        {/* Item search */}
        <div className="relative">
          {activeDropdown === "item" ? (
            <input ref={inputRef} value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => setTimeout(closeDropdown, 150)}
              placeholder="Item..."
              className="w-full bg-slate-700 text-[10px] text-white px-1 py-1 rounded outline-none" />
          ) : (
            <button onClick={() => !isCurrentMega && openDropdown("item")}
              className={`w-full text-left text-[10px] px-1 py-1 rounded truncate flex items-center gap-1 ${
                isCurrentMega ? "bg-slate-700/30 text-slate-500 cursor-not-allowed" : "bg-slate-700/50 text-white hover:bg-slate-700"
              }`}>
              {config.item && <ItemIcon item={config.item} size={16} />}
              <span className="truncate">{config.item || "No Item"}</span>
            </button>
          )}
          {activeDropdown === "item" && filteredItems.length > 0 && (
            <ul ref={listRef}
              className="absolute z-50 top-full left-0 w-[180px] max-w-[calc(100vw-1rem)] mt-0.5 bg-slate-800 border border-slate-600 rounded shadow-xl max-h-40 overflow-y-auto">
              {filteredItems.map((item, i) => (
                <li key={item}
                  onMouseDown={e => { e.preventDefault(); handleConfigChange({ item }); closeDropdown(); }}
                  className={`flex items-center gap-1.5 px-2 py-1 cursor-pointer text-[10px] ${
                    i === highlightedIndex ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-700"
                  }`}>
                  <ItemIcon item={item} size={16} />
                  <span className="truncate">{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <select value={config.status} onChange={e => handleConfigChange({ status: e.target.value as DamageCalcStatus })}
          className="bg-slate-700/50 text-[10px] text-white rounded px-1 py-1 outline-none cursor-pointer w-full truncate">
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* ── Col 4: Moves ── */}
      <div className="w-[100px] flex-shrink-0 flex flex-col justify-between p-1.5 gap-1 min-w-0">
        {[0, 1, 2, 3].map(moveIdx => {
          const moveName = config.moves?.[moveIdx] ?? null;
          const moveData = getMoveData(moveName);
          const isEditing = editingMoveSlot === moveIdx;

          return (
            <div key={moveIdx} className="relative flex-1 min-h-0 flex items-center">
              {isEditing ? (
                <input ref={inputRef} value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={() => setTimeout(closeDropdown, 150)}
                  placeholder="Move..."
                  className="w-full bg-slate-700 text-[10px] text-white px-1.5 py-0.5 rounded outline-none" />
              ) : (
                <button onClick={() => openDropdown({ type: "move", slot: moveIdx })}
                  className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate ${
                    moveData ? "bg-slate-700/50 text-white hover:bg-slate-700" : "bg-slate-700/30 text-slate-500 hover:bg-slate-700/50"
                  }`}
                  style={moveData ? { borderLeft: `3px solid ${TYPE_COLORS[moveData.type as keyof typeof TYPE_COLORS] || "#475569"}` } : undefined}>
                  {moveData?.displayName || `Move ${moveIdx + 1}`}
                </button>
              )}
              {isEditing && filteredMoves.length > 0 && (
                <ul ref={listRef}
                  className="absolute z-50 top-full right-0 w-[200px] max-w-[calc(100vw-1rem)] mt-0.5 bg-slate-800 border border-slate-600 rounded shadow-xl max-h-40 overflow-y-auto">
                  {filteredMoves.map((move, i) => (
                    <li key={move.name}
                      onMouseDown={e => {
                        e.preventDefault();
                        const newMoves = [...(config.moves || [null, null, null, null])];
                        newMoves[moveIdx] = move.name;
                        handleConfigChange({ moves: newMoves });
                        if (isAttackerSide) setDamageCalcMove(moduleId, move.name);
                        closeDropdown();
                      }}
                      className={`flex items-center gap-1.5 px-2 py-1 cursor-pointer text-[10px] ${
                        i === highlightedIndex ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-700"
                      }`}>
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: TYPE_COLORS[move.type as keyof typeof TYPE_COLORS] || "#475569" }} />
                      <span className="truncate">{move.displayName}</span>
                      <span className="text-2xs text-slate-400 ml-auto flex-shrink-0">{move.power}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Import/Export modal overlay ── */}
      {showImportExport && (
        <div className="absolute inset-0 z-40 bg-slate-900/90 rounded flex flex-col p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-white">Import / Export</span>
            <button onClick={() => setShowImportExport(false)}
              className="text-slate-400 hover:text-white">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <textarea value={importText} onChange={e => { setImportText(e.target.value); setImportError(null); }}
            placeholder="Paste Showdown format here..."
            className="flex-1 bg-slate-800 text-[10px] text-white p-1.5 rounded border border-slate-600 outline-none resize-none font-mono" />
          {importError && <p className="text-2xs text-red-400 mt-0.5">{importError}</p>}
          <div className="flex gap-1 mt-1">
            <button onClick={handleImport}
              className="flex-1 px-2 py-1 text-[10px] bg-blue-600 hover:bg-blue-500 text-white rounded">
              Import
            </button>
            <button onClick={() => { setImportText(serializeToShowdown()); setImportError(null); }}
              disabled={!pokemon}
              className="flex-1 px-2 py-1 text-[10px] bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-300 rounded">
              Export to Box
            </button>
            <button onClick={() => { navigator.clipboard.writeText(importText); }}
              disabled={!importText}
              className="px-2 py-1 text-[10px] bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-300 rounded">
              Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
