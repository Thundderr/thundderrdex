"use client";

import { useState, useRef } from "react";
import { DamageCalcResult } from "@/hooks/useDamageCalc";
import { clampLeftToViewport } from "@/lib/utils/popoverPosition";

interface Props {
  result: DamageCalcResult | null;
}

// Info icon. The breakdown shows on hover (mouse), on focus (keyboard), and when
// tapped/pinned (touch — which has no hover, so the breakdown used to be
// completely unreachable). Copy lives inside the popover as its own button.
function InfoButton({ description, colorClass }: { description: string; colorClass: string }) {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const visible = hovered || focused || pinned;

  const reposition = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) setTooltipPos({ top: rect.bottom + 4, left: clampLeftToViewport(rect.left, 320) });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(description);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = description;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <button
        ref={btnRef}
        aria-label="Show damage breakdown"
        aria-expanded={visible}
        onClick={() => {
          reposition();
          setPinned((p) => !p);
        }}
        onMouseEnter={() => {
          reposition();
          setHovered(true);
        }}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => {
          reposition();
          setFocused(true);
        }}
        onBlur={() => {
          setFocused(false);
          setPinned(false);
        }}
        className="flex items-center justify-center w-5 h-5 opacity-70 hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
      >
        <svg className={`w-3.5 h-3.5 ${colorClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
      {/* Fixed position tooltip that can extend beyond container */}
      {visible && (
        <div
          className="fixed z-50"
          style={{ top: tooltipPos.top, left: tooltipPos.left }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <div className="bg-surface border border-line rounded px-2.5 py-2 shadow-lg w-80 max-w-[calc(100vw-1rem)]">
            <p className="text-2xs text-fg-muted leading-relaxed">{description}</p>
            <button
              onClick={handleCopy}
              className="mt-1.5 pt-1.5 border-t border-line w-full text-left text-2xs text-fg-subtle hover:text-fg focus-visible:outline-none focus-visible:underline"
            >
              {copied ? <span className="text-green-400">Copied!</span> : "Copy details"}
            </button>
          </div>
        </div>
      )}
    </>
  );
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
      <div className="bg-slate-800 rounded-lg p-3 flex flex-col justify-center">
        <div className="text-center text-slate-500 py-2">
          <svg
            className="w-8 h-8 mx-auto mb-1 opacity-50"
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
          <p className="text-xs">
            Select Pokemon and move
          </p>
        </div>
      </div>
    );
  }

  const koColor = getKoColor(result.koChance);
  const koBgColor = getKoBgColor(result.koChance);

  return (
    <div className="bg-slate-800 rounded-lg overflow-hidden flex flex-col">
      {/* KO Chance Banner with Info Button */}
      {result.koChance && (
        <div className={`px-3 py-2 ${koBgColor} border-b border-slate-700 flex items-center justify-between flex-shrink-0`}>
          <span className={`text-sm font-bold ${koColor}`}>
            {result.koChance.text}
          </span>
          <InfoButton description={result.fullDesc} colorClass={koColor} />
        </div>
      )}

      <div className="p-3 flex-1 flex flex-col justify-center gap-3">
        {/* Damage Percentage - Main Display */}
        <div className="text-center">
          <div className="text-4xl font-bold text-white">
            {result.minPercent.toFixed(1)}% - {result.maxPercent.toFixed(1)}%
          </div>
          <div className="text-sm text-slate-400 mt-1">
            {result.minDamage} - {result.maxDamage} / {result.defenderMaxHp} HP
          </div>
        </div>

        {/* HP Bar Visualization - Left to right: Remaining HP → Variable dmg → Guaranteed dmg → Hazards */}
        <div className="relative">
          <div className="h-5 bg-slate-700 rounded overflow-hidden">
            {/* 1. Remaining HP after max damage + hazards (green, leftmost) */}
            {result.maxPercent + result.hazardPercent < 100 && (
              <div
                className="absolute inset-y-0 left-0 bg-green-500 transition-all"
                style={{ width: `${100 - result.maxPercent - result.hazardPercent}%` }}
              />
            )}
            {/* 2. Variable damage range (gradient, yellow to red) */}
            {result.maxPercent > result.minPercent && (
              <div
                className="absolute inset-y-0 bg-gradient-to-r from-yellow-500 to-red-500 transition-all"
                style={{
                  left: `${Math.max(0, 100 - result.maxPercent - result.hazardPercent)}%`,
                  width: `${Math.min(result.maxPercent - result.minPercent, Math.max(0, 100 - result.hazardPercent - result.minPercent))}%`,
                }}
              />
            )}
            {/* 3. Guaranteed damage from attack (red) */}
            <div
              className="absolute inset-y-0 bg-red-600 transition-all"
              style={{
                left: `${Math.max(0, 100 - result.minPercent - result.hazardPercent)}%`,
                width: `${Math.min(result.minPercent, 100 - result.hazardPercent)}%`
              }}
            />
            {/* 4. Hazard damage on switch-in (dark maroon, rightmost) */}
            {result.hazardPercent > 0 && (
              <div
                className="absolute inset-y-0 right-0 bg-rose-900 transition-all"
                style={{ width: `${Math.min(result.hazardPercent, 100)}%` }}
                title={`Hazard damage: ${result.hazardPercent.toFixed(1)}%`}
              />
            )}
          </div>
          {/* HP markers */}
          <div className="flex justify-between text-2xs text-slate-500 mt-0.5">
            <span>0</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>100</span>
          </div>
        </div>

        {/* Hazard Breakdown (if any) */}
        {result.hazardPercent > 0 && (
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-rose-400 font-medium">Switch-in:</span>
            <div className="flex gap-1.5 text-slate-400">
              {result.hazardBreakdown.stealthRock > 0 && (
                <span>SR {result.hazardBreakdown.stealthRock.toFixed(1)}%</span>
              )}
              {result.hazardBreakdown.spikes > 0 && (
                <span>Spikes {result.hazardBreakdown.spikes.toFixed(1)}%</span>
              )}
              {result.hazardBreakdown.steelsurge > 0 && (
                <span>Steelsurge {result.hazardBreakdown.steelsurge.toFixed(1)}%</span>
              )}
              <span className="text-rose-300">= {result.hazardPercent.toFixed(1)}%</span>
            </div>
          </div>
        )}

        {/* Info button when no KO chance banner (fallback location) */}
        {!result.koChance && (
          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-[10px] text-slate-400">View details</span>
            <InfoButton description={result.fullDesc} colorClass="text-slate-400" />
          </div>
        )}
      </div>
    </div>
  );
}
