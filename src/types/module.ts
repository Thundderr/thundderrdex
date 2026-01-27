import { StatModifiers } from "@/lib/utils/statCalculator";

export type ModuleTab = "stats" | "abilities" | "types" | "moves";
export type ModuleType = "pokemon" | "type-chart" | "team-builder";

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

// Union type for all modules
export type AnyModule = PokemonModule | TeamBuilderModule;

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
