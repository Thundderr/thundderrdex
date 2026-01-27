"use client";

import { PokemonAbility } from "@/types/pokemon";
import { useGenerationStore } from "@/stores/generationStore";
import { abilitiesExistInGeneration } from "@/lib/pokeapi/transformers";

interface Props {
  abilities: PokemonAbility[];
}

export function AbilitiesPanel({ abilities }: Props) {
  const { globalGeneration } = useGenerationStore();

  // Abilities didn't exist in Gen 1-2
  if (!abilitiesExistInGeneration(globalGeneration)) {
    return (
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 text-center">
        <p className="text-slate-400 text-sm">
          Abilities were introduced in Generation 3.
        </p>
        <p className="text-slate-500 text-xs mt-2">
          Select Gen 3 or later to view abilities.
        </p>
      </div>
    );
  }

  if (abilities.length === 0) {
    return (
      <div className="text-center py-4 text-slate-400">
        Loading abilities...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {abilities.map((ability) => (
        <div
          key={ability.name}
          className="bg-slate-800 rounded-lg p-3 border border-slate-700"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-white">
              {ability.displayName}
            </span>
            {ability.isHidden && (
              <span className="text-xs px-1.5 py-0.5 bg-purple-600/30 text-purple-300 rounded">
                Hidden
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            {ability.description}
          </p>
        </div>
      ))}
    </div>
  );
}
