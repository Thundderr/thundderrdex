export type PokemonTypeName =
  | "normal"
  | "fire"
  | "water"
  | "electric"
  | "grass"
  | "ice"
  | "fighting"
  | "poison"
  | "ground"
  | "flying"
  | "psychic"
  | "bug"
  | "rock"
  | "ghost"
  | "dragon"
  | "dark"
  | "steel"
  | "fairy";

export interface PokemonType {
  name: PokemonTypeName;
  color: string;
}

export interface PokemonStats {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
  total: number;
}

export interface PokemonAbility {
  name: string;
  displayName: string;
  description: string;
  isHidden: boolean;
}

export interface PokemonSprites {
  front_default: string | null;
  front_shiny: string | null;
  official_artwork: string | null;
}

// Generation-specific type history
export interface PastTypeEntry {
  generation: number;
  types: PokemonType[];
}

// Generation-specific ability history
export interface PastAbilityEntry {
  generation: number;
  abilities: (PokemonAbility | null)[];
}

export interface Pokemon {
  id: number;
  name: string;
  displayName: string;
  types: PokemonType[];
  stats: PokemonStats;
  abilities: PokemonAbility[];
  sprites: PokemonSprites;
  generation: number;
  // Generation-specific data
  pastTypes: PastTypeEntry[];
  pastAbilities: PastAbilityEntry[];
}

export interface PokemonListItem {
  id: number;
  name: string;
  displayName: string;
  spriteUrl: string;
}
