"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { usePokemonList } from "@/hooks/usePokemonList";
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

  const { data: pokemonList, isLoading } = usePokemonList();

  const filteredResults = useMemo(() => {
    if (!query || !pokemonList) return [];

    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return [];

    return pokemonList
      .filter(
        (p) =>
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
          {filteredResults.map((pokemon, index) => (
            <li
              key={pokemon.id}
              onMouseEnter={() => setHighlightedIndex(index)}
              onClick={() => handleSelect(pokemon.name)}
              className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                index === highlightedIndex
                  ? "bg-slate-700"
                  : "hover:bg-slate-700/50"
              }`}
            >
              <Image
                src={pokemon.spriteUrl}
                alt=""
                width={32}
                height={32}
                className="pixelated"
                unoptimized
              />
              <span className="text-white">{pokemon.displayName}</span>
              <span className="text-slate-400 text-sm ml-auto">
                #{pokemon.id}
              </span>
            </li>
          ))}
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
