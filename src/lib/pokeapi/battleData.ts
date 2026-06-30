/**
 * Battle data (move + ability detail) resolved from the offline `@pkmn/dex`
 * package instead of fanning out to PokéAPI's `/move/{id}` and `/ability/{id}`
 * endpoints. `@pkmn/dex` wraps Showdown's data, so it's instant, needs no
 * network, and is immune to PokéAPI rate limits. Wording differs slightly from
 * PokéAPI (Showdown's shortDesc), but the canonical stats (type, power,
 * accuracy, pp, priority, category) are identical.
 *
 * PokéAPI stays the source for the *learnset structure* (which moves, by what
 * method/level/generation) and for sprites/flavor/encounters — see transformers.
 */
import { Dex } from "@pkmn/dex";
import type { Move, DamageClass } from "@/types/moves";
import type { PokemonTypeName } from "@/types/pokemon";

// Gen 9 carries the most current values; `.get()` normalizes ids internally
// ("focus-blast" / "focusblast" both resolve), so callers can pass PokéAPI kebab.
const gen = Dex.forGen(9);

const FALLBACK_DESC = "No description available.";

/**
 * App-facing `Move` for a PokéAPI move id, resolved from `@pkmn/dex`. Returns
 * null when the id isn't a real move (caller skips it, same as a failed fetch).
 * `name` keeps the passed PokéAPI-style id so the rest of the app keys on it
 * unchanged; `displayName` comes from Showdown.
 */
export function moveFromDex(id: string): Move | null {
  const m = gen.moves.get(id);
  if (!m || !m.exists) return null;
  return {
    id: m.num,
    name: id,
    displayName: m.name,
    type: m.type.toLowerCase() as PokemonTypeName,
    damageClass: m.category.toLowerCase() as DamageClass,
    // Showdown uses 0 base power for status/variable-power moves and `true`
    // accuracy for never-miss moves; map both to null to match PokéAPI's shape.
    power: m.basePower > 0 ? m.basePower : null,
    accuracy: m.accuracy === true ? null : m.accuracy,
    pp: m.pp,
    description: m.shortDesc || m.desc || FALLBACK_DESC,
    priority: m.priority,
  };
}

/** A PokéAPI ability id's description, resolved from `@pkmn/dex`. */
export function abilityDescriptionFromDex(id: string): string {
  const a = gen.abilities.get(id);
  if (!a || !a.exists) return FALLBACK_DESC;
  return a.shortDesc || a.desc || FALLBACK_DESC;
}
