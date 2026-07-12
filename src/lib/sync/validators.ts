// Structural type guards run against every payload downloaded from the cloud
// before it is applied to a store. Shallow-but-real checks: enough to reject
// garbage without re-validating every nested field the app already tolerates.

import type { PersistedModuleState } from "@/stores/moduleStore";
import type { CaughtBuckets } from "@/stores/caughtStore";
import type { TrainingPayload } from "@/stores/trainingStore";
import { MAX_BOX } from "@/lib/training/srs";

export interface CaughtPayload {
  caught: CaughtBuckets;
}

export interface GenerationPayload {
  globalGeneration: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Non-negative integer (the shape every SRS/stat counter must take). */
function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

export function isCaughtPayload(raw: unknown): raw is CaughtPayload {
  if (!isRecord(raw) || !isRecord(raw.caught)) return false;
  // Outer keys are bucket names (any non-empty string); each value is a map of
  // form-aware id -> mark, where the id is a bare national id ("79") or a
  // regional-variant key ("79-galar").
  return Object.values(raw.caught).every((bucket) => {
    if (!isRecord(bucket)) return false;
    return Object.entries(bucket).every(
      ([id, value]) =>
        /^\d+(-[a-z]+)?$/.test(id) &&
        // "not-caught" is the legacy third state; still accepted so older cloud
        // payloads validate before they're coerced to "transit".
        (value === "caught" || value === "transit" || value === "not-caught")
    );
  });
}

export function isGenerationPayload(raw: unknown): raw is GenerationPayload {
  return (
    isRecord(raw) &&
    typeof raw.globalGeneration === "number" &&
    Number.isInteger(raw.globalGeneration) &&
    raw.globalGeneration >= 1 &&
    raw.globalGeneration <= 99
  );
}

export function isModulesPayload(raw: unknown): raw is PersistedModuleState {
  if (!isRecord(raw)) return false;
  if (!Array.isArray(raw.tabs) || raw.tabs.length === 0) return false;
  if (typeof raw.activeTabId !== "string") return false;
  if (raw.selectedModuleId !== null && typeof raw.selectedModuleId !== "string") return false;
  if (!Array.isArray(raw.savedTeams)) return false;
  return raw.tabs.every((tab) => {
    if (!isRecord(tab)) return false;
    if (typeof tab.id !== "string" || typeof tab.name !== "string") return false;
    if (!Array.isArray(tab.modules) || !Array.isArray(tab.recentSearches)) return false;
    return tab.modules.every(
      (m) => isRecord(m) && typeof m.id === "string" && typeof m.moduleType === "string"
    );
  });
}

function isSrsRecord(raw: unknown): boolean {
  if (!isRecord(raw)) return false;
  return (
    typeof raw.box === "number" &&
    Number.isInteger(raw.box) &&
    raw.box >= 0 &&
    raw.box <= MAX_BOX &&
    isCount(raw.seen) &&
    isCount(raw.correct) &&
    typeof raw.lastResult === "boolean" &&
    isCount(raw.lastSeenAt)
  );
}

function isModeStats(raw: unknown): boolean {
  return (
    isRecord(raw) &&
    isCount(raw.attempts) &&
    isCount(raw.correct) &&
    isCount(raw.bestStreak)
  );
}

export function isTrainingPayload(raw: unknown): raw is TrainingPayload {
  if (!isRecord(raw)) return false;
  if (!isRecord(raw.records) || !isRecord(raw.modeStats) || !isRecord(raw.modeSettings)) {
    return false;
  }
  if (!Object.values(raw.records).every(isSrsRecord)) return false;
  if (!Object.values(raw.modeStats).every(isModeStats)) return false;
  // Each mode's settings is a flat string -> string map.
  return Object.values(raw.modeSettings).every(
    (settings) =>
      isRecord(settings) && Object.values(settings).every((v) => typeof v === "string")
  );
}
