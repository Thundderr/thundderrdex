import { StatModifiers, StatValues } from "@/lib/utils/statCalculator";

export type ModuleTab = "stats" | "abilities" | "types" | "moves" | "locations";
export type ModuleType = "pokemon" | "type-chart" | "team-builder" | "damage-calc";

// Base module interface
export interface BaseModule {
  id: string;
  moduleType: ModuleType;
  isMinimized: boolean;
}

// Pokemon module specific fields
export interface PokemonModule extends BaseModule {
  moduleType: "pokemon" | "type-chart";
  pokemonName: string | null;
  activeTab: ModuleTab;
  statModifiers: StatModifiers;
  showCalculatedStats: boolean;
}

// Team Builder module specific fields
export interface TeamBuilderModule extends BaseModule {
  moduleType: "team-builder";
  teamSlots: (string | null)[]; // Array of 6 pokemon names
}

// Damage Calculator module types
export interface DamageCalcBoosts {
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export type DamageCalcStatus = "Healthy" | "Burned" | "Paralyzed" | "Poisoned" | "Badly Poisoned" | "Asleep" | "Frozen";

export interface DamageCalcPokemonConfig {
  pokemonName: string | null;
  level: number;
  nature: string;
  ability: string | null;
  item: string | null;
  ivs: StatValues;
  evs: StatValues;
  boosts: DamageCalcBoosts;
  status: DamageCalcStatus;
  currentHpPercent: number; // 0-100, for moves like Water Spout, Reversal
  teraType: string | null; // For Tera typing
  moves: (string | null)[]; // Up to 4 moves from learnset
}

export interface DamageCalcSideConfig {
  isReflect: boolean;
  isLightScreen: boolean;
  isAuroraVeil: boolean;
  isTailwind: boolean;
  helpingHandCount: number; // 0-2 for doubles (can stack)
  isFriendGuard: boolean;
  isFlowerGift: boolean;
  isPowerSpot: boolean;
  isBattery: boolean;
}

export interface DamageCalcFieldConfig {
  gameType: "Singles" | "Doubles";
  weather: "None" | "Sun" | "Rain" | "Sand" | "Snow" | "Harsh Sunshine" | "Heavy Rain";
  terrain: "None" | "Electric" | "Grassy" | "Misty" | "Psychic";
  isGravity: boolean;
  isMagicRoom: boolean;
  isWonderRoom: boolean;
  attackerSide: DamageCalcSideConfig;
  defenderSide: DamageCalcSideConfig;
  isCritical: boolean;
}

export interface DamageCalcModule extends BaseModule {
  moduleType: "damage-calc";
  attacker: DamageCalcPokemonConfig;
  defender: DamageCalcPokemonConfig;
  selectedMove: string | null;
  field: DamageCalcFieldConfig;
}

// Union type for all modules
export type AnyModule = PokemonModule | TeamBuilderModule | DamageCalcModule;

export interface RecentSearch {
  pokemonName: string;
  moduleState: Omit<PokemonModule, "id" | "moduleType">;
  timestamp: number;
}

export interface WorkspaceTab {
  id: string;
  name: string;
  modules: AnyModule[];
  recentSearches: RecentSearch[];
}
