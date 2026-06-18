"use client";

import { useGenerationStore } from "@/stores/generationStore";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { clampLeftToViewport, POPOVER_MAXW } from "@/lib/utils/popoverPosition";

// Estimated rendered width of the collapsed-mode dropdown (whitespace-nowrap items, px-2 py-1 text-xs font-bold).
const MENU_WIDTH = 160;

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
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const positionMenu = () => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setMenuPos({ top: r.bottom + 4, left: r.left });
  };

  // Close the dropdown on outside click; keep it anchored on scroll/resize.
  useEffect(() => {
    if (!dropdownOpen) return;
    const handlePointer = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setDropdownOpen(false);
    };
    const handleReposition = () => positionMenu();
    document.addEventListener("mousedown", handlePointer);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [dropdownOpen]);

  const currentGen = isMounted ? globalGeneration : 9;
  const currentConfig = GENERATION_CONFIG.find((c) => c.gen === currentGen) ?? GENERATION_CONFIG[GENERATION_CONFIG.length - 1];

  // Collapsed: show only the current generation as a button that opens a vertical dropdown.
  if (collapsible && isMounted && selectorCollapsed) {
    return (
      <div className="flex items-center gap-1">
        <button
          ref={triggerRef}
          onClick={() => {
            setDropdownOpen((o) => {
              if (!o) positionMenu();
              return !o;
            });
          }}
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
        {dropdownOpen && menuPos && createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", top: menuPos.top, left: clampLeftToViewport(menuPos.left, MENU_WIDTH) }}
            className={`flex flex-col gap-1 bg-slate-900 border border-slate-700 rounded-lg p-1 shadow-xl z-[100] ${POPOVER_MAXW}`}
          >
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
          </div>,
          document.body
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
