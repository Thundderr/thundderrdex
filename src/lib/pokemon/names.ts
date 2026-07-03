import { Dex } from "@pkmn/dex";
import { toAppSpecies } from "@/lib/competitive/sources";

/**
 * The app uses PokéAPI slugs (basculegion-male, tapu-koko); Showdown/Smogon and
 * @smogon/calc / @smogon/sets use display names (Basculegion, Tapu Koko). @pkmn/dex
 * bridges most of the gap, EXCEPT these classes it can't map from a PokéAPI slug.
 * Verified against @pkmn/dex + PokéAPI. Used in BOTH directions (see names for reverse).
 */
export const FORM_OVERRIDES: { pokeapi: string; showdown: string }[] = [
  { pokeapi: "basculegion-male", showdown: "Basculegion" },
  { pokeapi: "basculegion-female", showdown: "Basculegion-F" },
  { pokeapi: "indeedee-male", showdown: "Indeedee" },
  { pokeapi: "indeedee-female", showdown: "Indeedee-F" },
  { pokeapi: "oinkologne-male", showdown: "Oinkologne" },
  { pokeapi: "oinkologne-female", showdown: "Oinkologne-F" },
  { pokeapi: "meowstic-male", showdown: "Meowstic" },
  { pokeapi: "meowstic-female", showdown: "Meowstic-F" },
  { pokeapi: "maushold-family-of-four", showdown: "Maushold" },
  { pokeapi: "tauros-paldea-combat-breed", showdown: "Tauros-Paldea-Combat" },
  { pokeapi: "tauros-paldea-blaze-breed", showdown: "Tauros-Paldea-Blaze" },
  { pokeapi: "tauros-paldea-aqua-breed", showdown: "Tauros-Paldea-Aqua" },
];

const OVERRIDE_BY_POKEAPI = new Map(FORM_OVERRIDES.map((o) => [o.pokeapi, o.showdown]));

/**
 * Resolve any input name (PokéAPI slug, Showdown display, or usage key) to its
 * Showdown display name. `resolved` is false when nothing matched a real species
 * (caller may surface this). The fallback string is a best-effort title-ish form.
 */
export function resolveShowdown(name: string): { showdownName: string; resolved: boolean } {
  // Explicit override first (handles gendered/tauros/maushold PokéAPI slugs @pkmn misses).
  const override = OVERRIDE_BY_POKEAPI.get(name);
  if (override) return { showdownName: override, resolved: true };

  const direct = Dex.species.get(name);
  if (direct?.exists) return { showdownName: direct.name, resolved: true };

  // -male → bare base, -female → "-f" (Showdown convention) for anything not overridden.
  if (/-male$/.test(name)) {
    const s = Dex.species.get(name.replace(/-male$/, ""));
    if (s?.exists) return { showdownName: s.name, resolved: true };
  }
  if (/-female$/.test(name)) {
    const s = Dex.species.get(name.replace(/-female$/, "-f"));
    if (s?.exists) return { showdownName: s.name, resolved: true };
  }

  // Cosmetic forms @pkmn/dex doesn't know by full slug (e.g. maushold-family-of-four):
  // strip trailing segments until a species resolves.
  const parts = name.split("-");
  for (let i = parts.length - 1; i >= 1; i--) {
    const s = Dex.species.get(parts.slice(0, i).join("-"));
    if (s?.exists) return { showdownName: s.name, resolved: true };
  }

  // Unresolved: return a readable fallback but flag it.
  const fallback = name
    .split(/[\s-]+/)
    .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p))
    .join(" ");
  return { showdownName: fallback, resolved: false };
}

/** Showdown display name — the key for @smogon/calc and @smogon/sets. */
export function toShowdownName(name: string): string {
  return resolveShowdown(name).showdownName;
}

/** Smogon usage `species` key = toAppSpecies of the Showdown display name. */
export function toUsageSpecies(name: string): string {
  const { showdownName, resolved } = resolveShowdown(name);
  return resolved ? toAppSpecies(showdownName) : toAppSpecies(name);
}
