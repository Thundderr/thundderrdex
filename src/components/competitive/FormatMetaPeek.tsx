"use client";

import { useState } from "react";
import { useCompetitiveFormatStore } from "@/stores/competitiveFormatStore";
import { useUsageStats } from "@/hooks/useUsageStats";
import { useTournamentTeams } from "@/hooks/useTournamentTeams";

const TOP_N = 12;
const TEAMS_TOP_N = 6;

/**
 * Collapsible previews for the selected competitive format:
 *  - "Peek at the meta": Smogon usage % (ladder aggregate).
 *  - "Real tournament teams": actual top human teams + win rates from the
 *    latest Limitless event (data Smogon usage can't give).
 * Both are lazy — data is only fetched once its section is expanded, and
 * re-fetched when the format switches.
 */
export function FormatMetaPeek() {
  const format = useCompetitiveFormatStore((s) => s.format);
  const [open, setOpen] = useState(false);
  const [teamsOpen, setTeamsOpen] = useState(false);
  const { data, isLoading, isError, error } = useUsageStats(open ? format : null);
  const teams = useTournamentTeams(teamsOpen ? format : null);

  const top = data?.entries.slice(0, TOP_N) ?? [];
  const maxPct = top[0]?.usagePct ?? 100;
  const topTeams = teams.data?.teams.slice(0, TEAMS_TOP_N) ?? [];

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

      <button
        onClick={() => setTeamsOpen((o) => !o)}
        className="mt-1 block text-xs font-medium text-indigo-300 hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-expanded={teamsOpen}
      >
        {teamsOpen ? "▾" : "▸"} Real tournament teams
      </button>

      {teamsOpen && (
        <div className="mt-2">
          {teams.isLoading && (
            <p className="text-2xs text-fg-subtle">Loading tournament teams…</p>
          )}
          {teams.isError && (
            <p className="text-2xs text-red-300">
              Couldn&apos;t load teams: {(teams.error as Error)?.message ?? "unknown error"}
            </p>
          )}
          {teams.data && topTeams.length === 0 && (
            <p className="text-2xs text-fg-subtle">No published team sheets yet.</p>
          )}
          {teams.data && topTeams.length > 0 && (
            <>
              <p className="mb-1.5 text-2xs text-fg-subtle">
                {teams.data.tournamentName} · {teams.data.date} ·{" "}
                {teams.data.players.toLocaleString()} players
              </p>
              <ul className="flex flex-col gap-1.5">
                {topTeams.map((t) => (
                  <li key={`${t.placing}-${t.player}`}>
                    <div className="flex items-center gap-2 text-2xs">
                      <span className="w-7 flex-shrink-0 tabular-nums text-fg-muted">
                        #{t.placing}
                      </span>
                      <span className="flex-1 truncate text-fg">{t.player}</span>
                      <span className="flex-shrink-0 tabular-nums text-indigo-300">
                        {Math.round(t.winPct)}% W
                      </span>
                    </div>
                    <p className="truncate pl-7 text-2xs text-fg-subtle">
                      {t.mons.map((m) => m.name).join(" · ")}
                    </p>
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
