export interface Generation {
  id: number;
  name: string;
  shortName: string;
  region: string;
  pokemonRange: { start: number; end: number };
  versionGroups: string[];
}

export const GENERATIONS: Generation[] = [
  {
    id: 1,
    name: "Generation I",
    shortName: "Gen 1",
    region: "Kanto",
    pokemonRange: { start: 1, end: 151 },
    versionGroups: ["red-blue", "yellow"],
  },
  {
    id: 2,
    name: "Generation II",
    shortName: "Gen 2",
    region: "Johto",
    pokemonRange: { start: 152, end: 251 },
    versionGroups: ["gold-silver", "crystal"],
  },
  {
    id: 3,
    name: "Generation III",
    shortName: "Gen 3",
    region: "Hoenn",
    pokemonRange: { start: 252, end: 386 },
    versionGroups: ["ruby-sapphire", "emerald", "firered-leafgreen"],
  },
  {
    id: 4,
    name: "Generation IV",
    shortName: "Gen 4",
    region: "Sinnoh",
    pokemonRange: { start: 387, end: 493 },
    versionGroups: ["diamond-pearl", "platinum", "heartgold-soulsilver"],
  },
  {
    id: 5,
    name: "Generation V",
    shortName: "Gen 5",
    region: "Unova",
    pokemonRange: { start: 494, end: 649 },
    versionGroups: ["black-white", "black-2-white-2"],
  },
  {
    id: 6,
    name: "Generation VI",
    shortName: "Gen 6",
    region: "Kalos",
    pokemonRange: { start: 650, end: 721 },
    versionGroups: ["x-y", "omega-ruby-alpha-sapphire"],
  },
  {
    id: 7,
    name: "Generation VII",
    shortName: "Gen 7",
    region: "Alola",
    pokemonRange: { start: 722, end: 809 },
    versionGroups: ["sun-moon", "ultra-sun-ultra-moon", "lets-go-pikachu-lets-go-eevee"],
  },
  {
    id: 8,
    name: "Generation VIII",
    shortName: "Gen 8",
    region: "Galar",
    pokemonRange: { start: 810, end: 905 },
    versionGroups: ["sword-shield", "brilliant-diamond-and-shining-pearl", "legends-arceus"],
  },
  {
    id: 9,
    name: "Generation IX",
    shortName: "Gen 9",
    region: "Paldea",
    pokemonRange: { start: 906, end: 1025 },
    versionGroups: ["scarlet-violet"],
  },
];

export function getGenerationFromId(pokemonId: number): number {
  const gen = GENERATIONS.find(
    (g) => pokemonId >= g.pokemonRange.start && pokemonId <= g.pokemonRange.end
  );
  return gen?.id ?? 9;
}

export function getGenerationFromVersionGroup(versionGroup: string): number {
  const gen = GENERATIONS.find((g) => g.versionGroups.includes(versionGroup));
  return gen?.id ?? 0;
}
