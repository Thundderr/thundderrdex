import { Dex } from "@pkmn/dex";
import { TYPE_COLORS } from "@/data/typeChart";
import { getChampionsMegaSpriteUrl } from "@/lib/pokeapi/client";
import type { Pokemon, PokemonType, PokemonTypeName } from "@/types/pokemon";
import { getChampionsMegas } from "./championsMega";

const byName = new Map(getChampionsMegas().map((m) => [m.name, m]));

/**
 * Build the app's `Pokemon` shape for a Champions Mega from @pkmn/dex, since
 * PokéAPI has no entry. Synchronous (no fetch). Caller guards with isChampionsMega.
 */
export function transformDexSpecies(name: string): Pokemon {
  const meta = byName.get(name.toLowerCase());
  const s = Dex.forGen(9).species.get(name);
  if (!meta || !s.exists) throw new Error(`Not a Champions mega: ${name}`);

  const types: PokemonType[] = meta.types.map((t) => ({
    name: t as PokemonTypeName,
    color: TYPE_COLORS[t as PokemonTypeName] ?? "#888888",
  }));

  const bs = s.baseStats;
  const total = bs.hp + bs.atk + bs.def + bs.spa + bs.spd + bs.spe;

  const abilities = Object.entries(s.abilities).map(([slot, value]) => ({
    name: String(value).toLowerCase().replace(/\s+/g, "-"),
    displayName: String(value),
    description: "",
    isHidden: slot === "H",
  }));

  return {
    id: meta.baseNum,
    name: meta.name,
    displayName: meta.displayName,
    types,
    stats: {
      hp: bs.hp, attack: bs.atk, defense: bs.def,
      specialAttack: bs.spa, specialDefense: bs.spd, speed: bs.spe, total,
    },
    abilities,
    sprites: {
      front_default: getChampionsMegaSpriteUrl(meta.name),
      front_shiny: null,
      official_artwork: null,
    },
    generation: 9,
    pastTypes: [],
    pastAbilities: [],
  };
}
