"use client";

import { useState } from "react";
import { useCompetitiveFormatStore } from "@/stores/competitiveFormatStore";
import { useUsageStats } from "@/hooks/useUsageStats";

const TOP_N = 12;

/**
 * Collapsible "current top threats" preview for the selected competitive format.
 * Lazy: usage data is only fetched once expanded (it's a ~600 KB proxied
 * payload), and re-fetched when the format switches. Doubles as a live check
 * that the whole usage pipeline works end-to-end.
 */
export function FormatMetaPeek() {
  const format = useCompetitiveFormatStore((s) => s.format);
  const [open, setOpen] = useState(false);
  const { data, isLoading, isError, error } = useUsageStats(open ? format : null);

  const top = data?.entries.slice(0, TOP_N) ?? [];
  const maxPct = top[0]?.usagePct ?? 100;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs font-medium text-indigo-300 hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-expanded={open}
      >
        {open ? "▾" : "▸"} Peek at the meta
      </button>

      {open && (
        <div className="mt-2">
          {isLoading && <p className="text-2xs text-fg-subtle">Loading usage data…</p>}
          {isError && (
            <p className="text-2xs text-red-300">
              Couldn&apos;t load usage: {(error as Error)?.message ?? "unknown error"}
            </p>
          )}
          {data && (
            <>
              <p className="mb-1.5 text-2xs text-fg-subtle">
                Top {top.length} of {data.entries.length} · {data.battles.toLocaleString()} battles ·{" "}
                {data.month}
              </p>
              <ul className="flex flex-col gap-1">
                {top.map((e) => (
                  <li key={e.species} className="flex items-center gap-2">
                    <span className="w-28 flex-shrink-0 truncate text-2xs text-fg">{e.name}</span>
                    <span className="relative h-3 flex-1 overflow-hidden rounded bg-surface">
                      <span
                        className="absolute inset-y-0 left-0 rounded bg-indigo-600/70"
                        style={{ width: `${(e.usagePct / maxPct) * 100}%` }}
                      />
                    </span>
                    <span className="w-10 flex-shrink-0 text-right text-2xs tabular-nums text-fg-muted">
                      {e.usagePct.toFixed(1)}%
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
