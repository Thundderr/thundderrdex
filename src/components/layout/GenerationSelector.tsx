"use client";

import { useGenerationStore } from "@/stores/generationStore";
import { useState, useEffect, useRef } from "react";

// Game colors for each letter (lightened for dark background readability)
const GENERATION_CONFIG = [
  {
    gen: 1,
    letters: [
      { char: "R", color: "#FF4444", title: "Red" },
      { char: "B", color: "#5C7CFA", title: "Blue" },
      { char: "Y", color: "#FFE066", title: "Yellow" },
    ],
  },
  {
    gen: 2,
    letters: [
      { char: "G", color: "#FFD700", title: "Gold" },
      { char: "S", color: "#D0D0D0", title: "Silver" },
      { char: "C", color: "#66E0FF", title: "Crystal" },
    ],
  },
  {
    gen: 3,
    letters: [
      { char: "R", color: "#E53935", title: "Ruby" },
      { char: "S", color: "#5C6BC0", title: "Sapphire" },
      { char: "E", color: "#66BB6A", title: "Emerald" },
    ],
  },
  {
    gen: 4,
    letters: [
      { char: "D", color: "#90CAF9", title: "Diamond" },
      { char: "P", color: "#F8BBD9", title: "Pearl" },
      { char: "Pt", color: "#B0B0B0", title: "Platinum" },
    ],
  },
  {
    gen: 5,
    letters: [
      { char: "B", color: "#78909C", title: "Black" },
      { char: "W", color: "#FAFAFA", title: "White" },
    ],
  },
  {
    gen: 6,
    letters: [
      { char: "X", color: "#42A5F5", title: "X" },
      { char: "Y", color: "#EF5350", title: "Y" },
    ],
  },
  {
    gen: 7,
    letters: [
      { char: "S", color: "#FFA726", title: "Sun" },
      { char: "M", color: "#7986CB", title: "Moon" },
    ],
  },
  {
    gen: 8,
    letters: [
      { char: "Sw", color: "#29B6F6", title: "Sword" },
      { char: "Sh", color: "#EC407A", title: "Shield" },
    ],
  },
  {
    gen: 9,
    letters: [
      { char: "S", color: "#EF5350", title: "Scarlet" },
      { char: "V", color: "#AB47BC", title: "Violet" },
    ],
  },
];

function GenLetters({ config }: { config: typeof GENERATION_CONFIG[number] }) {
  return (
    <>
      {config.letters.map((letter, i) => (
        <span
          key={i}
          style={{
            color: letter.color,
            textShadow: letter.color === "#FAFAFA" || letter.color === "#D0D0D0"
              ? "0 0 2px rgba(0,0,0,0.8)"
              : "none"
          }}
        >
          {letter.char}
        </span>
      ))}
    </>
  );
}

export function GenerationSelector({ stretch = false, collapsible = false }: { stretch?: boolean; collapsible?: boolean }) {
  const { globalGeneration, setGeneration, selectorCollapsed, setSelectorCollapsed } = useGenerationStore();
  const [isMounted, setIsMounted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Close the dropdown when clicking outside of it.
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  const currentGen = isMounted ? globalGeneration : 9;
  const currentConfig = GENERATION_CONFIG.find((c) => c.gen === currentGen) ?? GENERATION_CONFIG[GENERATION_CONFIG.length - 1];

  // Collapsed: show only the current generation as a button that opens a vertical dropdown.
  if (collapsible && isMounted && selectorCollapsed) {
    return (
      <div className="relative flex items-center gap-1" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((o) => !o)}
          className="relative px-1.5 py-1 rounded transition-all text-xs font-bold bg-slate-800 ring-2 ring-blue-500"
          title={`Gen ${currentGen}: ${currentConfig.letters.map((l) => l.title).join("/")} — click to change`}
        >
          <span className="flex items-center">
            <GenLetters config={currentConfig} />
          </span>
        </button>
        <button
          onClick={() => {
            setSelectorCollapsed(false);
            setDropdownOpen(false);
          }}
          className="flex items-center justify-center w-5 h-6 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          title="Expand generation selector"
          aria-label="Expand generation selector"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        {dropdownOpen && (
          <div className="absolute top-full left-0 mt-1 flex flex-col gap-1 bg-slate-900 border border-slate-700 rounded-lg p-1 shadow-xl z-50">
            {GENERATION_CONFIG.map((config) => {
              const isSelected = config.gen === currentGen;
              return (
                <button
                  key={config.gen}
                  onClick={() => {
                    setGeneration(config.gen);
                    setDropdownOpen(false);
                  }}
                  className={`
                    px-2 py-1 rounded transition-all text-xs font-bold text-left whitespace-nowrap
                    ${isSelected
                      ? "bg-slate-800 ring-2 ring-blue-500"
                      : "bg-slate-800 hover:bg-slate-700"
                    }
                  `}
                  title={`Gen ${config.gen}: ${config.letters.map((l) => l.title).join("/")} (Shift+${config.gen})`}
                >
                  <span className="flex items-center">
                    <GenLetters config={config} />
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`group flex items-center gap-1 ${stretch ? "w-full" : ""}`}>
      {GENERATION_CONFIG.map((config) => {
        const isSelected = config.gen === currentGen;
        return (
          <button
            key={config.gen}
            onClick={() => setGeneration(config.gen)}
            className={`
              relative px-1.5 py-1 rounded transition-all text-xs font-bold ${stretch ? "flex-1 text-center" : ""}
              ${isSelected
                ? "bg-slate-800 ring-2 ring-blue-500"
                : "bg-slate-800 hover:bg-slate-700"
              }
            `}
            title={`Gen ${config.gen}: ${config.letters.map(l => l.title).join("/")} (Shift+${config.gen})`}
          >
            <span className={`flex items-center ${stretch ? "justify-center" : ""}`}>
              <GenLetters config={config} />
            </span>
          </button>
        );
      })}
      {collapsible && (
        <button
          onClick={() => setSelectorCollapsed(true)}
          className="flex-shrink-0 flex items-center justify-center w-5 h-6 rounded text-slate-400 hover:text-white hover:bg-slate-700 opacity-30 group-hover:opacity-100 transition-all"
          title="Minimize generation selector"
          aria-label="Minimize generation selector"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}
    </div>
  );
}
