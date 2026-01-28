"use client";

import { useGenerationStore } from "@/stores/generationStore";
import { useState, useEffect } from "react";

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

export function GenerationSelector() {
  const { globalGeneration, setGeneration } = useGenerationStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const currentGen = isMounted ? globalGeneration : 9;

  return (
    <div className="flex items-center gap-1">
      {GENERATION_CONFIG.map((config) => {
        const isSelected = config.gen === currentGen;
        return (
          <button
            key={config.gen}
            onClick={() => setGeneration(config.gen)}
            className={`
              relative px-1.5 py-1 rounded transition-all text-xs font-bold
              ${isSelected
                ? "bg-slate-800 ring-2 ring-blue-500"
                : "bg-slate-800 hover:bg-slate-700"
              }
            `}
            title={`Gen ${config.gen}: ${config.letters.map(l => l.title).join("/")} (Shift+${config.gen})`}
          >
            <span className="flex items-center">
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
            </span>
          </button>
        );
      })}
    </div>
  );
}
