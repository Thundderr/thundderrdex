"use client";

import { useState, useCallback } from "react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeybindsModal } from "./KeybindsModal";

interface Props {
  children: React.ReactNode;
}

export function KeyboardShortcutsProvider({ children }: Props) {
  const [isKeybindsOpen, setIsKeybindsOpen] = useState(false);

  const openKeybinds = useCallback(() => {
    setIsKeybindsOpen(true);
  }, []);

  // Initialize keyboard shortcuts with callback
  useKeyboardShortcuts({ onOpenKeybinds: openKeybinds });

  return (
    <>
      {children}
      <KeybindsModal isOpen={isKeybindsOpen} onClose={() => setIsKeybindsOpen(false)} />

      {/* Info button - fixed position */}
      <button
        onClick={() => setIsKeybindsOpen(true)}
        className="fixed bottom-4 right-4 z-40 p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full shadow-lg border border-slate-700 transition-colors"
        title="Keyboard shortcuts"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    </>
  );
}
