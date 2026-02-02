"use client";

import { NATURES, STAT_DISPLAY_NAMES, StatKey } from "@/data/natures";

// Order of stats for the grid (matches the standard nature chart layout)
const STAT_ORDER: StatKey[] = ["attack", "defense", "specialAttack", "specialDefense", "speed"];

// Build a lookup map for natures by their stat combination
function buildNatureLookup(): Map<string, string> {
  const lookup = new Map<string, string>();

  for (const nature of NATURES) {
    // For non-neutral natures
    if (nature.increasedStat && nature.decreasedStat) {
      lookup.set(`${nature.increasedStat}-${nature.decreasedStat}`, nature.name);
    }
  }

  // Neutral natures go on the diagonal (same stat increased/decreased = no change)
  const neutralNatures = ["Hardy", "Docile", "Bashful", "Quirky", "Serious"];
  STAT_ORDER.forEach((stat, index) => {
    lookup.set(`${stat}-${stat}`, neutralNatures[index]);
  });

  return lookup;
}

const NATURE_LOOKUP = buildNatureLookup();

export function NatureChart() {
  return (
    <div className="min-h-[280px]">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {/* Corner cell with label */}
              <th className="p-2 sticky left-0 bg-slate-950 z-20 min-w-[56px]">
                <span className="text-slate-500 text-[10px] block">
                  +↓ / -→
                </span>
              </th>
              {/* Column headers (decreased stats) */}
              {STAT_ORDER.map((stat) => (
                <th key={stat} className="p-2 min-w-[72px]">
                  <div className="text-sm font-medium">
                    <span className="text-red-400">-</span>
                    <span className="text-slate-300">{STAT_DISPLAY_NAMES[stat]}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STAT_ORDER.map((increasedStat, rowIndex) => (
              <tr key={increasedStat}>
                {/* Row header (increased stat) */}
                <td className="p-2 sticky left-0 bg-slate-950 z-10">
                  <div className="text-sm font-medium">
                    <span className="text-green-400">+</span>
                    <span className="text-slate-300">{STAT_DISPLAY_NAMES[increasedStat]}</span>
                  </div>
                </td>
                {/* Nature cells */}
                {STAT_ORDER.map((decreasedStat, colIndex) => {
                  const natureName = NATURE_LOOKUP.get(`${increasedStat}-${decreasedStat}`);
                  const isNeutral = rowIndex === colIndex;

                  return (
                    <td
                      key={decreasedStat}
                      className={`p-2 text-center border ${
                        isNeutral
                          ? "bg-slate-500/40 border-slate-500"
                          : "bg-slate-700/50 border-slate-700/50"
                      }`}
                    >
                      <span
                        className={`text-sm font-medium ${
                          isNeutral ? "text-slate-200 italic" : "text-white"
                        }`}
                      >
                        {natureName}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-16 h-6 bg-slate-500/40 rounded border border-slate-500 flex items-center justify-center text-[10px] italic text-slate-300">
            Neutral
          </div>
          <span>No stat change</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-16 h-6 bg-slate-700/50 rounded border border-slate-700/50 flex items-center justify-center text-[10px] text-white">
            Other
          </div>
          <span className="text-green-400">+10%</span>
          <span>/</span>
          <span className="text-red-400">-10%</span>
        </div>
      </div>

      {/* Explanation - 3 columns */}
      <div className="mt-4 pt-4 border-t border-slate-700 text-xs text-slate-400 grid grid-cols-3 gap-4">
        <div>
          <span className="text-slate-300 font-medium">How Natures Work</span>
          <p className="mt-1">
            Each nature increases one stat by 10% and decreases another by 10% at level 100.
          </p>
          <p className="mt-2">
            The five neutral natures on the diagonal (Hardy, Docile, Bashful, Quirky, Serious)
            increase and decrease the same stat, resulting in no net change.
          </p>
        </div>
        <div>
          <span className="text-slate-300 font-medium">Choosing the Right Nature</span>
          <p className="mt-1">
            Pick a nature that boosts your Pokemon&apos;s primary attacking stat and lowers the one it won&apos;t use.
          </p>
          <p className="mt-2">
            Physical attackers benefit from <span className="whitespace-nowrap"><span className="text-green-400">+Atk</span> <span className="text-red-400">-SpA</span></span> (Adamant),
            while special attackers prefer <span className="whitespace-nowrap"><span className="text-green-400">+SpA</span> <span className="text-red-400">-Atk</span></span> (Modest).
            Speed-focused Pokemon often use Jolly or Timid.
          </p>
        </div>
        <div>
          <span className="text-slate-300 font-medium">Berry Flavors</span>
          <p className="mt-1 mb-2">Pokemon like the flavor of their boosted stat and dislike the lowered one.</p>
          <table className="text-[10px] border-collapse border border-slate-600 rounded">
            <tbody>
              <tr><td className="px-2 py-0.5 border border-slate-600">Atk</td><td className="px-2 py-0.5 border border-slate-600 text-amber-400">Spicy</td></tr>
              <tr><td className="px-2 py-0.5 border border-slate-600">Def</td><td className="px-2 py-0.5 border border-slate-600 text-yellow-400">Sour</td></tr>
              <tr><td className="px-2 py-0.5 border border-slate-600">SpA</td><td className="px-2 py-0.5 border border-slate-600 text-blue-400">Dry</td></tr>
              <tr><td className="px-2 py-0.5 border border-slate-600">SpD</td><td className="px-2 py-0.5 border border-slate-600 text-green-400">Bitter</td></tr>
              <tr><td className="px-2 py-0.5 border border-slate-600">Spe</td><td className="px-2 py-0.5 border border-slate-600 text-pink-400">Sweet</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
