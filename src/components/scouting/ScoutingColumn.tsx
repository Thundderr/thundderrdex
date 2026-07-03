"use client";

import Image from "next/image";
import { usePokemon } from "@/hooks/usePokemon";
import { getSpriteUrl } from "@/lib/pokeapi/client";
import { formatPokemonName } from "@/lib/pokeapi/transformers";
import { SlimUsageEntry } from "@/lib/competitive/types";
import { formatEvSpread } from "@/lib/scouting/scoutingData";
import { StatBars } from "./StatBars";
import { UsageList } from "./UsageList";

interface Props {
  name: string;
  entry: SlimUsageEntry | null;
  usageLoading: boolean;
  onClear: () => void;
}

export function ScoutingColumn({ name, entry, usageLoading, onClear }: Props) {
  const { data: pokemon, isError } = usePokemon(name);

  return (
    <div className="flex w-[220px] shrink-0 flex-col gap-2 rounded-lg border border-line bg-surface-raised p-2">
      {/* Header: sprite + name/types + remove */}
      <div className="flex items-start gap-2">
        <div className="h-12 w-12 shrink-0">
          {pokemon ? (
            <Image
              src={pokemon.sprites.front_default ?? getSpriteUrl(pokemon.id)}
              alt=""
              width={48}
              height={48}
              className="pixelated"
              unoptimized
            />
          ) : (
            <div className="h-12 w-12 animate-pulse rounded bg-surface-hover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-fg">{formatPokemonName(name)}</p>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {pokemon?.types.map((t) => (
              <span
                key={t.name}
                className="rounded px-1.5 py-0.5 text-[9px] font-medium uppercase text-white"
                style={{ backgroundColor: t.color }}
              >
                {t.name}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={onClear}
          aria-label="Remove Pokémon"
          title="Remove"
          className="shrink-0 rounded p-0.5 text-fg-subtle transition-colors hover:bg-red-600/20 hover:text-red-400"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Base stats */}
      {pokemon ? (
        <StatBars stats={pokemon.stats} />
      ) : isError ? (
        <p className="text-2xs text-red-400">Failed to load base stats.</p>
      ) : (
        <div className="h-24 animate-pulse rounded bg-surface-hover" />
      )}

      {/* Usage sections */}
      {usageLoading ? (
        <p className="text-2xs text-fg-subtle">Loading usage…</p>
      ) : entry ? (
        <div className="space-y-2">
          <UsageList label="Moves" options={entry.moves} emphasize />
          <UsageList label="Items" options={entry.items} limit={3} />
          <UsageList label="Abilities" options={entry.abilities} limit={2} />
          <div>
            <h4 className="mb-0.5 text-2xs font-semibold uppercase tracking-wide text-fg-subtle">Spreads</h4>
            {entry.spreads.length === 0 ? (
              <p className="text-2xs text-fg-subtle">—</p>
            ) : (
              <ul className="space-y-0.5">
                {entry.spreads.slice(0, 2).map((s, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-1 text-2xs">
                    <span className="truncate text-fg-muted">{formatEvSpread(s)}</span>
                    <span className="shrink-0 tabular-nums text-fg-subtle">{Math.round(s.pct)}%</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <UsageList label="Teammates" options={entry.teammates} limit={4} />
        </div>
      ) : (
        <p className="text-2xs text-fg-subtle">No usage data in this format.</p>
      )}
    </div>
  );
}
