import { StatModifiers, StatValues } from "@/lib/utils/statCalculator";

export type ModuleTab = "stats" | "abilities" | "types" | "moves" | "locations" | "evolution";
export type ModuleType = "pokemon" | "type-chart" | "team-builder" | "damage-calc" | "location";

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
  teraType: string | null; // For Tera typing (Gen 9)
  moves: (string | null)[]; // Up to 4 moves from learnset
  // Gimmicks
  useZMove: boolean; // Gen 7: Whether to use Z-Move for selected move
  isDynamaxed: boolean; // Gen 8: Whether Pokemon is Dynamaxed
  useGigantamax: boolean; // Gen 8: Whether to use Gigantamax (if available) vs regular Dynamax
  dynamaxLevel: number; // Gen 8: Dynamax level 0-10 (affects HP boost)
}

export interface DamageCalcSideConfig {
  // Screens
  isReflect: boolean;
  isLightScreen: boolean;
  isAuroraVeil: boolean;

  // Entry Hazards
  spikes: number; // 0-3 layers
  isSR: boolean; // Stealth Rock
  steelsurge: boolean; // Gen 8 G-Max Steelsurge
  vinelash: boolean; // Gen 8 G-Max Vine Lash
  wildfire: boolean; // Gen 8 G-Max Wildfire
  cannonade: boolean; // Gen 8 G-Max Cannonade
  volcalith: boolean; // Gen 8 G-Max Volcalith

  // Protection & Status
  isProtected: boolean;
  isSeeded: boolean; // Leech Seed
  isForesight: boolean;

  // Support
  isTailwind: boolean;
  isHelpingHand: boolean;
  isFlowerGift: boolean;
  isFriendGuard: boolean;
  isPowerSpot: boolean;
  isBattery: boolean;

  // Switching
  isSwitching: "out" | "in" | null;
}

export interface DamageCalcFieldConfig {
  gameType: "Singles" | "Doubles";
  weather: "None" | "Sun" | "Rain" | "Sand" | "Hail" | "Snow" | "Harsh Sunshine" | "Heavy Rain" | "Strong Winds";
  terrain: "None" | "Electric" | "Grassy" | "Misty" | "Psychic";
  isGravity: boolean;
  isMagicRoom: boolean;
  isWonderRoom: boolean;

  // Aura effects (Gen 6+)
  isFairyAura: boolean;
  isDarkAura: boolean;
  isAuraBreak: boolean;

  // Ruin abilities (Gen 9)
  isBeadsOfRuin: boolean; // Sp.Def -25%
  isSwordOfRuin: boolean; // Def -25%
  isTabletsOfRuin: boolean; // Atk -25%
  isVesselOfRuin: boolean; // Sp.Atk -25%

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

// Location module specific fields
export interface LocationModule extends BaseModule {
  moduleType: "location";
  locationAreaName: string | null; // e.g., "viridian-forest-area"
}

// Union type for all modules
export type AnyModule = PokemonModule | TeamBuilderModule | DamageCalcModule | LocationModule;

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
