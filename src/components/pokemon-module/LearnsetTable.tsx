"use client";

import { useState, useMemo } from "react";
import { useGenerationStore } from "@/stores/generationStore";
import { useLearnset } from "@/hooks/useLearnset";
import { TypeBadge } from "@/components/type-chart/TypeBadge";
import { PokemonType, PokemonTypeName } from "@/types/pokemon";
import { LearnMethod } from "@/types/moves";

interface Props {
  pokemonName: string;
  pokemonTypes: PokemonType[];
}

type SortKey = "level" | "tm" | "name" | "type" | "category" | "power" | "accuracy";
type SortDirection = "asc" | "desc";

// Order values for descending sort: special (2) > physical (1) > status (0)
const CATEGORY_ORDER: Record<string, number> = {
  special: 2,
  physical: 1,
  status: 0,
};

const METHOD_TABS: { id: LearnMethod; label: string }[] = [
  { id: "level-up", label: "Level Up" },
  { id: "machine", label: "TM/HM" },
  { id: "egg", label: "Egg" },
  { id: "tutor", label: "Tutor" },
];

export function LearnsetTable({ pokemonName, pokemonTypes }: Props) {
  const { globalGeneration } = useGenerationStore();
  const { data: learnset, isLoading, error } = useLearnset(pokemonName);
  const [activeMethod, setActiveMethod] = useState<LearnMethod>("level-up");
  const [sortKey, setSortKey] = useState<SortKey>("level");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const filteredLearnset = useMemo(() => {
    if (!learnset) return [];

    // Filter by generation and learn method
    const filtered = learnset.filter(
      (entry) =>
        entry.generation === globalGeneration &&
        entry.learnMethod === activeMethod
    );

    // Sort
    return [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortKey) {
        case "level":
          comparison = (a.levelLearned ?? 999) - (b.levelLearned ?? 999);
          break;
        case "tm": {
          // Sort TMs first (1-999), then HMs (1000+)
          // TM01 = 1, TM99 = 99, HM01 = 1001, HM07 = 1007
          const getMachineOrder = (mn: string | null): number => {
            if (!mn) return 9999;
            const isHM = mn.startsWith("HM");
            const num = parseInt(mn.replace(/\D/g, ""), 10);
            return isHM ? 1000 + num : num;
          };
          comparison = getMachineOrder(a.machineNumber) - getMachineOrder(b.machineNumber);
          break;
        }
        case "name":
          comparison = a.move.displayName.localeCompare(b.move.displayName);
          break;
        case "type":
          comparison = a.move.type.localeCompare(b.move.type);
          break;
        case "category":
          comparison = (CATEGORY_ORDER[a.move.damageClass] ?? 3) - (CATEGORY_ORDER[b.move.damageClass] ?? 3);
          break;
        case "power":
          comparison = (a.move.power ?? 0) - (b.move.power ?? 0);
          break;
        case "accuracy":
          comparison = (a.move.accuracy ?? 0) - (b.move.accuracy ?? 0);
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [learnset, globalGeneration, activeMethod, sortKey, sortDirection]);

  // Count moves per method
  const methodCounts = useMemo((): Record<LearnMethod, number> => {
    const defaultCounts: Record<LearnMethod, number> = {
      "level-up": 0,
      "machine": 0,
      "egg": 0,
      "tutor": 0,
    };

    if (!learnset) return defaultCounts;

    // Filter by generation first, then count per method
    const genFiltered = learnset.filter(
      (entry) => entry.generation === globalGeneration
    );

    return METHOD_TABS.reduce((acc, tab) => {
      acc[tab.id] = genFiltered.filter((e) => e.learnMethod === tab.id).length;
      return acc;
    }, defaultCounts);
  }, [learnset, globalGeneration]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Power and accuracy default to descending (highest first)
      // Category defaults to descending (special first, since we'll invert the comparison)
      const defaultDesc = key === "power" || key === "accuracy" || key === "category";
      setSortDirection(defaultDesc ? "desc" : "asc");
    }
  };

  const handleMethodChange = (method: LearnMethod) => {
    setActiveMethod(method);
    // Reset sort to appropriate default for the method
    if (method === "level-up") {
      setSortKey("level");
      setSortDirection("asc");
    } else if (method === "machine") {
      setSortKey("tm");
      setSortDirection("asc");
    } else {
      setSortKey("name");
      setSortDirection("asc");
    }
  };

  const isSTAB = (moveType: PokemonTypeName) =>
    pokemonTypes.some((t) => t.name === moveType);

  const SortHeader = ({
    label,
    sortKeyValue,
    className = "",
  }: {
    label: string;
    sortKeyValue: SortKey;
    className?: string;
  }) => (
    <th
      className={`py-2 px-2 cursor-pointer hover:bg-slate-800 select-none transition-colors ${className}`}
      onClick={() => handleSort(sortKeyValue)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortKey === sortKeyValue && (
          <span className="text-blue-400">
            {sortDirection === "asc" ? "↑" : "↓"}
          </span>
        )}
      </div>
    </th>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
        <span className="ml-2 text-slate-400">Loading moves...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-400">
        Failed to load moves. Try refreshing.
      </div>
    );
  }

  return (
    <div>
      {/* Method Tabs */}
      <div className="flex gap-1 mb-3 border-b border-slate-700">
        {METHOD_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleMethodChange(tab.id)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              activeMethod === tab.id
                ? "text-blue-400 border-b-2 border-blue-400 -mb-px"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {tab.label}
            {methodCounts[tab.id] !== undefined && (
              <span className="ml-1 text-slate-500">
                ({methodCounts[tab.id]})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-96 overflow-y-auto rounded-lg border border-slate-700">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-slate-900 z-10">
            <tr className="text-left text-slate-400 border-b border-slate-700">
              {activeMethod === "level-up" && (
                <SortHeader label="Lv" sortKeyValue="level" className="w-12" />
              )}
              {activeMethod === "machine" && (
                <SortHeader label="TM" sortKeyValue="tm" className="w-14" />
              )}
              <SortHeader label="Move" sortKeyValue="name" />
              <SortHeader label="Type" sortKeyValue="type" className="w-20" />
              <SortHeader label="Cat" sortKeyValue="category" className="w-10 text-center" />
              <SortHeader label="Pwr" sortKeyValue="power" className="w-10" />
              <SortHeader label="Acc" sortKeyValue="accuracy" className="w-10" />
            </tr>
          </thead>
          <tbody>
            {filteredLearnset.map((entry, idx) => (
              <tr
                key={`${entry.move.id}-${idx}`}
                className={`border-b border-slate-800 hover:bg-slate-800/50 ${
                  isSTAB(entry.move.type) ? "bg-slate-800/30" : ""
                }`}
              >
                {activeMethod === "level-up" && (
                  <td className="py-1.5 px-2 text-slate-400">
                    {entry.levelLearned ?? "-"}
                  </td>
                )}
                {activeMethod === "machine" && (
                  <td className="py-1.5 px-2 text-slate-400 font-mono text-[10px]">
                    {entry.machineNumber ?? "-"}
                  </td>
                )}
                <td className="py-1.5 px-2 text-white">
                  {entry.move.displayName}
                  {isSTAB(entry.move.type) && (
                    <span className="ml-1 text-[10px] text-yellow-400 font-semibold">
                      STAB
                    </span>
                  )}
                </td>
                <td className="py-1.5 px-2">
                  <TypeBadge type={entry.move.type} size="xs" fixedWidth />
                </td>
                <td className="py-1.5 px-2 text-center">
                  <DamageClassIcon damageClass={entry.move.damageClass} />
                </td>
                <td className="py-1.5 px-2 text-right text-slate-300">
                  {entry.move.power ?? "-"}
                </td>
                <td className="py-1.5 px-2 text-right text-slate-300">
                  {entry.move.accuracy ?? "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredLearnset.length === 0 && (
        <div className="text-center py-6 text-slate-400 text-sm">
          {activeMethod === "egg" ? (
            <>
              <p>No egg move data available</p>
              <p className="text-xs text-slate-500 mt-1">
                PokeAPI doesn&apos;t have historical breeding data for most Pokemon
              </p>
            </>
          ) : (
            <p>No moves found for this method in Gen {globalGeneration}</p>
          )}
        </div>
      )}
    </div>
  );
}

function DamageClassIcon({ damageClass }: { damageClass: string }) {
  const config = {
    physical: { color: "bg-orange-600", label: "P" },
    special: { color: "bg-blue-600", label: "S" },
    status: { color: "bg-slate-600", label: "-" },
  }[damageClass] ?? { color: "bg-slate-600", label: "?" };

  return (
    <span
      className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-white ${config.color}`}
      title={damageClass}
    >
      {config.label}
    </span>
  );
}
