import { PokemonTypeName } from "./pokemon";

export type DamageClass = "physical" | "special" | "status";

export interface Move {
  id: number;
  name: string;
  displayName: string;
  type: PokemonTypeName;
  damageClass: DamageClass;
  power: number | null;
  accuracy: number | null;
  pp: number;
  description: string;
  priority: number;
}

export type LearnMethod = "level-up" | "machine" | "egg" | "tutor";

export interface LearnsetEntry {
  move: Move;
  learnMethod: LearnMethod;
  levelLearned: number | null;
  generations: number[];
}
