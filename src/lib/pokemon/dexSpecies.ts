import { Dex } from "@pkmn/dex";
import { TYPE_COLORS } from "@/data/typeChart";
import { getShowdownSpriteUrl } from "@/lib/pokeapi/client";
import type { Pokemon, PokemonType, PokemonTypeName } from "@/types/pokemon";

/**
 * Build the app's `Pokemon` shape from @pkmn/dex for any species/form. Used as
 * the fallback when PokéAPI has no entry for a form (Champions megas and other
 * @pkmn-only forms). Synchronous. `showdownName` is a @pkmn display name.
 */
export function transformDexSpecies(showdownName: string): Pokemon {
  const s = Dex.forGen(9).species.get(showdownName);
  if (!s.exists) throw new Error(`Unknown species: ${showdownName}`);

  const types: PokemonType[] = s.types.map((t) => {
    const name = t.toLowerCase() as PokemonTypeName;
    return { name, color: TYPE_COLORS[name] ?? "#888888" };
  });

  const bs = s.baseStats;
  const total = bs.hp + bs.atk + bs.def + bs.spa + bs.spd + bs.spe;

  const abilities = Object.entries(s.abilities).map(([slot, value]) => ({
    name: String(value).toLowerCase().replace(/\s+/g, "-"),
    displayName: String(value),
    description: "",
    isHidden: slot === "H",
  }));

  return {
    id: s.num,
    name: s.name.toLowerCase(),
    displayName: s.name,
    types,
    stats: {
      hp: bs.hp, attack: bs.atk, defense: bs.def,
      specialAttack: bs.spa, specialDefense: bs.spd, speed: bs.spe, total,
    },
    abilities,
    sprites: {
      front_default: getShowdownSpriteUrl(s.name.toLowerCase()),
      front_shiny: null,
      official_artwork: null,
    },
    generation: 9,
    pastTypes: [],
    pastAbilities: [],
  };
}
