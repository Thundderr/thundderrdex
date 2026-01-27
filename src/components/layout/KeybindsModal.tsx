"use client";

import { useEffect, useRef } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const GLOBAL_SHORTCUTS = [
  { key: "Shift + T", description: "New tab" },
  { key: "Shift + X", description: "Close current tab" },
  { key: "Shift + P", description: "New Pokemon module" },
  { key: "Shift + C", description: "New Type Chart module" },
  { key: "Shift + B", description: "New Team Builder module" },
  { key: "Shift + I", description: "Show keyboard shortcuts" },
  { key: "[", description: "Previous tab" },
  { key: "]", description: "Next tab" },
  { key: "←", description: "Previous module" },
  { key: "→", description: "Next module" },
];

const MODULE_SHORTCUTS = [
  { key: "Shift + W", description: "Close selected module" },
  { key: "Shift + S", description: "Stats tab" },
  { key: "Shift + A", description: "Abilities tab" },
  { key: "Shift + D", description: "Defenses tab" },
  { key: "Shift + M", description: "Moves tab" },
];

export function KeybindsModal({ isOpen, onClose }: Props) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={modalRef}
        className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Global Shortcuts */}
          <div>
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">
              Global
            </h3>
            <div className="space-y-1">
              {GLOBAL_SHORTCUTS.map((shortcut) => (
                <div key={shortcut.key} className="flex items-center justify-between py-1">
                  <span className="text-sm text-slate-300">{shortcut.description}</span>
                  <kbd className="px-2 py-1 text-xs font-mono bg-slate-700 text-slate-200 rounded border border-slate-600">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Module Shortcuts */}
          <div>
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">
              Selected Module
            </h3>
            <div className="space-y-1">
              {MODULE_SHORTCUTS.map((shortcut) => (
                <div key={shortcut.key} className="flex items-center justify-between py-1">
                  <span className="text-sm text-slate-300">{shortcut.description}</span>
                  <kbd className="px-2 py-1 text-xs font-mono bg-slate-700 text-slate-200 rounded border border-slate-600">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Click on a module to select it. Selected modules have a blue outline.
        </p>
      </div>
    </div>
  );
}
