import { Dex } from "@pkmn/dex";
import { toPokeApiName } from "@/lib/pokemon/names";
import { isChampionsMega } from "@/lib/pokemon/championsMega";

/** A searchable Pokémon/form, derived from @pkmn/dex (source of truth for forms). */
export interface RosterEntry {
  id: string;           // app id / fetch key = PokéAPI slug (or @pkmn id fallback)
  displayName: string;  // @pkmn plain name: "Landorus", "Landorus-Therian"
  num: number;          // national dex number
  baseSpecies: string;
  forme: string;        // "" for the base form
  showdownName: string; // @pkmn display name (sprite + calc key)
  isChampionsMega: boolean;
}

let cache: RosterEntry[] | null = null;

export function getRoster(): RosterEntry[] {
  if (cache) return cache;
  const gen = Dex.forGen(9);
  const all = gen.species.all();
  const allByName = new Map(all.map((s) => [s.name, s]));

  // Build cosmetic exclusion set:
  // 1. Forms explicitly listed in a species's cosmeticFormes array.
  // 2. Forms in otherFormes with no battle-relevant difference (no changesFrom, battleOnly,
  //    requiredItem/Move/Ability, and identical stats/abilities/types to their base species).
  //    This catches Vivillon-Fancy/Pokeball, Pikachu cap forms, etc. that @pkmn/dex does
  //    not tag as cosmetic despite being purely cosmetic event/regional variants.
  const cosmetic = new Set<string>();
  for (const s of all) {
    for (const c of s.cosmeticFormes ?? []) cosmetic.add(c);
    for (const formeName of s.otherFormes ?? []) {
      if (cosmetic.has(formeName)) continue;
      const forme = allByName.get(formeName);
      if (!forme?.exists) continue;
      const battleDiff =
        forme.changesFrom ||
        forme.battleOnly ||
        forme.requiredItem ||
        (forme.requiredItems && forme.requiredItems.length > 0) ||
        forme.requiredMove ||
        forme.requiredAbility ||
        JSON.stringify(s.baseStats) !== JSON.stringify(forme.baseStats) ||
        JSON.stringify(s.abilities) !== JSON.stringify(forme.abilities) ||
        JSON.stringify(s.types) !== JSON.stringify(forme.types);
      if (!battleDiff) cosmetic.add(formeName);
    }
  }

  const seen = new Set<string>();
  const out: RosterEntry[] = [];
  for (const s of all) {
    if (!s.exists) continue;
    if (s.isNonstandard === "CAP") continue;
    if (/-Gmax$|-Totem$/.test(s.name) || /Gmax|Totem/.test(s.forme)) continue;
    if (s.forme === "F" || s.forme === "M") continue; // gender → Phase 2
    if (cosmetic.has(s.name)) continue;

    const id = toPokeApiName(s.name).pokeApiName;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      displayName: s.name,
      num: s.num,
      baseSpecies: s.baseSpecies,
      forme: s.forme,
      showdownName: s.name,
      isChampionsMega: isChampionsMega(id),
    });
  }
  cache = out;
  return out;
}

const idSet = new Set(getRoster().map((e) => e.id));

export function isAppPokemon(id: string): boolean {
  return idSet.has(id.toLowerCase());
}
