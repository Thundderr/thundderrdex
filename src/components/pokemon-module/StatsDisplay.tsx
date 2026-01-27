"use client";

import { useMemo } from "react";
import { PokemonStats } from "@/types/pokemon";
import { useModuleStore } from "@/stores/moduleStore";
import { calculateStats, getEvTotal, StatValues } from "@/lib/utils/statCalculator";
import { getNatureByName, NATURES, STAT_DISPLAY_NAMES } from "@/data/natures";

interface Props {
  stats: PokemonStats;
  moduleId: string;
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

export function StatsDisplay({ stats, moduleId }: Props) {
  const { tabs, activeTabId, setLevel, setIv, setEv, setNature, setAllIvs, setAllEvs } = useModuleStore();

  // Get modules from active tab
  const modules = useMemo(() => {
    const activeTab = tabs.find((t) => t.id === activeTabId);
    return activeTab?.modules || [];
  }, [tabs, activeTabId]);

  const module = modules.find((m) => m.id === moduleId);
  const statModifiers = module?.statModifiers;

  const calculatedStats = useMemo(() => {
    if (!statModifiers) return null;
    const nature = getNatureByName(statModifiers.nature) || NATURES[0];
    return calculateStats(stats, statModifiers, nature);
  }, [stats, statModifiers]);

  const evTotal = statModifiers ? getEvTotal(statModifiers.evs) : 0;
  const selectedNature = statModifiers ? NATURES.find((n) => n.name === statModifiers.nature) : null;

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
                type="number"
                min={0}
                max={31}
                value={statModifiers.ivs[key]}
                onChange={(e) => setIv(moduleId, key, parseInt(e.target.value) || 0)}
                className="w-9 bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-[11px] text-white text-center focus:outline-none focus:border-blue-500"
              />
              <input
                type="number"
                min={0}
                max={252}
                value={statModifiers.evs[key]}
                onChange={(e) => setEv(moduleId, key, parseInt(e.target.value) || 0)}
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
        <div className="flex items-center justify-end pr-1">
          <span className={`text-[10px] ${
            evTotal > 510 ? "text-red-400" : evTotal === 510 ? "text-green-400" : "text-slate-400"
          }`}>
            EVs: {evTotal}/510
          </span>
        </div>
        <span className="text-right text-white font-mono text-xs font-bold">
          {calculatedTotal}
        </span>
        <span></span>
        <span></span>
      </div>

      {/* Level and Nature Controls */}
      <div className="flex items-center gap-3 pt-2 border-t border-slate-700">
        <div className="flex items-center gap-1.5">
          <label className="text-[10px] text-slate-400">Lv</label>
          <input
            type="number"
            min={1}
            max={100}
            value={statModifiers.level}
            onChange={(e) => setLevel(moduleId, parseInt(e.target.value) || 1)}
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
    </div>
  );
}
