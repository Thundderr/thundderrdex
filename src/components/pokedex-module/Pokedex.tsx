"use client";

import { useRef, useMemo, useCallback, useState, useEffect } from "react";
import Image from "next/image";
import { usePokemonList } from "@/hooks/usePokemonList";
import { usePokedex } from "@/hooks/usePokedex";
import { usePokemonOfType } from "@/hooks/usePokemonOfType";
import { useGenerationStore } from "@/stores/generationStore";
import { isSpeciesInChampions, isFormInChampions } from "@/data/championsRoster";
import { ChampionsRulesChip } from "@/components/champions/ChampionsRulesChip";
import { useModuleStore } from "@/stores/moduleStore";
import { useCaughtStore, CatchMark, NATIONAL_BUCKET } from "@/stores/caughtStore";
import { GENERATIONS } from "@/data/generations";
import { getRegionalDexGroups, getRegionalDexById } from "@/data/pokedexes";
import { getSpriteUrl } from "@/lib/pokeapi/client";
import { QueryState } from "@/components/ui";
import { ALL_TYPES, TYPE_COLORS } from "@/data/typeChart";
import type { PokemonTypeName } from "@/types/pokemon";

interface PokedexProps {
  moduleId: string;
  // null/undefined = National dex (generation-grouped view). A number = a regional dex id.
  selectedDexId?: number | null;
}

