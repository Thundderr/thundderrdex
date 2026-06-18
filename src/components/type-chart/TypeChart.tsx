"use client";

import { useState } from "react";
import { TYPE_COLORS, ALL_TYPES } from "@/data/typeChart";
import { TypeBadge } from "./TypeBadge";
import { getTypeEffectivenessMultiplier } from "@/lib/utils/typeEffectiveness";

export function TypeChart() {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px] sm:min-w-[700px]">
        <table
          className="w-full border-collapse text-xs"
          onMouseLeave={() => setHoveredCell(null)}
        >
          <thead>
            <tr>
              <th className="p-1 sticky left-0 bg-slate-950 z-20 min-w-[60px]">
                <span className="text-slate-500 text-[10px] block">
                  ATK ↓ / DEF →
                </span>
              </th>
              {ALL_TYPES.map((type, colIndex) => (
                <th key={type} className="p-1 min-w-[36px]">
                  <div
                    className={`w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold mx-auto transition-all ${
                      hoveredCell?.col === colIndex ? "ring-2 ring-white scale-110" : ""
                    }`}
                    style={{
                      backgroundColor: TYPE_COLORS[type],
                      color: getContrastColor(TYPE_COLORS[type]),
                    }}
                    title={type}
                  >
                    {type.slice(0, 3).toUpperCase()}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_TYPES.map((attackingType, rowIndex) => (
              <tr key={attackingType}>
                <td className="p-1 sticky left-0 bg-slate-950 z-10">
                  <div
                    className={`transition-all inline-block ${
                      hoveredCell?.row === rowIndex ? "ring-2 ring-white rounded scale-110" : ""
                    }`}
                  >
                    <TypeBadge type={attackingType} size="xs" />
                  </div>
                </td>
                {ALL_TYPES.map((defendingType, colIndex) => {
                  const effectiveness = getTypeEffectivenessMultiplier(
                    attackingType,
                    defendingType
                  );
                  const isHovered = hoveredCell?.row === rowIndex && hoveredCell?.col === colIndex;

                  return (
                    <EffectivenessCell
                      key={defendingType}
                      effectiveness={effectiveness}
                      isHovered={isHovered}
                      onMouseEnter={() => setHoveredCell({ row: rowIndex, col: colIndex })}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-6 text-sm text-slate-300">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-green-600 rounded flex items-center justify-center text-xs font-bold text-white">
            2
          </div>
          <span>Super Effective (2x)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center text-xs font-bold text-white">
            ½
          </div>
          <span>Not Very Effective (0.5x)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-black rounded flex items-center justify-center text-xs font-bold text-slate-400 border border-slate-700">
            0
          </div>
          <span>No Effect (0x)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-slate-700/30 rounded border border-slate-700" />
          <span>Normal (1x)</span>
        </div>
      </div>
    </div>
  );
}

interface EffectivenessCellProps {
  effectiveness: number;
  isHovered: boolean;
  onMouseEnter: () => void;
}

function EffectivenessCell({ effectiveness, isHovered, onMouseEnter }: EffectivenessCellProps) {
  const getBgColor = () => {
    switch (effectiveness) {
      case 0:
        return "bg-black";
      case 0.5:
        return "bg-red-600/80";
      case 2:
        return "bg-green-600/80";
      default:
        return "bg-slate-700/30";
    }
  };

  const getText = () => {
    switch (effectiveness) {
      case 0:
        return "0";
      case 0.5:
        return "½";
      case 2:
        return "2";
      default:
        return "";
    }
  };

  const getTextColor = () => {
    if (effectiveness === 0) return "text-slate-500";
    return "text-white";
  };

  return (
    <td
      onMouseEnter={onMouseEnter}
      className={`p-1 text-center ${getBgColor()} border transition-all ${
        isHovered
          ? "border-white border-2 z-10 relative"
          : "border-slate-700/50"
      }`}
    >
      <span className={`${getTextColor()} font-bold text-xs`}>{getText()}</span>
    </td>
  );
}

function getContrastColor(hexColor: string): string {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}
