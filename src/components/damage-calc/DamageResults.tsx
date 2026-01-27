"use client";

import { DamageCalcResult } from "@/hooks/useDamageCalc";

interface Props {
  result: DamageCalcResult | null;
}

function getKoColor(koChance: DamageCalcResult["koChance"]): string {
  if (!koChance) return "text-slate-400";

  if (koChance.n === 1) {
    // OHKO
    if (koChance.chance >= 100) return "text-red-400";
    if (koChance.chance >= 50) return "text-orange-400";
    return "text-yellow-400";
  }

  if (koChance.n === 2) {
    // 2HKO
    if (koChance.chance >= 100) return "text-orange-400";
    return "text-yellow-400";
  }

  // 3HKO+
  return "text-green-400";
}

function getKoBgColor(koChance: DamageCalcResult["koChance"]): string {
  if (!koChance) return "bg-slate-700";

  if (koChance.n === 1) {
    if (koChance.chance >= 100) return "bg-red-900/50";
    if (koChance.chance >= 50) return "bg-orange-900/50";
    return "bg-yellow-900/50";
  }

  if (koChance.n === 2) {
    if (koChance.chance >= 100) return "bg-orange-900/50";
    return "bg-yellow-900/50";
  }

  return "bg-green-900/50";
}

export function DamageResults({ result }: Props) {
  if (!result) {
    return (
      <div className="bg-slate-800 rounded-lg p-4">
        <div className="text-center text-slate-500 py-4">
          <svg
            className="w-10 h-10 mx-auto mb-2 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <p className="text-sm">
            Select Pokemon and move to calculate damage
          </p>
        </div>
      </div>
    );
  }

  const koColor = getKoColor(result.koChance);
  const koBgColor = getKoBgColor(result.koChance);

  return (
    <div className="bg-slate-800 rounded-lg overflow-hidden">
      {/* KO Chance Banner */}
      {result.koChance && (
        <div className={`px-4 py-2 ${koBgColor} border-b border-slate-700`}>
          <span className={`text-sm font-bold ${koColor}`}>
            {result.koChance.text}
          </span>
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Damage Percentage - Main Display */}
        <div className="text-center">
          <div className="text-3xl font-bold text-white">
            {result.minPercent.toFixed(1)}% - {result.maxPercent.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {result.minDamage} - {result.maxDamage} / {result.defenderMaxHp} HP
          </div>
        </div>

        {/* HP Bar Visualization */}
        <div className="relative">
          <div className="h-4 bg-slate-700 rounded overflow-hidden">
            {/* Remaining HP after max damage (green) */}
            {result.maxPercent < 100 && (
              <div
                className="absolute inset-y-0 left-0 bg-green-500 transition-all"
                style={{ width: `${100 - result.maxPercent}%` }}
              />
            )}
            {/* Damage range (gradient from min to max) */}
            <div
              className="absolute inset-y-0 bg-gradient-to-r from-yellow-500 to-red-500 transition-all"
              style={{
                left: `${Math.max(0, 100 - result.maxPercent)}%`,
                width: `${Math.min(result.maxPercent - result.minPercent, result.maxPercent)}%`,
              }}
            />
            {/* Guaranteed damage (orange/red) */}
            <div
              className="absolute inset-y-0 right-0 bg-red-600 transition-all"
              style={{ width: `${Math.min(result.minPercent, 100)}%` }}
            />
          </div>
          {/* HP markers */}
          <div className="flex justify-between text-[9px] text-slate-500 mt-0.5">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Full Description */}
        <div className="pt-2 border-t border-slate-700">
          <p className="text-[11px] text-slate-300 leading-relaxed break-words">
            {result.fullDesc}
          </p>
        </div>
      </div>
    </div>
  );
}