export function Pokedex({ moduleId, selectedDexId: selectedDexIdProp }: PokedexProps) {
  const { data: allPokemon, isLoading, isError, refetch } = usePokemonList();
  const { globalGeneration, setGeneration, championsMode } = useGenerationStore();
  const { addPokemonModule, setPokedexDex } = useModuleStore();
  const caught = useCaughtStore((s) => s.caught);
  const cycleCaught = useCaughtStore((s) => s.cycleCaught);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Selected dex lives on the module in the store so it survives refreshes
  const selectedDexId = selectedDexIdProp ?? null;
  // When on, tiles marked "caught" are hidden (unmarked and transit stay visible)
  const [showUncaughtOnly, setShowUncaughtOnly] = useState(false);
  // The cycle passes through "caught" on the way to "transit". Without this, a
  // tile would vanish from the uncaught-only view the instant you cycled it to
  // "caught", making in-transit unreachable there. So we keep any tile you cycle
  // during an uncaught-only session pinned as visible until the next refresh —
  // toggling the filter or switching dex clears the set (see the effect below).
  const [keepVisible, setKeepVisible] = useState<Set<string>>(() => new Set());
  // Mark mode: a touch-friendly alternative to right-clicking. When on, tapping a
  // tile cycles its catch mark instead of opening the Pokemon (great for marking a
  // whole dex on mobile, where right-click doesn't exist).
  const [markMode, setMarkMode] = useState(false);
  // Top-bar filters: free-text name match and a single type.
  const [nameFilter, setNameFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<PokemonTypeName | null>(null);
  const { data: typeIds, isLoading: isTypeLoading } = usePokemonOfType(typeFilter);
  const dexGroups = useMemo(() => getRegionalDexGroups(), []);
  const selectedDex = selectedDexId !== null ? getRegionalDexById(selectedDexId) : undefined;
  const { data: regionalEntries, isLoading: isRegionalLoading, isError: isRegionalError, refetch: refetchRegional } = usePokedex(selectedDexId);

  // Each dex tracks its own catch marks: the National view uses the "national"
  // bucket; a regional dex uses its region group (so e.g. all Paldea-region
  // dexes share one bucket, separate from Galar, Hisui, and National).
  const bucketKey = selectedDex ? selectedDex.group : NATIONAL_BUCKET;
  const marks = useMemo(() => caught[bucketKey] ?? {}, [caught, bucketKey]);

  // Start each uncaught-only session (and each dex) with a clean slate: caught
  // tiles are hidden again until you cycle them within this session.
  useEffect(() => {
    setKeepVisible(new Set());
  }, [bucketKey, showUncaughtOnly]);

  // Cycle a tile's mark, and — when filtering to uncaught only — pin it visible
  // so it doesn't disappear mid-cycle before you can reach in-transit.
  const handleCycle = useCallback(
    (key: string) => {
      cycleCaught(bucketKey, key);
      if (showUncaughtOnly) {
        setKeepVisible((prev) => {
          const next = new Set(prev);
          next.add(key);
          return next;
        });
      }
    },
    [cycleCaught, bucketKey, showUncaughtOnly]
  );

  // A tile is hidden by the uncaught-only filter when it's caught — unless it was
  // cycled during this session (kept visible so the full cycle stays reachable).
  const isHiddenByUncaught = useCallback(
    (key: string) => showUncaughtOnly && marks[key] === "caught" && !keepVisible.has(key),
    [showUncaughtOnly, marks, keepVisible]
  );

  // Shared name/type matcher used by both the National and regional views.
  // `id` is the national-dex id (used for type membership); name/displayName are
  // matched case-insensitively against the free-text query.
  const nameQuery = nameFilter.trim().toLowerCase();
  const matchesFilters = useCallback(
    (id: number, name: string, displayName: string) => {
      if (
        nameQuery &&
        !displayName.toLowerCase().includes(nameQuery) &&
        !name.toLowerCase().includes(nameQuery)
      ) {
        return false;
      }
      // While the type list is still loading, don't filter anything out.
      if (typeFilter && typeIds && !typeIds.has(id)) return false;
      return true;
    },
    [nameQuery, typeFilter, typeIds]
  );

  const visibleRegionalEntries = useMemo(() => {
    if (!regionalEntries) return [];
    return regionalEntries.filter((e) => {
      if (isHiddenByUncaught(e.catchKey ?? String(e.nationalId))) return false;
      return matchesFilters(e.nationalId, e.name, e.displayName);
    });
  }, [regionalEntries, isHiddenByUncaught, matchesFilters]);

  // Filter to base Pokemon only (id 1-1025), deduplicated by id, sorted by id
  const basePokemon = useMemo(() => {
    if (!allPokemon) return [];
    const seen = new Set<number>();
    return allPokemon
      .filter((p) => {
        if (p.id < 1 || p.id > 1025) return false;
        // Skip variants (megas, regionals, etc.) — they share baseSpeciesId with the original
        if (p.name.includes("-mega") || p.name.includes("-alola") || p.name.includes("-galar") || p.name.includes("-hisui") || p.name.includes("-paldea")) return false;
        // Deduplicate by id to handle any remaining duplicates
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      })
      .sort((a, b) => a.id - b.id);
  }, [allPokemon]);

  // Progress for the current dex/bucket: total species and how many are marked
  // "caught". Computed over the whole dex (not the filtered view) so the header
  // always reflects overall progress.
  const { caughtCount, totalCount } = useMemo(() => {
    if (selectedDex) {
      const entries = regionalEntries ?? [];
      return {
        caughtCount: entries.filter(
          (e) => marks[e.catchKey ?? String(e.nationalId)] === "caught"
        ).length,
        totalCount: entries.length,
      };
    }
    return {
      caughtCount: basePokemon.filter((p) => marks[String(p.id)] === "caught").length,
      totalCount: basePokemon.length,
    };
  }, [selectedDex, regionalEntries, basePokemon, marks]);
  const uncaughtCount = totalCount - caughtCount;

  // Group Pokemon by generation
  const pokemonByGen = useMemo(() => {
    const groups: Map<number, typeof basePokemon> = new Map();
    for (const gen of GENERATIONS) {
      groups.set(
        gen.id,
        basePokemon.filter((p) => p.id >= gen.pokemonRange.start && p.id <= gen.pokemonRange.end)
      );
    }
    return groups;
  }, [basePokemon]);

  // How many Pokemon match the current filters in the National view (used to
  // show an empty-state instead of a blank scroll area).
  const nationalMatchCount = useMemo(() => {
    let count = 0;
    for (const list of pokemonByGen.values()) {
      for (const p of list) {
        if (isHiddenByUncaught(String(p.id))) continue;
        if (matchesFilters(p.id, p.name, p.displayName)) count++;
      }
    }
    return count;
  }, [pokemonByGen, isHiddenByUncaught, matchesFilters]);

  // The max Pokemon ID enabled based on current generation
  const maxEnabledId = useMemo(() => {
    const gen = GENERATIONS.find((g) => g.id === globalGeneration);
    return gen?.pokemonRange.end ?? 1025;
  }, [globalGeneration]);

  const scrollToGen = useCallback((genId: number) => {
    const section = sectionRefs.current.get(genId);
    if (section && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const sectionTop = section.offsetTop - container.offsetTop;
      container.scrollTo({ top: sectionTop, behavior: "smooth" });
    }
  }, []);

  const handleGenClick = useCallback((genId: number) => {
    if (genId > globalGeneration) {
      setGeneration(genId);
    }
    scrollToGen(genId);
  }, [globalGeneration, setGeneration, scrollToGen]);

  const setSectionRef = useCallback((genId: number, node: HTMLDivElement | null) => {
    if (node) {
      sectionRefs.current.set(genId, node);
    } else {
      sectionRefs.current.delete(genId);
    }
  }, []);

  // A failed list fetch used to resolve to an empty grid with no message or retry;
  // now loading and error are distinct and recoverable.
  if (isLoading || isError) {
    return (
      <QueryState
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        loadingLabel="Loading Pokédex…"
      >
        {null}
      </QueryState>
    );
  }

  return (
    <div className="flex flex-col min-h-0 h-full">
      {/* Controls bar: dex selector · name search · type filter · caught/left
          counts · mark + uncaught toggles. Everything sits on one line on wider
          views; the flexible controls (dex select, name input) keep a usable
          min-width but are capped so they don't stretch past what's needed, and
          the whole row wraps onto multiple lines as the module narrows.
          justify-between makes each (wrapped) row span edge-to-edge so there's
          no empty trailing space when it wraps. */}
      <div className="mb-3 shrink-0 flex flex-wrap items-center justify-between gap-2">
        <select
          value={selectedDexId ?? "national"}
          onChange={(e) => {
            const v = e.target.value;
            setPokedexDex(moduleId, v === "national" ? null : parseInt(v, 10));
          }}
          className="flex-1 min-w-[180px] max-w-[280px] px-2 py-1.5 text-xs font-medium rounded bg-slate-800 border border-slate-700 text-slate-200 hover:border-slate-600 focus:outline-none focus:border-emerald-500"
        >
          <option value="national">National Dex (by Generation)</option>
          {dexGroups.map((group) => (
            <optgroup key={group.region} label={group.region}>
              {group.dexes.map((dex) => (
                <option key={dex.id} value={dex.id}>
                  {dex.displayName}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <div className="relative flex-1 min-w-[150px] max-w-[240px]">
          <input
            type="text"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            placeholder="Filter by name…"
            className="w-full px-2 py-1.5 pr-7 text-xs rounded bg-slate-800 border border-slate-700 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
          {nameFilter && (
            <button
              onClick={() => setNameFilter("")}
              className="absolute inset-y-0 right-0 px-2 flex items-center text-slate-500 hover:text-slate-300"
              title="Clear name filter"
              aria-label="Clear name filter"
            >
              ✕
            </button>
          )}
        </div>

        <div className="shrink-0 flex items-center gap-1.5">
          {typeFilter && (
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: TYPE_COLORS[typeFilter] }}
            />
          )}
          <select
            value={typeFilter ?? ""}
            onChange={(e) => setTypeFilter(e.target.value ? (e.target.value as PokemonTypeName) : null)}
            className="px-2 py-1.5 text-xs font-medium rounded bg-slate-800 border border-slate-700 text-slate-200 capitalize hover:border-slate-600 focus:outline-none focus:border-emerald-500"
            title="Filter by type"
          >
            <option value="">All types</option>
            {ALL_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
          {typeFilter && isTypeLoading && (
            <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-emerald-500 shrink-0" />
          )}
        </div>

        {/* Counts + toggles, kept together as the row wraps. */}
        <div className="shrink-0 flex items-center gap-2">
          {championsMode && <ChampionsRulesChip />}
          {totalCount > 0 && (
            <div className="shrink-0 text-xs text-slate-400 whitespace-nowrap">
              <span className="font-semibold text-emerald-400">{caughtCount}</span> caught
              <span className="mx-1.5 text-slate-600">·</span>
              <span className="font-semibold text-slate-200">{uncaughtCount}</span> left
            </div>
          )}

          <button
            onClick={() => setMarkMode((v) => !v)}
            aria-pressed={markMode}
            className={`shrink-0 flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded border transition-colors ${
              markMode
                ? "bg-emerald-600/20 border-emerald-500 text-emerald-300"
                : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
            }`}
            title={markMode
              ? "Mark mode on — tap a Pokémon to cycle caught / transit / clear. Tap here to turn off."
              : "Mark mode: tap Pokémon to mark them caught (touch-friendly alternative to right-click)"}
          >
            <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Mark
          </button>
          <button
            onClick={() => setShowUncaughtOnly((v) => !v)}
            className={`shrink-0 px-2 py-1.5 text-xs font-medium rounded border transition-colors ${
              showUncaughtOnly
                ? "bg-emerald-600/20 border-emerald-500 text-emerald-300"
                : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
            }`}
            title={showUncaughtOnly ? "Showing uncaught Pokemon only — click to show all" : "Show uncaught Pokemon only"}
          >
            Uncaught only
          </button>
        </div>
      </div>

      {markMode && (
        <div className="mb-2 shrink-0 rounded bg-emerald-600/10 border border-emerald-500/40 px-2.5 py-1.5 text-[11px] text-emerald-300">
          Mark mode: tap a Pokémon to cycle caught → transit → clear. Tapping won&apos;t open it.
        </div>
      )}

      {selectedDex ? (
        /* ===== Regional Dex View ===== */
        isRegionalLoading || isRegionalError || !regionalEntries ? (
          <QueryState
            isLoading={isRegionalLoading}
            isError={isRegionalError || !regionalEntries}
            onRetry={() => refetchRegional()}
            loadingLabel="Loading dex…"
            className="flex-1 min-h-0"
          >
            {null}
          </QueryState>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto rounded-lg">
            <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-sm px-2 py-1.5 mb-2">
              <h3 className="text-xs font-semibold text-slate-400">
                {selectedDex.displayName}
                <span className="ml-2 text-slate-500 font-normal">
                  {visibleRegionalEntries.length}{showUncaughtOnly ? " uncaught" : ""} Pokémon
                </span>
              </h3>
            </div>
            {visibleRegionalEntries.length === 0 && (
              <div className="py-10 text-center text-xs text-slate-500">
                No Pokémon match these filters.
              </div>
            )}
            <div className="grid gap-1 mb-3 [grid-template-columns:repeat(auto-fill,minmax(72px,1fr))] sm:[grid-template-columns:repeat(auto-fill,minmax(90px,1fr))]">
              {visibleRegionalEntries.map((entry) => {
                // Fall back to the base-species id so a missing catchKey (e.g. a
                // stale cached entry from before the field existed) can never
                // collapse every tile onto one shared `marks[undefined]` key.
                const catchKey = entry.catchKey ?? String(entry.nationalId);
                const mark = marks[catchKey];
                // In Champions mode, dim entries not usable in Champions.
                const champDim = championsMode && !isFormInChampions(catchKey);
                return (
                <button
                  key={`${entry.regionalNumber}-${entry.name}`}
                  onClick={() => {
                    if (markMode) { handleCycle(catchKey); return; }
                    addPokemonModule(entry.name, "evolution");
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleCycle(catchKey);
                  }}
                  className={`relative flex flex-col items-center p-1.5 rounded transition-colors ${markTileClasses(mark)} ${champDim ? "opacity-30 grayscale" : ""}`}
                  title={`${entry.displayName} — ${selectedDex.displayName} #${String(entry.regionalNumber).padStart(3, "0")} (Nat. #${String(entry.nationalId).padStart(3, "0")})${champDim ? " — not in Champions" : ""}${markTitleHint(mark)}`}
                >
                  <MarkBadge mark={mark} />
                  <Image
                    src={entry.spriteUrl}
                    alt={entry.displayName}
                    width={48}
                    height={48}
                    className="pixelated"
                    unoptimized
                  />
                  <span className="text-[10px] text-slate-500 leading-tight">
                    #{String(entry.regionalNumber).padStart(3, "0")}
                  </span>
                  <span className="text-[10px] text-slate-300 leading-tight truncate w-full text-center">
                    {entry.displayName}
                  </span>
                </button>
                );
              })}
            </div>
          </div>
        )
      ) : (
      <>
      {/* Generation Quick-Select Buttons */}
      <div className="flex flex-wrap gap-1.5 mb-3 shrink-0">
        {GENERATIONS.map((gen) => {
          const isEnabled = gen.id <= globalGeneration;
          return (
            <button
              key={gen.id}
              onClick={() => handleGenClick(gen.id)}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                isEnabled
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                  : "bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-slate-300"
              }`}
              title={`${gen.name} - ${gen.region}`}
            >
              {gen.shortName}
            </button>
          );
        })}
      </div>

      {/* Scrollable Pokemon Grid */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto rounded-lg"
      >
        {nationalMatchCount === 0 && (
          <div className="py-10 text-center text-xs text-slate-500">
            No Pokémon match these filters.
          </div>
        )}
        {GENERATIONS.map((gen) => {
          const allInGen = pokemonByGen.get(gen.id) || [];
          const pokemon = allInGen.filter((p) => {
            if (isHiddenByUncaught(String(p.id))) return false;
            return matchesFilters(p.id, p.name, p.displayName);
          });
          if (pokemon.length === 0) return null;

          return (
            <div
              key={gen.id}
              ref={(node) => setSectionRef(gen.id, node)}
            >
              {/* Generation Header */}
              <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-sm px-2 py-1.5 mb-2 mt-1 first:mt-0">
                <h3 className="text-xs font-semibold text-slate-400">
                  {gen.name} — {gen.region}
                  <span className="ml-2 text-slate-500 font-normal">
                    #{String(gen.pokemonRange.start).padStart(3, "0")}–#{String(gen.pokemonRange.end).padStart(3, "0")}
                  </span>
                </h3>
              </div>

              {/* Pokemon Grid */}
              <div className="grid gap-1 mb-3 [grid-template-columns:repeat(auto-fill,minmax(72px,1fr))] sm:[grid-template-columns:repeat(auto-fill,minmax(90px,1fr))]">
                {pokemon.map((pkmn) => {
                  const isEnabled = pkmn.id <= maxEnabledId;
                  const mark = marks[String(pkmn.id)];
                  // In Champions mode, dim species not in the Champions roster.
                  const champDim = championsMode && !isSpeciesInChampions(pkmn.id);
                  return (
                    <button
                      key={pkmn.name}
                      onClick={() => {
                        if (markMode) { handleCycle(String(pkmn.id)); return; }
                        if (isEnabled) {
                          addPokemonModule(pkmn.name, "evolution");
                        } else {
                          // Find which generation this Pokemon belongs to and switch
                          const pkmnGen = GENERATIONS.find(
                            (g) => pkmn.id >= g.pokemonRange.start && pkmn.id <= g.pokemonRange.end
                          );
                          if (pkmnGen) {
                            setGeneration(pkmnGen.id);
                          }
                        }
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        handleCycle(String(pkmn.id));
                      }}
                      className={`relative flex flex-col items-center p-1.5 rounded transition-colors ${markTileClasses(mark)} ${isEnabled ? "" : "opacity-30 grayscale cursor-pointer"} ${champDim ? "opacity-30 grayscale" : ""}`}
                      title={`${pkmn.displayName} #${String(pkmn.id).padStart(3, "0")}${champDim ? " — not in Champions" : ""}${markTitleHint(mark)}`}
                    >
                      <MarkBadge mark={mark} />
                      <Image
                        src={getSpriteUrl(pkmn.id)}
                        alt={pkmn.displayName}
                        width={48}
                        height={48}
                        className="pixelated"
                        unoptimized
                      />
                      <span className="text-[10px] text-slate-500 leading-tight">
                        #{String(pkmn.id).padStart(3, "0")}
                      </span>
                      <span className="text-[10px] text-slate-300 leading-tight truncate w-full text-center">
                        {pkmn.displayName}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      </>
      )}
    </div>
  );
}

/** Tile styling for each catch mark; unmarked tiles keep the plain hover. */
function markTileClasses(mark: CatchMark | undefined): string {
  if (mark === "caught") {
    return "bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/60 hover:bg-emerald-500/20";
  }
  if (mark === "transit") {
    return "bg-amber-500/10 ring-1 ring-inset ring-amber-500/60 hover:bg-amber-500/20";
  }
  return "hover:bg-slate-800";
}

/** Tooltip suffix describing the current mark and what right-click does next. */
function markTitleHint(mark: CatchMark | undefined): string {
  if (mark === "caught") return " — Caught (right-click or Mark mode to change)";
  if (mark === "transit") return " — In transit: owned elsewhere, waiting to move (right-click or Mark mode to change)";
  return " — Right-click or use Mark mode to mark caught";
}

/**
 * Small mark indicator shown in the corner of a Pokemon tile.
 * Clear but unobtrusive: an emerald check for caught, an amber arrow for a
 * Pokemon in transit (owned elsewhere, waiting to be moved in).
 */
function MarkBadge({ mark }: { mark: CatchMark | undefined }) {
  if (!mark) return null;
  const isCaught = mark === "caught";
  return (
    <span
      className={`absolute top-0.5 right-0.5 z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full shadow ring-1 ring-slate-900 ${
        isCaught ? "bg-emerald-500" : "bg-amber-500"
      }`}
    >
      <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.5}>
        {isCaught ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h13m0 0l-5-5m5 5l-5 5" />
        )}
      </svg>
    </span>
  );
}
