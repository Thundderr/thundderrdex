"use client";

import { useMemo } from "react";
import { Pokemon, PokemonTypeName } from "@/types/pokemon";
import { calculateDualTypeEffectiveness } from "@/lib/utils/typeEffectiveness";
import { TYPE_COLORS } from "@/data/typeChart";
import { useGenerationStore } from "@/stores/generationStore";
import { getTypesForGeneration } from "@/lib/pokeapi/transformers";

interface Props {
  pokemon: Pokemon;
}

function getContrastColor(hexColor: string): string {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

function capitalizeType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function TypeChip({ type, multiplier }: { type: PokemonTypeName; multiplier?: string }) {
  const color = TYPE_COLORS[type];
  const textColor = getContrastColor(color);

  return (
    <span
      className="inline-flex items-center rounded text-xs font-semibold leading-none overflow-hidden"
      style={{ backgroundColor: color, color: textColor }}
    >
      <span className="px-2 py-1">{capitalizeType(type)}</span>
      {multiplier && (
        <span
          className="px-1.5 py-1 text-[11px] font-bold"
          style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
        >
          {multiplier}
        </span>
      )}
    </span>
  );
}

export function TypeEffectivenessDisplay({ pokemon }: Props) {
  const { globalGeneration } = useGenerationStore();

  // Get types for the selected generation
  const types = useMemo(() => {
    return getTypesForGeneration(pokemon, globalGeneration);
  }, [pokemon, globalGeneration]);

  const effectiveness = useMemo(() => {
    return calculateDualTypeEffectiveness(
      types.map((t) => t.name) as PokemonTypeName[],
      globalGeneration
    );
  }, [types, globalGeneration]);

  return (
    <div className="space-y-4">
      {/* Weaknesses */}
      {effectiveness.weaknesses.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">
            Weak to
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {effectiveness.weaknesses.map(({ type, multiplier }) => (
              <TypeChip key={type} type={type} multiplier={`${multiplier}×`} />
            ))}
          </div>
        </div>
      )}

      {/* Resistances */}
      {effectiveness.resistances.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-2">
            Resistant to
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {effectiveness.resistances.map(({ type, multiplier }) => (
              <TypeChip key={type} type={type} multiplier={`${multiplier}×`} />
            ))}
          </div>
        </div>
      )}

      {/* Immunities */}
      {effectiveness.immunities.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">
            Immune to
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {effectiveness.immunities.map((type) => (
              <TypeChip key={type} type={type} multiplier="0×" />
            ))}
          </div>
        </div>
      )}

      {effectiveness.weaknesses.length === 0 &&
        effectiveness.resistances.length === 0 &&
        effectiveness.immunities.length === 0 && (
          <p className="text-slate-400 text-sm">No special type interactions</p>
        )}
    </div>
  );
}
