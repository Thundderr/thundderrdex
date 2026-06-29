"use client";

import { COMPETITIVE_FORMAT_LIST } from "@/lib/competitive/formats";
import { useCompetitiveFormatStore } from "@/stores/competitiveFormatStore";

/**
 * Segmented control for the active competitive format. Reads/writes the
 * competitiveFormatStore and renders every registered format, so it lights up
 * automatically as future Champions regulations are added. Reusable anywhere.
 */
export function CompetitiveFormatSelector({ className = "" }: { className?: string }) {
  const format = useCompetitiveFormatStore((s) => s.format);
  const setFormat = useCompetitiveFormatStore((s) => s.setFormat);

  return (
    <div
      role="group"
      aria-label="Competitive format"
      className={`inline-flex overflow-hidden rounded-md border border-line ${className}`}
    >
      {COMPETITIVE_FORMAT_LIST.map((f) => {
        const active = f.id === format;
        return (
          <button
            key={f.id}
            onClick={() => setFormat(f.id)}
            aria-pressed={active}
            className={`px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              active ? "bg-indigo-600 text-white" : "bg-surface-raised text-fg-muted hover:bg-surface-hover"
            }`}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
