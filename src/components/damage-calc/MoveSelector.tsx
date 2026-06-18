"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useModuleStore } from "@/stores/moduleStore";
import { useGenerationStore } from "@/stores/generationStore";
import { useLearnset } from "@/hooks/useLearnset";
import { Move } from "@/types/moves";
import { TypeBadge } from "@/components/type-chart/TypeBadge";

interface Props {
  moduleId: string;
  attackerName: string | null;
  selectedMove: string | null;
}

// Category icon matching LearnsetTable
function DamageClassIcon({ damageClass }: { damageClass: string }) {
  const config = {
    physical: { color: "bg-orange-600", label: "P" },
    special: { color: "bg-blue-600", label: "S" },
    status: { color: "bg-slate-600", label: "-" },
  }[damageClass] ?? { color: "bg-slate-600", label: "?" };

  return (
    <span
      className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-white flex-shrink-0 ${config.color}`}
      title={damageClass}
    >
      {config.label}
    </span>
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
      // +1 to account for the header row
      const item = listRef.current.children[highlightedIndex + 1] as HTMLElement;
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
        <div className="bg-slate-800 rounded-lg relative">
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
              className="absolute z-50 w-[320px] max-w-[calc(100vw-1rem)] left-0 bottom-full mb-1 max-h-[320px] overflow-auto border border-slate-700 rounded bg-slate-800 shadow-xl"
            >
              {/* Header row */}
              <li className="flex items-center gap-1 px-2 py-1.5 text-[9px] text-slate-500 border-b border-slate-700 bg-slate-800/95 sticky top-0">
                <span className="w-[115px] flex-shrink-0">Move</span>
                <span className="w-[52px] text-center flex-shrink-0">Type</span>
                <span className="w-5 text-center flex-shrink-0">Cat</span>
                <span className="flex-1 text-right">Pwr</span>
                <span className="w-6 text-right flex-shrink-0">Acc</span>
                <span className="w-5 text-right flex-shrink-0">PP</span>
              </li>
              {filteredMoves.map((move, index) => (
                <li
                  key={move.name}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => handleSelect(move.name)}
                  className={`px-2 py-1.5 cursor-pointer ${
                    index === highlightedIndex
                      ? "bg-slate-700"
                      : "hover:bg-slate-700/50"
                  }`}
                >
                  {/* Main stats row */}
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="w-[115px] text-white flex-shrink-0">
                      {move.displayName}
                    </span>
                    <span className="w-[52px] flex justify-center flex-shrink-0">
                      <TypeBadge type={move.type} size="xs" fixedWidth />
                    </span>
                    <span className="w-5 flex justify-center flex-shrink-0">
                      <DamageClassIcon damageClass={move.damageClass} />
                    </span>
                    <span className="flex-1 text-right text-slate-300 font-mono text-[10px]">
                      {move.power ?? "-"}
                    </span>
                    <span className="w-6 text-right text-slate-300 font-mono text-[10px] flex-shrink-0">
                      {move.accuracy ?? "-"}
                    </span>
                    <span className="w-5 text-right text-slate-400 font-mono text-[10px] flex-shrink-0">
                      {move.pp}
                    </span>
                  </div>
                  {/* Effect description row */}
                  {move.description && (
                    <div className="mt-0.5 text-[9px] text-slate-400 line-clamp-2 leading-tight">
                      {move.description}
                    </div>
                  )}
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
          <TypeBadge type={selectedMoveData.type} size="xs" fixedWidth />
          <DamageClassIcon damageClass={selectedMoveData.damageClass} />
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
