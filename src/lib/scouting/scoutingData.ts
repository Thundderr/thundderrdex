import { toAppSpecies } from "@/lib/competitive/sources";
import type { SlimUsageEntry, SpreadOption, UsageDataset } from "@/lib/competitive/types";

/**
 * Find a Pokémon's usage entry by its app name (as produced by usePokemonList /
 * SearchBar). Returns null when the dataset is absent or the species isn't in the
 * slimmed usage list — the caller shows a "no usage data" fallback in that case.
 */
export function findUsageEntry(
  dataset: UsageDataset | null | undefined,
  pokemonName: string | null
): SlimUsageEntry | null {
  if (!dataset || !pokemonName) return null;
  const species = toAppSpecies(pokemonName);
  return dataset.entries.find((e) => e.species === species) ?? null;
}

const EV_LABELS: [keyof SpreadOption["evs"], string][] = [
  ["hp", "HP"],
  ["atk", "Atk"],
  ["def", "Def"],
  ["spa", "SpA"],
  ["spd", "SpD"],
  ["spe", "Spe"],
];

/** Compact human EV spread, e.g. "Adamant · 252 Atk / 252 Spe / 4 HP". */
export function formatEvSpread(spread: SpreadOption): string {
  const parts = EV_LABELS.filter(([k]) => spread.evs[k] > 0)
    .sort((a, b) => spread.evs[b[0]] - spread.evs[a[0]])
    .map(([k, label]) => `${spread.evs[k]} ${label}`);
  return parts.length ? `${spread.nature} · ${parts.join(" / ")}` : spread.nature;
}
