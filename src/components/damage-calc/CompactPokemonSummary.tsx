"use client";

import Image from "next/image";
import { usePokemon } from "@/hooks/usePokemon";
import { useGenerationStore } from "@/stores/generationStore";
import { DamageCalcPokemonConfig } from "@/types/module";
import { getTypesForGeneration, formatPokemonName } from "@/lib/pokeapi/transformers";
import { TypeBadge } from "@/components/type-chart/TypeBadge";



interface Props {
  config: DamageCalcPokemonConfig;
  label: string;
  onClick?: () => void;
}

export function CompactPokemonSummary({ config, label, onClick }: Props) {
  const { data: pokemon } = usePokemon(config.pokemonName);
  const { globalGeneration } = useGenerationStore();

  const types = pokemon ? getTypesForGeneration(pokemon, globalGeneration) : [];

  if (!config.pokemonName || !pokemon) {
    return (
      <div
        className={`flex items-center gap-2 p-2 rounded bg-slate-800/50 border border-dashed border-slate-600 ${onClick ? "cursor-pointer hover:bg-slate-700/50" : ""}`}
        onClick={onClick}
      >
        <span className="text-[10px] uppercase text-slate-500 font-medium">{label}</span>
        <span className="text-xs text-slate-500">No Pokemon selected</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 p-2 rounded bg-slate-800 border border-slate-700 ${onClick ? "cursor-pointer hover:bg-slate-700" : ""}`}
      onClick={onClick}
    >
      <Image
        src={pokemon.sprites.front_default || ""}
        alt={pokemon.displayName}
        width={36}
        height={36}
        className="pixelated flex-shrink-0"
        unoptimized
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase text-slate-500 font-medium">{label}</span>
          <span className="text-xs font-medium text-white truncate">{pokemon.displayName}</span>
          <span className="text-[10px] text-slate-500">Lv{config.level}</span>
        </div>
        <div className="flex gap-1 mt-0.5">
          {types.map((type) => (
            <TypeBadge key={type.name} type={type.name} size="sm" />
          ))}
          {config.item && (
            <span className="text-[10px] text-slate-400 ml-1 truncate">@ {formatPokemonName(config.item)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
