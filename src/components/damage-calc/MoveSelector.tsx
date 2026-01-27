"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useModuleStore } from "@/stores/moduleStore";
import { useGenerationStore } from "@/stores/generationStore";
import { useLearnset } from "@/hooks/useLearnset";
import { Move } from "@/types/moves";
import { TYPE_COLORS } from "@/data/typeChart";

interface Props {
  moduleId: string;
  attackerName: string | null;
  selectedMove: string | null;
}

// Category icons
function CategoryIcon({ category }: { category: string }) {
  if (category === "physical") {
    return (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="8" fill="#C92112" stroke="#F08030" strokeWidth="2" />
      </svg>
    );
  }
  if (category === "special") {
    return (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="8" fill="#4F5870" stroke="#9DB7F5" strokeWidth="2" />
      </svg>
    );
  }
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="8" fill="#8C888C" stroke="#A8A8A8" strokeWidth="2" />
    </svg>
  );
}

export function MoveSelector({ moduleId, attackerName, selectedMove }: Props) {
  const { setDamageCalcMove } = useModuleStore();
  const { globalGeneration } = useGenerationStore();
  const { data: learnset, isLoading, error } = useLearnset(attackerName);

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Filter moves by generation and remove duplicates, only show damaging moves
  const availableMoves = useMemo(() => {
    if (!learnset) return [];

    const seenMoves = new Set<string>();
    const filteredMoves: Move[] = [];

    for (const entry of learnset) {
      if (entry.generation > globalGeneration) continue;
      if (seenMoves.has(entry.move.name)) continue;
      // Only include moves with power (damaging moves)
      if (entry.move.power === null || entry.move.power === 0) continue;

      seenMoves.add(entry.move.name);
      filteredMoves.push(entry.move);
    }

    // Sort by power (descending), then name
    return filteredMoves.sort((a, b) => {
      const powerA = a.power || 0;
      const powerB = b.power || 0;
      if (powerB !== powerA) return powerB - powerA;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [learnset, globalGeneration]);

  // Get selected move data
  const selectedMoveData = useMemo(() => {
    if (!selectedMove || !learnset) return null;
    const entry = learnset.find((e) => e.move.name === selectedMove);
    return entry?.move || null;
  }, [selectedMove, learnset]);

  // Filter by search query
  const filteredMoves = useMemo(() => {
    if (!query) return availableMoves;
    const lowerQuery = query.toLowerCase();
    return availableMoves.filter(
      (move) =>
        move.displayName.toLowerCase().includes(lowerQuery) ||
        move.type.toLowerCase().includes(lowerQuery)
    );
  }, [availableMoves, query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, filteredMoves.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredMoves[highlightedIndex]) {
          handleSelect(filteredMoves[highlightedIndex].name);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setQuery("");
        break;
    }
  };

  const handleSelect = (moveName: string) => {
    setDamageCalcMove(moduleId, moveName);
    setIsOpen(false);
    setQuery("");
    setHighlightedIndex(0);
  };

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  useEffect(() => {
    if (listRef.current && filteredMoves.length > 0) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex, filteredMoves.length]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  if (!attackerName) {
    return (
      <div className="bg-slate-800 rounded-lg p-3 text-center text-slate-500 text-sm">
        Select an attacker first
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-slate-800 rounded-lg p-3 text-center text-slate-500 text-sm">
        Loading moves...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800 rounded-lg p-3 text-center text-red-400 text-sm">
        Failed to load moves
      </div>
    );
  }

  return (
    <div className="relative">
      {isOpen ? (
        <div className="bg-slate-800 rounded-lg">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onBlur={() =>
              setTimeout(() => {
                setIsOpen(false);
                setQuery("");
              }, 200)
            }
            onKeyDown={handleKeyDown}
            placeholder="Search moves..."
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
            autoFocus
          />
          {filteredMoves.length > 0 && (
            <ul
              ref={listRef}
              className="mt-1 max-h-48 overflow-auto border border-slate-700 rounded"
            >
              {filteredMoves.map((move, index) => (
                <li
                  key={move.name}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => handleSelect(move.name)}
                  className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer ${
                    index === highlightedIndex
                      ? "bg-slate-700"
                      : "hover:bg-slate-700/50"
                  }`}
                >
                  <span
                    className="px-1.5 py-0.5 text-[9px] rounded text-white flex-shrink-0"
                    style={{ backgroundColor: TYPE_COLORS[move.type] }}
                  >
                    {move.type.slice(0, 3).toUpperCase()}
                  </span>
                  <CategoryIcon category={move.damageClass} />
                  <span className="flex-1 text-sm text-white truncate">
                    {move.displayName}
                  </span>
                  <span className="text-xs text-slate-400">
                    {move.power || "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {filteredMoves.length === 0 && query && (
            <div className="p-3 text-center text-slate-500 text-sm">
              No moves found
            </div>
          )}
        </div>
      ) : selectedMoveData ? (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full bg-slate-800 rounded-lg p-3 flex items-center gap-2 hover:bg-slate-700 transition-colors text-left"
        >
          <span
            className="px-2 py-0.5 text-[10px] rounded text-white flex-shrink-0"
            style={{ backgroundColor: TYPE_COLORS[selectedMoveData.type] }}
          >
            {selectedMoveData.type.toUpperCase()}
          </span>
          <CategoryIcon category={selectedMoveData.damageClass} />
          <span className="flex-1 text-sm text-white">
            {selectedMoveData.displayName}
          </span>
          <span className="text-xs text-slate-400">
            {selectedMoveData.power} BP
          </span>
          <svg
            className="w-4 h-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full bg-slate-800 rounded-lg p-3 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span className="text-sm">Select Move</span>
        </button>
      )}
    </div>
  );
}
