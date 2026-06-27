import { typeEffMode } from "./typeEffMode";
import { natureMode } from "./natureMode";
import { speedMode } from "./speedMode";
import { willItKoMode } from "./willItKoMode";
import { metaBuildMode } from "./metaBuildMode";
import type { QuizMode, TrainingModeId } from "./types";

/** Display order in the Dojo lobby: recall first, then battle decision-making. */
export const TRAINING_MODES: QuizMode[] = [
  typeEffMode,
  natureMode,
  speedMode,
  willItKoMode,
  metaBuildMode,
];

const MODE_BY_ID = new Map<string, QuizMode>(TRAINING_MODES.map((m) => [m.id, m]));

export function getMode(id: string | null | undefined): QuizMode | undefined {
  return id ? MODE_BY_ID.get(id) : undefined;
}

export function isTrainingModeId(id: string): id is TrainingModeId {
  return MODE_BY_ID.has(id);
}
