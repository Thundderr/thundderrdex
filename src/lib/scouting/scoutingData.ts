import { Dex } from "@pkmn/dex";
import { toAppSpecies } from "@/lib/competitive/sources";
import type { SlimUsageEntry, SpreadOption, UsageDataset } from "@/lib/competitive/types";

/**
 * Convert a PokéAPI app name (from usePokemonList / SearchBar) into the app
 * kebab species id that Smogon usage data is keyed by (`toAppSpecies` of the
 * Showdown display name).
 *
 * PokéAPI and Showdown/Smogon disagree on form naming. `@pkmn/dex` resolves most
 * of the divergence (e.g. "urshifu-single-strike" → Urshifu, "tornadus-incarnate"
 * → Tornadus, "raichu-alola" → Raichu-Alola), but it does NOT alias PokéAPI's
 * gendered "-male"/"-female" suffixes, which Showdown keys as the bare species
 * (male) or a "-F" suffix (female). We handle those, then fall back to stripping
 * trailing cosmetic-form segments, then to plain normalization.
 */
export function toUsageSpecies(pokemonName: string): string {
  const direct = Dex.species.get(pokemonName);
  if (direct?.exists) return toAppSpecies(direct.name);

  if (/-male$/.test(pokemonName)) {
    const s = Dex.species.get(pokemonName.replace(/-male$/, ""));
    if (s?.exists) return toAppSpecies(s.name);
  }
  if (/-female$/.test(pokemonName)) {
    const s = Dex.species.get(pokemonName.replace(/-female$/, "-f"));
    if (s?.exists) return toAppSpecies(s.name);
  }

  // Cosmetic forms @pkmn/dex doesn't recognize by their full PokéAPI name
  // (e.g. "maushold-family-of-four"): strip trailing segments until a species
  // resolves. Only reached after direct + gender lookups fail, so the remaining
  // stat-differing forms have already been handled — the base is the right key.
  const parts = pokemonName.split("-");
  for (let i = parts.length - 1; i >= 1; i--) {
    const s = Dex.species.get(parts.slice(0, i).join("-"));
    if (s?.exists) return toAppSpecies(s.name);
  }

  return toAppSpecies(pokemonName);
}

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
  const species = toUsageSpecies(pokemonName);
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
