"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useModuleStore } from "@/stores/moduleStore";
import { GenerationSelector } from "./GenerationSelector";

export function Header() {
  const { addModule, addTypeChartModule, addNatureChartModule, addTeamBuilderModule, addDamageCalcModule, addLocationModule } = useModuleStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showDivider, setShowDivider] = useState(false);

  // Show divider only when the container is scrollable (content overflows)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const checkOverflow = () => {
      setShowDivider(container.scrollWidth > container.clientWidth);
    };

    // Check on mount and resize
    checkOverflow();
    const observer = new ResizeObserver(checkOverflow);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-4 py-2 sticky top-0 z-40 flex-shrink-0">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-xl font-bold text-white hover:text-slate-200 flex-shrink-0">
          ThundderrDex
        </Link>
        {/* Scrollable area for gen selector + module buttons */}
        <div ref={scrollContainerRef} className="flex items-center gap-2 overflow-x-auto flex-nowrap flex-1 pb-1">
          <GenerationSelector />
          {/* Spacer - expands to push buttons right, shows divider only when scrollable */}
          <div className="flex-1 min-w-[17px] flex items-center justify-center">
            {showDivider && <div className="w-px h-6 bg-slate-700" />}
          </div>
          <button
            onClick={() => addModule()}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            + Pokemon
          </button>
          <button
            onClick={addTypeChartModule}
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            + Type Chart
          </button>
          <button
            onClick={addNatureChartModule}
            className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            + Nature Chart
          </button>
          <button
            onClick={addTeamBuilderModule}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            + Team Coverage
          </button>
          <button
            onClick={addDamageCalcModule}
            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            + Damage Calc
          </button>
          <button
            onClick={() => addLocationModule()}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            + Location
          </button>
        </div>
      </div>
    </header>
  );
}
