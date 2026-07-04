"use client";

import { useState } from "react";
import Image from "next/image";
import { usePokemon } from "@/hooks/usePokemon";
import { usePikalyticsMon } from "@/hooks/usePikalyticsMon";
import { getSpriteUrl } from "@/lib/pokeapi/client";
import { formatPokemonName } from "@/lib/pokeapi/transformers";
import { formatEvSpread } from "@/lib/scouting/scoutingData";
import { getChampionsMegas } from "@/lib/pokemon/championsMega";
import { StatBars } from "./StatBars";
import { UsageList } from "./UsageList";

interface Props {
  name: string;
  onClear: () => void;
}

export function ScoutingColumn({ name, onClear }: Props) {
  const { data: pokemon, isError } = usePokemon(name);
  const [spriteFailed, setSpriteFailed] = useState(false);
  const champ = getChampionsMegas().find((m) => m.name === name);
  const [megaForm, setMegaForm] = useState(false);
  const { data: usage, isLoading: usageLoading } = usePikalyticsMon(name, { megaForm });

  return (
    <div className="flex w-[220px] shrink-0 flex-col gap-2 rounded-lg border border-line bg-surface-raised p-2">
      {/* Header: sprite + name/types + remove */}
      <div className="flex items-start gap-2">
        <div className="h-12 w-12 shrink-0">
          {pokemon ? (
            <Image
              src={spriteFailed ? getSpriteUrl(pokemon.id) : (pokemon.sprites.front_default ?? getSpriteUrl(pokemon.id))}
              alt=""
              width={48}
              height={48}
              className="pixelated"
              unoptimized
              onError={() => setSpriteFailed(true)}
            />
          ) : (
            <div className="h-12 w-12 animate-pulse rounded bg-surface-hover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-fg">{formatPokemonName(name)}</p>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {pokemon?.types.map((t) => (
              <span key={t.name} className="rounded px-1.5 py-0.5 text-[9px] font-medium uppercase text-white" style={{ backgroundColor: t.color }}>
                {t.name}
              </span>
            ))}
            {champ && (
              <span className="rounded bg-teal-600/80 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">Champions</span>
            )}
          </div>
        </div>
        <button onClick={onClear} aria-label="Remove Pokémon" title="Remove" className="shrink-0 rounded p-0.5 text-fg-subtle transition-colors hover:bg-red-600/20 hover:text-red-400">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Base stats */}
      {pokemon ? <StatBars stats={pokemon.stats} /> : isError ? (
        <p className="text-2xs text-red-400">Failed to load base stats.</p>
      ) : (
        <div className="h-24 animate-pulse rounded bg-surface-hover" />
      )}
      {champ && <p className="text-2xs text-fg-subtle">Mega Stone: {champ.stone}</p>}

      {/* Mega/base toggle (Champions megas only) */}
      {champ && (
        <button
          onClick={() => setMegaForm((v) => !v)}
          className="self-start rounded bg-surface px-1.5 py-0.5 text-2xs text-fg-subtle hover:bg-surface-hover hover:text-fg"
        >
          {megaForm ? "Showing: Mega form" : "Showing: base species"} · swap
        </button>
      )}

      {/* Usage sections (Pikalytics official-ranked) */}
      {usageLoading ? (
        <p className="text-2xs text-fg-subtle">Loading usage…</p>
      ) : usage && !usage.notCharted ? (
        <div className="space-y-2">
          {usage.winRate != null && (
            <p className="text-2xs text-fg-muted">Win rate <span className="font-semibold text-fg">{usage.winRate.toFixed(1)}%</span>{usage.record ? ` (${usage.record})` : ""}</p>
          )}
          <UsageList label="Moves" options={usage.moves} emphasize />
          <UsageList label="Items" options={usage.items} limit={3} />
          <UsageList label="Abilities" options={usage.abilities} limit={2} />
          <div>
            <h4 className="mb-0.5 text-2xs font-semibold uppercase tracking-wide text-fg-subtle">Spread</h4>
            {usage.spread ? (
              <p className="text-2xs text-fg-muted">{formatEvSpread(usage.spread)}{usage.spread.pct ? ` (${Math.round(usage.spread.pct)}%)` : ""}</p>
            ) : (
              <p className="text-2xs text-fg-subtle">—</p>
            )}
          </div>
          {usage.teammates.length > 0 && (
            <div>
              <h4 className="mb-0.5 text-2xs font-semibold uppercase tracking-wide text-fg-subtle">Teammates</h4>
              <p className="text-2xs text-fg-muted">{usage.teammates.slice(0, 6).join(", ")}</p>
            </div>
          )}
          <a
            href={`https://www.pikalytics.com/pokedex`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-[9px] text-fg-subtle hover:underline"
          >
            Data: Pikalytics{usage.formatLabel ? ` · ${usage.formatLabel.replace("Pokemon Champions VGC 2026 ", "")}` : " · official ranked"}
          </a>
        </div>
      ) : (
        <p className="text-2xs text-fg-subtle">Not charted in official ranked data yet.</p>
      )}
    </div>
  );
}
