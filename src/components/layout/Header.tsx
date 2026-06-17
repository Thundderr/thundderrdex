"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useModuleStore } from "@/stores/moduleStore";
import { GenerationSelector } from "./GenerationSelector";
import { AccountButton } from "@/components/auth/AccountButton";

const MODULE_BUTTONS = [
  { key: "pokemon", action: "addModule", color: "blue", label: "Pokemon", shortLabel: "Pkmn" },
  { key: "typechart", action: "addTypeChartModule", color: "cyan", label: "Type Chart", shortLabel: "Types" },
  { key: "naturechart", action: "addNatureChartModule", color: "pink", label: "Nature Chart", shortLabel: "Natures" },
  { key: "team", action: "addTeamBuilderModule", color: "purple", label: "Team Coverage", shortLabel: "Team" },
  { key: "damagecalc", action: "addDamageCalcModule", color: "orange", label: "Damage Calc", shortLabel: "Calc" },
  { key: "location", action: "addLocationModule", color: "green", label: "Location", shortLabel: "Loc" },
  { key: "pokedex", action: "addPokedexModule", color: "emerald", label: "Pokedex", shortLabel: "Dex" },
  { key: "catchrate", action: "addCatchRateModule", color: "red", label: "Catch Rate", shortLabel: "Catch" },
] as const;

const COLOR_CLASSES: Record<string, string> = {
  blue: "bg-blue-600 hover:bg-blue-500",
  cyan: "bg-cyan-600 hover:bg-cyan-500",
  pink: "bg-pink-600 hover:bg-pink-500",
  purple: "bg-purple-600 hover:bg-purple-500",
  orange: "bg-orange-600 hover:bg-orange-500",
  green: "bg-green-600 hover:bg-green-500",
  emerald: "bg-emerald-600 hover:bg-emerald-500",
  red: "bg-red-600 hover:bg-red-500",
};

export function Header() {
  const store = useModuleStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showDivider, setShowDivider] = useState(false);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const checkOverflow = () => {
      setShowDivider(container.scrollWidth > container.clientWidth);
    };

    checkOverflow();
    const observer = new ResizeObserver(checkOverflow);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  const handleClick = (action: typeof MODULE_BUTTONS[number]["action"]) => {
    const fn = store[action];
    if (typeof fn === "function") (fn as () => void)();
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-4 py-2 sticky top-0 z-40 flex-shrink-0">
      {/* Desktop layout (md+): single row, unchanged */}
      <div className="hidden md:flex items-center gap-3">
        <Link href="/" className="text-xl font-bold text-white hover:text-slate-200 flex-shrink-0">
          ThundderrDex
        </Link>
        <div ref={scrollContainerRef} className="flex items-center gap-2 overflow-x-auto flex-nowrap flex-1 pb-1">
          <GenerationSelector />
          <div className="flex-1 min-w-[17px] flex items-center justify-center">
            {showDivider && <div className="w-px h-6 bg-slate-700" />}
          </div>
          {MODULE_BUTTONS.map((btn) => (
            <button
              key={btn.key}
              onClick={() => handleClick(btn.action)}
              className={`px-3 py-1.5 ${COLOR_CLASSES[btn.color]} text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap`}
            >
              + {btn.label}
            </button>
          ))}
        </div>
        <AccountButton />
      </div>

      {/* Mobile layout (<md): two rows */}
      <div className="flex flex-col gap-1 md:hidden pt-1">
        <div className="flex items-center gap-1.5 p-1">
          <div className="flex-1 overflow-x-auto min-w-0">
            <GenerationSelector stretch />
          </div>
          <AccountButton />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto p-1 min-w-0">
          {MODULE_BUTTONS.map((btn) => (
            <button
              key={btn.key}
              onClick={() => handleClick(btn.action)}
              className={`flex-1 px-2 py-1 ${COLOR_CLASSES[btn.color]} text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap text-center`}
            >
              + {btn.shortLabel}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
