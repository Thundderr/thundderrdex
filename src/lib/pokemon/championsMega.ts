import { Dex } from "@pkmn/dex";

/**
 * A new Pokémon Champions Mega Evolution — one that does not exist in the
 * mainline games (and therefore has no PokéAPI entry). Derived from @pkmn/dex,
 * which tags these as isNonstandard "Future" (mainline megas are "Past").
 */
export interface ChampionsMega {
  /** App id = lowercased Showdown name, e.g. "pyroar-mega", "raichu-mega-x". */
  id: string;
  name: string; // same as id (the searchable key)
  displayName: string; // "Mega Pyroar", "Mega Raichu X"
  baseNum: number; // base species national dex number (sprite fallback)
  baseSpecies: string; // "Pyroar"
  changesFrom: string; // pre-mega form, e.g. "Pyroar" or "Floette-Eternal"
  stone: string; // mega stone item, e.g. "Pyroarite"
  abilities: string[]; // ability display names, e.g. ["Rivalry","Unnerve","Moxie"]
  types: string[]; // lowercase type ids, e.g. ["fire","normal"]
}

function displayName(baseSpecies: string, forme: string): string {
  const suffix = forme === "Mega" ? "" : ` ${forme.replace("Mega-", "")}`;
  return `Mega ${baseSpecies}${suffix}`;
}

let cache: ChampionsMega[] | null = null;

export function getChampionsMegas(): ChampionsMega[] {
  if (cache) return cache;
  const gen = Dex.forGen(9);
  cache = gen.species
    .all()
    .filter((s) => s.exists && s.isMega === true && s.isNonstandard === "Future")
    .map((s) => ({
      id: s.name.toLowerCase(),
      name: s.name.toLowerCase(),
      displayName: displayName(s.baseSpecies, s.forme),
      baseNum: s.num,
      baseSpecies: s.baseSpecies,
      changesFrom: s.changesFrom ?? s.baseSpecies,
      stone: s.requiredItem ?? "",
      abilities: [...new Set(Object.values(s.abilities))] as string[],
      types: s.types.map((t) => t.toLowerCase()),
    }));
  return cache;
}

const idSet = new Set(getChampionsMegas().map((m) => m.id));

export function isChampionsMega(name: string): boolean {
  return idSet.has(name.toLowerCase());
}
