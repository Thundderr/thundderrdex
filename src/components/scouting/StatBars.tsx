import { PokemonStats } from "@/types/pokemon";

const ROWS: [keyof Omit<PokemonStats, "total">, string][] = [
  ["hp", "HP"],
  ["attack", "Atk"],
  ["defense", "Def"],
  ["specialAttack", "SpA"],
  ["specialDefense", "SpD"],
  ["speed", "Spe"],
];

// Bars are scaled against a fixed reference so columns are visually comparable.
const BAR_MAX = 200;

export function StatBars({ stats }: { stats: PokemonStats }) {
  return (
    <div className="space-y-1">
      {ROWS.map(([key, label]) => {
        const val = stats[key];
        const pct = Math.min(100, (val / BAR_MAX) * 100);
        return (
          <div key={key} className="flex items-center gap-1.5 text-2xs">
            <span className="w-7 shrink-0 text-fg-subtle">{label}</span>
            <span className="w-6 shrink-0 text-right tabular-nums text-fg-muted">{val}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded bg-surface-hover">
              <div className="h-full rounded bg-accent" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
      <div className="flex justify-between pt-0.5 text-2xs text-fg-subtle">
        <span>Total</span>
        <span className="tabular-nums">{stats.total}</span>
      </div>
    </div>
  );
}
