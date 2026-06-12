"use client";

import { useRef, useMemo, useCallback, useState } from "react";
import Image from "next/image";
import { usePokemonList } from "@/hooks/usePokemonList";
import { usePokedex } from "@/hooks/usePokedex";
import { useGenerationStore } from "@/stores/generationStore";
import { useModuleStore } from "@/stores/moduleStore";
import { GENERATIONS } from "@/data/generations";
import { getRegionalDexGroups, getRegionalDexById } from "@/data/pokedexes";
import { getSpriteUrl } from "@/lib/pokeapi/client";

export function Pokedex() {
  const { data: allPokemon, isLoading } = usePokemonList();
  const { globalGeneration, setGeneration } = useGenerationStore();
  const { addPokemonModule } = useModuleStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // null = National dex (generation-grouped view). A number = a regional dex id.
  const [selectedDexId, setSelectedDexId] = useState<number | null>(null);
  const dexGroups = useMemo(() => getRegionalDexGroups(), []);
  const selectedDex = selectedDexId !== null ? getRegionalDexById(selectedDexId) : undefined;
  const { data: regionalEntries, isLoading: isRegionalLoading } = usePokedex(selectedDexId);

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
      {/* Dex Selector: National (generation-grouped) or a regional dex */}
      <div className="mb-3 shrink-0">
        <select
          value={selectedDexId ?? "national"}
          onChange={(e) => {
            const v = e.target.value;
            setSelectedDexId(v === "national" ? null : parseInt(v, 10));
          }}
          className="w-full px-2 py-1.5 text-xs font-medium rounded bg-slate-800 border border-slate-700 text-slate-200 hover:border-slate-600 focus:outline-none focus:border-emerald-500"
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
      </div>

      {selectedDex ? (
        /* ===== Regional Dex View ===== */
        isRegionalLoading || !regionalEntries ? (
          <div className="flex flex-1 min-h-0 items-center justify-center text-slate-400">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500" />
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto rounded-lg">
            <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm px-2 py-1.5 mb-2">
              <h3 className="text-xs font-semibold text-slate-400">
                {selectedDex.displayName}
                <span className="ml-2 text-slate-500 font-normal">
                  {regionalEntries.length} Pokémon
                </span>
              </h3>
            </div>
            <div className="grid gap-1 mb-3 [grid-template-columns:repeat(auto-fill,minmax(90px,1fr))]">
              {regionalEntries.map((entry) => (
                <button
                  key={`${entry.regionalNumber}-${entry.name}`}
                  onClick={() => addPokemonModule(entry.name)}
                  className="flex flex-col items-center p-1.5 rounded hover:bg-slate-800 transition-colors"
                  title={`${entry.displayName} — ${selectedDex.displayName} #${String(entry.regionalNumber).padStart(3, "0")} (Nat. #${String(entry.nationalId).padStart(3, "0")})`}
                >
                  <Image
                    src={getSpriteUrl(entry.nationalId)}
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
              ))}
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
        {GENERATIONS.map((gen) => {
          const pokemon = pokemonByGen.get(gen.id) || [];
          if (pokemon.length === 0) return null;

          return (
            <div
              key={gen.id}
              ref={(node) => setSectionRef(gen.id, node)}
            >
              {/* Generation Header */}
              <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm px-2 py-1.5 mb-2 mt-1 first:mt-0">
                <h3 className="text-xs font-semibold text-slate-400">
                  {gen.name} — {gen.region}
                  <span className="ml-2 text-slate-500 font-normal">
                    #{String(gen.pokemonRange.start).padStart(3, "0")}–#{String(gen.pokemonRange.end).padStart(3, "0")}
                  </span>
                </h3>
              </div>

              {/* Pokemon Grid */}
              <div className="grid gap-1 mb-3 [grid-template-columns:repeat(auto-fill,minmax(90px,1fr))]">
                {pokemon.map((pkmn) => {
                  const isEnabled = pkmn.id <= maxEnabledId;
                  return (
                    <button
                      key={pkmn.name}
                      onClick={() => {
                        if (isEnabled) {
                          addPokemonModule(pkmn.name);
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
                      className={`flex flex-col items-center p-1.5 rounded hover:bg-slate-800 transition-colors ${
                        isEnabled ? "" : "opacity-30 grayscale cursor-pointer"
                      }`}
                      title={`${pkmn.displayName} #${String(pkmn.id).padStart(3, "0")}`}
                    >
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
