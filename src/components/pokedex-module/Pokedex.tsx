"use client";

import { useRef, useMemo, useCallback, useState } from "react";
import Image from "next/image";
import { usePokemonList } from "@/hooks/usePokemonList";
import { usePokedex } from "@/hooks/usePokedex";
import { usePokemonOfType } from "@/hooks/usePokemonOfType";
import { useGenerationStore } from "@/stores/generationStore";
import { useModuleStore } from "@/stores/moduleStore";
import { useCaughtStore, CatchMark, NATIONAL_BUCKET } from "@/stores/caughtStore";
import { GENERATIONS } from "@/data/generations";
import { getRegionalDexGroups, getRegionalDexById } from "@/data/pokedexes";
import { getSpriteUrl } from "@/lib/pokeapi/client";
import { ALL_TYPES, TYPE_COLORS } from "@/data/typeChart";
import type { PokemonTypeName } from "@/types/pokemon";

interface PokedexProps {
  moduleId: string;
  // null/undefined = National dex (generation-grouped view). A number = a regional dex id.
  selectedDexId?: number | null;
}

export function Pokedex({ moduleId, selectedDexId: selectedDexIdProp }: PokedexProps) {
  const { data: allPokemon, isLoading } = usePokemonList();
  const { globalGeneration, setGeneration } = useGenerationStore();
  const { addPokemonModule, setPokedexDex } = useModuleStore();
  const caught = useCaughtStore((s) => s.caught);
  const cycleCaught = useCaughtStore((s) => s.cycleCaught);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Selected dex lives on the module in the store so it survives refreshes
  const selectedDexId = selectedDexIdProp ?? null;
  // When on, tiles marked "caught" are hidden (unmarked and not-caught stay visible)
  const [showUncaughtOnly, setShowUncaughtOnly] = useState(false);
  // Top-bar filters: free-text name match and a single type.
  const [nameFilter, setNameFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<PokemonTypeName | null>(null);
  const { data: typeIds, isLoading: isTypeLoading } = usePokemonOfType(typeFilter);
  const dexGroups = useMemo(() => getRegionalDexGroups(), []);
  const selectedDex = selectedDexId !== null ? getRegionalDexById(selectedDexId) : undefined;
  const { data: regionalEntries, isLoading: isRegionalLoading } = usePokedex(selectedDexId);

  // Each dex tracks its own catch marks: the National view uses the "national"
  // bucket; a regional dex uses its region group (so e.g. all Paldea-region
  // dexes share one bucket, separate from Galar, Hisui, and National).
  const bucketKey = selectedDex ? selectedDex.group : NATIONAL_BUCKET;
  const marks = useMemo(() => caught[bucketKey] ?? {}, [caught, bucketKey]);

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
      if (showUncaughtOnly && marks[e.catchKey ?? String(e.nationalId)] === "caught") return false;
      return matchesFilters(e.nationalId, e.name, e.displayName);
    });
  }, [regionalEntries, showUncaughtOnly, marks, matchesFilters]);

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
        if (showUncaughtOnly && marks[String(p.id)] === "caught") continue;
        if (matchesFilters(p.id, p.name, p.displayName)) count++;
      }
    }
    return count;
  }, [pokemonByGen, showUncaughtOnly, marks, matchesFilters]);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0 h-full">
      {/* Top bar: dex selector (left) · caught/uncaught counts (middle) · uncaught filter (right) */}
      <div className="mb-3 shrink-0 flex items-center gap-2">
        <select
          value={selectedDexId ?? "national"}
          onChange={(e) => {
            const v = e.target.value;
            setPokedexDex(moduleId, v === "national" ? null : parseInt(v, 10));
          }}
          className="shrink-0 max-w-full sm:max-w-[40%] min-w-0 px-2 py-1.5 text-xs font-medium rounded bg-slate-800 border border-slate-700 text-slate-200 hover:border-slate-600 focus:outline-none focus:border-emerald-500"
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

        {totalCount > 0 && (
          <div className="flex-1 min-w-0 text-center text-xs text-slate-400 truncate">
            <span className="font-semibold text-emerald-400">{caughtCount}</span> caught
            <span className="mx-1.5 text-slate-600">·</span>
            <span className="font-semibold text-slate-200">{uncaughtCount}</span> left
          </div>
        )}

        <button
          onClick={() => setShowUncaughtOnly((v) => !v)}
          className={`shrink-0 ml-auto px-2 py-1.5 text-xs font-medium rounded border transition-colors ${
            showUncaughtOnly
              ? "bg-emerald-600/20 border-emerald-500 text-emerald-300"
              : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
          }`}
          title={showUncaughtOnly ? "Showing uncaught Pokemon only — click to show all" : "Show uncaught Pokemon only"}
        >
          Uncaught only
        </button>
      </div>

      {/* Filter bar: search by name · filter by type */}
      <div className="mb-3 shrink-0 flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative flex-1 min-w-0">
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
              <option key={t} value={t} className="capitalize">
                {t}
              </option>
            ))}
          </select>
          {typeFilter && isTypeLoading && (
            <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-emerald-500 shrink-0" />
          )}
        </div>
      </div>

      {selectedDex ? (
        /* ===== Regional Dex View ===== */
        isRegionalLoading || !regionalEntries ? (
          <div className="flex flex-1 min-h-0 items-center justify-center text-slate-400">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500" />
          </div>
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
                return (
                <button
                  key={`${entry.regionalNumber}-${entry.name}`}
                  onClick={() => addPokemonModule(entry.name, "evolution")}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    cycleCaught(bucketKey, catchKey);
                  }}
                  className={`relative flex flex-col items-center p-1.5 rounded transition-colors ${markTileClasses(mark)}`}
                  title={`${entry.displayName} — ${selectedDex.displayName} #${String(entry.regionalNumber).padStart(3, "0")} (Nat. #${String(entry.nationalId).padStart(3, "0")})${markTitleHint(mark)}`}
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
            if (showUncaughtOnly && marks[String(p.id)] === "caught") return false;
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
                  return (
                    <button
                      key={pkmn.name}
                      onClick={() => {
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
                        cycleCaught(bucketKey, String(pkmn.id));
                      }}
                      className={`relative flex flex-col items-center p-1.5 rounded transition-colors ${markTileClasses(mark)} ${isEnabled ? "" : "opacity-30 grayscale cursor-pointer"}`}
                      title={`${pkmn.displayName} #${String(pkmn.id).padStart(3, "0")}${markTitleHint(mark)}`}
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
  if (mark === "not-caught") {
    return "bg-rose-500/10 ring-1 ring-inset ring-rose-500/60 hover:bg-rose-500/20";
  }
  return "hover:bg-slate-800";
}

/** Tooltip suffix describing the current mark and what right-click does next. */
function markTitleHint(mark: CatchMark | undefined): string {
  if (mark === "caught") return " — Caught (right-click to mark not caught)";
  if (mark === "not-caught") return " — Not caught (right-click to clear)";
  return " — Right-click to mark caught";
}

/**
 * Small mark indicator shown in the corner of a Pokemon tile.
 * Clear but unobtrusive: an emerald check for caught, a rose X for not caught.
 */
function MarkBadge({ mark }: { mark: CatchMark | undefined }) {
  if (!mark) return null;
  const isCaught = mark === "caught";
  return (
    <span
      className={`absolute top-0.5 right-0.5 z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full shadow ring-1 ring-slate-900 ${
        isCaught ? "bg-emerald-500" : "bg-rose-500"
      }`}
    >
      <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.5}>
        {isCaught ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
        )}
      </svg>
    </span>
  );
}
