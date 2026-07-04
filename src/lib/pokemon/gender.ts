import { Dex } from "@pkmn/dex";
import { toPokeApiName } from "@/lib/pokemon/names";
import type { Pokemon } from "@/types/pokemon";

/** App ids of the distinct-gender base species (a @pkmn base with a "-F" otherForme). */
export const DISTINCT_MALE_IDS: Set<string> = (() => {
  const gen = Dex.forGen(9);
  const ids = gen.species
    .all()
    .filter(
      (s) =>
        s.exists &&
        s.forme === "" &&
        (s.otherFormes ?? []).some((f) => {
          const fs = gen.species.get(f);
          return fs.exists && fs.forme === "F";
        })
    )
    .map((s) => toPokeApiName(s.name).pokeApiName);
  return new Set(ids);
})();

export type GenderState =
  | { kind: "distinct"; maleId: string; femaleId: string } // the "-male"/"-female" slugs to fetch
  | { kind: "cosmetic"; maleId: string; femaleSprite: string }; // the front_female sprite URL

/**
 * Whether a mon has a gender toggle, and how. Distinct-gender species swap the
 * whole mon (different data); cosmetic-gender species (any mon with a
 * front_female sprite) swap only the sprite.
 *
 * The id may already be the "-female" side (a distinct mon toggled to female,
 * e.g. in the damage calc where the picked slug carries the state): normalize it
 * back to the "-male" base so the state stays symmetric and the toggle can flip
 * back. `pokemon` is looked up under the passed id only, so cosmetic detection is
 * unaffected by this normalization.
 */
export function genderState(id: string, pokemon: Pokemon | undefined): GenderState | null {
  const maleId = id.endsWith("-female") ? id.replace(/-female$/, "-male") : id;
  if (DISTINCT_MALE_IDS.has(maleId)) {
    return { kind: "distinct", maleId, femaleId: maleId.replace(/-male$/, "-female") };
  }
  if (pokemon?.sprites.front_female) {
    return { kind: "cosmetic", maleId: id, femaleSprite: pokemon.sprites.front_female };
  }
  return null;
}
