import { StatModifiers } from "@/lib/utils/statCalculator";

export type ModuleTab = "stats" | "abilities" | "types" | "moves";
export type ModuleType = "pokemon" | "type-chart";

export interface PokemonModule {
  id: string;
  moduleType: ModuleType;
  pokemonName: string | null;
  isMinimized: boolean;
  activeTab: ModuleTab;
  statModifiers: StatModifiers;
  showCalculatedStats: boolean;
}

export interface RecentSearch {
  pokemonName: string;
  moduleState: Omit<PokemonModule, "id" | "moduleType">;
  timestamp: number;
}
