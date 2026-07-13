// Shown in modules whose mechanic has no Champions equivalent (Champions is a
// PvP battle format with no wild encounters, catching, or EV training). The
// module keeps working on standard Gen 9 data — this just sets expectations.
export function ChampionsNotApplicableBanner({ feature }: { feature: string }) {
  return (
    <div className="mb-3 shrink-0 rounded border border-amber-500/40 bg-amber-400/10 px-2.5 py-1.5 text-[11px] text-amber-300">
      Champions is a PvP battle format — no {feature}. Showing standard Gen 9 data.
    </div>
  );
}
