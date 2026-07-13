// Compact, reusable indicator that Champions mode is active, with the format
// rules in its tooltip. Shown across modules where the Champions battle format
// is relevant (Pokédex, species view, damage calc, team builder).
export const CHAMPIONS_RULES =
  "Champions format: Level 50 · 31 IVs · 66 SP (max 32 per stat, 1 SP = 8 EVs) · " +
  "Doubles, bring 6 pick 4 · Species & Item Clause · one Mega Evolution per battle.";

export function ChampionsRulesChip({ className = "" }: { className?: string }) {
  return (
    <span
      title={CHAMPIONS_RULES}
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-2xs font-bold text-amber-300 bg-amber-400/10 ring-1 ring-inset ring-amber-400/40 whitespace-nowrap ${className}`}
    >
      <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M5 3h14a1 1 0 0 1 1 1v2a4 4 0 0 1-3 3.87A5 5 0 0 1 13 13v3h2a1 1 0 0 1 1 1v2h-8v-2a1 1 0 0 1 1-1h2v-3a5 5 0 0 1-4-3.13A4 4 0 0 1 4 6V4a1 1 0 0 1 1-1Z" />
      </svg>
      Champions
    </span>
  );
}
