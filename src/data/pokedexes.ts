/**
 * Regional Pokédex definitions, sourced from PokeAPI's /pokedex/{id} endpoint.
 *
 * Each regional dex maps a per-game `entry_number` (the regional number, e.g.
 * Kitakami #001 = Spinarak) to a national species. The national dex is handled
 * separately by the generation-grouped view; these are the alternate, per-region
 * numberings selectable from the Pokédex module dropdown.
 *
 * `id` is the PokeAPI pokedex id. `group` is the region heading used for the
 * dropdown's <optgroup>. Order here is the display order.
 */

export interface RegionalDex {
  id: number;
  name: string; // PokeAPI slug, e.g. "kitakami"
  displayName: string; // Label shown in the dropdown
  group: string; // optgroup heading (region)
}

export const REGIONAL_DEXES: RegionalDex[] = [
  // Kanto
  { id: 2, name: "kanto", displayName: "Kanto (RBY/FRLG)", group: "Kanto" },
  { id: 26, name: "letsgo-kanto", displayName: "Kanto (Let's Go)", group: "Kanto" },
  // Johto
  { id: 3, name: "original-johto", displayName: "Johto (GSC)", group: "Johto" },
  { id: 7, name: "updated-johto", displayName: "Johto (HGSS)", group: "Johto" },
  // Hoenn
  { id: 4, name: "hoenn", displayName: "Hoenn (RSE)", group: "Hoenn" },
  { id: 15, name: "updated-hoenn", displayName: "Hoenn (ORAS)", group: "Hoenn" },
  // Sinnoh
  { id: 5, name: "original-sinnoh", displayName: "Sinnoh (DP/BDSP)", group: "Sinnoh" },
  { id: 6, name: "extended-sinnoh", displayName: "Sinnoh (Platinum)", group: "Sinnoh" },
  // Unova
  { id: 8, name: "original-unova", displayName: "Unova (BW)", group: "Unova" },
  { id: 9, name: "updated-unova", displayName: "Unova (B2W2)", group: "Unova" },
  // Kalos
  { id: 12, name: "kalos-central", displayName: "Kalos — Central", group: "Kalos" },
  { id: 13, name: "kalos-coastal", displayName: "Kalos — Coastal", group: "Kalos" },
  { id: 14, name: "kalos-mountain", displayName: "Kalos — Mountain", group: "Kalos" },
  { id: 34, name: "lumiose-city", displayName: "Lumiose City (Legends Z-A)", group: "Kalos" },
  { id: 35, name: "hyperspace", displayName: "Hyperspace (Mega Dimension)", group: "Kalos" },
  // Alola
  { id: 16, name: "original-alola", displayName: "Alola (SM)", group: "Alola" },
  { id: 17, name: "original-melemele", displayName: "Melemele (SM)", group: "Alola" },
  { id: 18, name: "original-akala", displayName: "Akala (SM)", group: "Alola" },
  { id: 19, name: "original-ulaula", displayName: "Ula'ula (SM)", group: "Alola" },
  { id: 20, name: "original-poni", displayName: "Poni (SM)", group: "Alola" },
  { id: 21, name: "updated-alola", displayName: "Alola (USUM)", group: "Alola" },
  { id: 22, name: "updated-melemele", displayName: "Melemele (USUM)", group: "Alola" },
  { id: 23, name: "updated-akala", displayName: "Akala (USUM)", group: "Alola" },
  { id: 24, name: "updated-ulaula", displayName: "Ula'ula (USUM)", group: "Alola" },
  { id: 25, name: "updated-poni", displayName: "Poni (USUM)", group: "Alola" },
  // Galar
  { id: 27, name: "galar", displayName: "Galar", group: "Galar" },
  { id: 28, name: "isle-of-armor", displayName: "Isle of Armor", group: "Galar" },
  { id: 29, name: "crown-tundra", displayName: "Crown Tundra", group: "Galar" },
  // Hisui
  { id: 30, name: "hisui", displayName: "Hisui (Legends: Arceus)", group: "Hisui" },
  // Paldea
  { id: 31, name: "paldea", displayName: "Paldea", group: "Paldea" },
  { id: 32, name: "kitakami", displayName: "Kitakami (Teal Mask)", group: "Paldea" },
  { id: 33, name: "blueberry", displayName: "Blueberry (Indigo Disk)", group: "Paldea" },
];

/**
 * Region groups in display order, each with its member dexes.
 * Used to render <optgroup>s in the dropdown.
 */
export function getRegionalDexGroups(): { region: string; dexes: RegionalDex[] }[] {
  const groups: { region: string; dexes: RegionalDex[] }[] = [];
  for (const dex of REGIONAL_DEXES) {
    let group = groups.find((g) => g.region === dex.group);
    if (!group) {
      group = { region: dex.group, dexes: [] };
      groups.push(group);
    }
    group.dexes.push(dex);
  }
  return groups;
}

export function getRegionalDexById(id: number): RegionalDex | undefined {
  return REGIONAL_DEXES.find((d) => d.id === id);
}
