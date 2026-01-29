"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { usePokemonList } from "@/hooks/usePokemonList";
import { useGenerationStore } from "@/stores/generationStore";
import { isMegaPokemon, isRegionalVariant, getRegionalVariantInfo } from "@/lib/utils/generationConfig";
import Image from "next/image";

interface Props {
  onSelect: (name: string) => void;
  currentPokemon: string | null;
}

export function SearchBar({ onSelect, currentPokemon }: Props) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const { globalGeneration, setGeneration } = useGenerationStore();
  const { data: pokemonList, isLoading } = usePokemonList();

  // Get generation range for any Pokemon (including Megas and Regional Variants)
  const getPokemonGenerationRange = (pokemonName: string, pokedexId: number): { minGen: number; maxGen: number | null } => {
    if (isMegaPokemon(pokemonName)) {
      return { minGen: 6, maxGen: 7 };
    }
    const regionalInfo = getRegionalVariantInfo(pokemonName);
    if (regionalInfo) {
      return { minGen: regionalInfo.minGeneration, maxGen: null };
    }
    // Regular Pokemon - use Pokedex ID ranges
    if (pokedexId <= 151) return { minGen: 1, maxGen: null };
    if (pokedexId <= 251) return { minGen: 2, maxGen: null };
    if (pokedexId <= 386) return { minGen: 3, maxGen: null };
    if (pokedexId <= 493) return { minGen: 4, maxGen: null };
    if (pokedexId <= 649) return { minGen: 5, maxGen: null };
    if (pokedexId <= 721) return { minGen: 6, maxGen: null };
    if (pokedexId <= 809) return { minGen: 7, maxGen: null };
    if (pokedexId <= 905) return { minGen: 8, maxGen: null };
    return { minGen: 9, maxGen: null };
  };

  const filteredResults = useMemo(() => {
    if (!query || !pokemonList) return [];

    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return [];

    return pokemonList
      .filter((p) =>
        p.name.includes(lowerQuery) ||
        p.displayName.toLowerCase().includes(lowerQuery) ||
        p.id.toString() === lowerQuery
      )
      .slice(0, 10)
      .sort((a, b) => {
        // Prioritize starts-with matches
        const aStarts = a.name.startsWith(lowerQuery);
        const bStarts = b.name.startsWith(lowerQuery);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.id - b.id;
      });
  }, [query, pokemonList]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((i) =>
          Math.min(i + 1, filteredResults.length - 1)
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredResults[highlightedIndex]) {
          handleSelect(filteredResults[highlightedIndex].name);
        }
        break;
      case "Escape":
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelect = (name: string) => {
    onSelect(name);
    setQuery("");
    setIsOpen(false);
    setHighlightedIndex(0);
  };

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current && filteredResults.length > 0) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex, filteredResults.length]);

  return (
    <div className="relative">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={
            currentPokemon
              ? `Current: ${currentPokemon}`
              : isLoading
                ? "Loading Pokemon..."
                : "Search Pokemon..."
          }
          className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
      </div>

      {isOpen && filteredResults.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-80 overflow-auto"
        >
          {filteredResults.map((pokemon, index) => {
            const { minGen, maxGen } = getPokemonGenerationRange(pokemon.name, pokemon.id);
            const existsInGen = globalGeneration >= minGen && (maxGen === null || globalGeneration <= maxGen);

            return (
              <li
                key={pokemon.name}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => existsInGen && handleSelect(pokemon.name)}
                className={`flex items-center gap-3 px-3 py-2 transition-colors ${
                  index === highlightedIndex
                    ? "bg-slate-700"
                    : "hover:bg-slate-700/50"
                } ${!existsInGen ? "cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div className="relative flex-shrink-0">
                  <Image
                    src={pokemon.spriteUrl}
                    alt=""
                    width={32}
                    height={32}
                    className={`pixelated ${!existsInGen ? "opacity-40 grayscale" : ""}`}
                    unoptimized
                  />
                  {!existsInGen && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-full h-0.5 bg-red-500 rotate-[-20deg]" />
                    </div>
                  )}
                </div>
                <span className={`${existsInGen ? "text-white" : "text-slate-500 line-through"}`}>
                  {pokemon.displayName}
                </span>
                <span className="text-slate-400 text-sm ml-auto">
                  #{pokemon.id}
                </span>
                {!existsInGen && (
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setGeneration(minGen);
                    }}
                    className="px-1.5 py-0.5 text-[10px] bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
                    title={`Switch to Gen ${minGen}${maxGen ? `-${maxGen}` : ""}`}
                  >
                    Gen {minGen}{maxGen ? `-${maxGen}` : ""}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {isOpen && query && filteredResults.length === 0 && !isLoading && (
        <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-4 text-center text-slate-400">
          No Pokemon found
        </div>
      )}
    </div>
  );
}
