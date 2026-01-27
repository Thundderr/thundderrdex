"use client";

import { useMemo } from "react";
import { Pokemon, PokemonTypeName } from "@/types/pokemon";
import { calculateDualTypeEffectiveness } from "@/lib/utils/typeEffectiveness";
import { TypeBadge } from "@/components/type-chart/TypeBadge";
import { useGenerationStore } from "@/stores/generationStore";
import { getTypesForGeneration } from "@/lib/pokeapi/transformers";

interface Props {
  pokemon: Pokemon;
}

export function TypeEffectivenessDisplay({ pokemon }: Props) {
  const { globalGeneration } = useGenerationStore();

  // Get types for the selected generation
  const types = useMemo(() => {
    return getTypesForGeneration(pokemon, globalGeneration);
  }, [pokemon, globalGeneration]);

  const effectiveness = useMemo(() => {
    return calculateDualTypeEffectiveness(
      types.map((t) => t.name) as PokemonTypeName[]
    );
  }, [types]);

  // Check if types changed from current
  const typesChanged = useMemo(() => {
    const currentTypeNames = pokemon.types.map((t) => t.name).sort().join(",");
    const genTypeNames = types.map((t) => t.name).sort().join(",");
    return currentTypeNames !== genTypeNames;
  }, [pokemon.types, types]);

  return (
    <div className="space-y-4">
      {/* Type Change Notice */}
      {typesChanged && (
        <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-2 text-xs text-yellow-300">
          Showing types for Gen {globalGeneration}. Current: {pokemon.types.map((t) => t.name).join("/")}
        </div>
      )}

      {/* Current Types Display - just badges, no heading */}
      <div className="flex gap-2">
        {types.map((type) => (
          <TypeBadge key={type.name} type={type.name} size="sm" />
        ))}
      </div>

      {/* Weaknesses */}
      {effectiveness.weaknesses.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">
            Weak to
          </h4>
          <div className="flex flex-wrap gap-2">
            {effectiveness.weaknesses.map(({ type, multiplier }) => (
              <div key={type} className="flex items-center gap-1">
                <TypeBadge type={type} size="sm" />
                <span className="text-xs text-red-300 font-mono">
                  {multiplier}x
                </span>
              </div>
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
          <div className="flex flex-wrap gap-2">
            {effectiveness.resistances.map(({ type, multiplier }) => (
              <div key={type} className="flex items-center gap-1">
                <TypeBadge type={type} size="sm" />
                <span className="text-xs text-green-300 font-mono">
                  {multiplier}x
                </span>
              </div>
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
          <div className="flex flex-wrap gap-2">
            {effectiveness.immunities.map((type) => (
              <TypeBadge key={type} type={type} size="sm" />
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
