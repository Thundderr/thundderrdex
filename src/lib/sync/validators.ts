// Structural type guards run against every payload downloaded from the cloud
// before it is applied to a store. Shallow-but-real checks: enough to reject
// garbage without re-validating every nested field the app already tolerates.

import type { PersistedModuleState } from "@/stores/moduleStore";
import type { CatchMark } from "@/stores/caughtStore";

export interface CaughtPayload {
  caught: Record<number, CatchMark>;
}

export interface GenerationPayload {
  globalGeneration: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isCaughtPayload(raw: unknown): raw is CaughtPayload {
  if (!isRecord(raw) || !isRecord(raw.caught)) return false;
  return Object.entries(raw.caught).every(
    ([key, value]) =>
      /^\d+$/.test(key) && (value === "caught" || value === "not-caught")
  );
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
