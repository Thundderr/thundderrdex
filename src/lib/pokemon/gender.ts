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

export interface GenderState {
  kind: "distinct" | "cosmetic";
  maleId: string;
  femaleId?: string;     // distinct: the "-female" slug to re-fetch
  femaleSprite?: string; // cosmetic: the front_female sprite URL
}

/**
 * Whether a mon has a gender toggle, and how. Distinct-gender species swap the
 * whole mon (different data); cosmetic-gender species (any mon with a
 * front_female sprite) swap only the sprite.
 */
export function genderState(id: string, pokemon: Pokemon | undefined): GenderState | null {
  if (DISTINCT_MALE_IDS.has(id)) {
    return { kind: "distinct", maleId: id, femaleId: id.replace(/-male$/, "-female") };
  }
  if (pokemon?.sprites.front_female) {
    return { kind: "cosmetic", maleId: id, femaleSprite: pokemon.sprites.front_female };
  }
  return null;
}
