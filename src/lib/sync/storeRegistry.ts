// Declarative config for each Zustand store the sync engine mirrors to the
// cloud. The engine itself is store-agnostic; everything store-specific
// (payload shape, validation, migrations, conflict merge) lives here.

import { CAUGHT_STORE_VERSION, migrateCaughtState, useCaughtStore } from "@/stores/caughtStore";
import { useGenerationStore } from "@/stores/generationStore";
import {
  MODULE_STORE_VERSION,
  PersistedModuleState,
  migrateModuleState,
  partializeModuleState,
  useModuleStore,
} from "@/stores/moduleStore";
import type { PokemonModule } from "@/types/module";
import type { SyncStoreKey } from "./meta";
import {
  CaughtPayload,
  GenerationPayload,
  isCaughtPayload,
  isGenerationPayload,
  isModulesPayload,
} from "./validators";

export interface SyncedStoreConfig {
  key: SyncStoreKey;
  // Zustand persist schema version, stored alongside the cloud payload so an
  // old payload can be migrated and a newer-schema payload can be refused.
  version: number;
  getPayload(): unknown;
  // Only ever called with payloads that passed validate().
  applyPayload(payload: unknown): void;
  // True when the payload carries no real user data.
  isDefault(payload: unknown): boolean;
  validate(raw: unknown): boolean;
  // Bring an older-version payload up to the current schema.
  migrate?(raw: unknown, fromVersion: number): unknown;
  // Conflict merge for the unstamped-local-data + existing-remote case.
  merge?(local: unknown, remote: unknown): unknown;
  subscribe(listener: () => void): () => void;
  hasHydrated(): boolean;
  onFinishHydration(listener: () => void): () => void;
}

const caughtConfig: SyncedStoreConfig = {
  key: "caught",
  version: CAUGHT_STORE_VERSION,
  getPayload: () => ({ caught: useCaughtStore.getState().caught }),
  applyPayload: (payload) => {
    useCaughtStore.setState({ caught: (payload as CaughtPayload).caught });
  },
  isDefault: (payload) =>
    Object.keys((payload as CaughtPayload).caught).length === 0,
  validate: isCaughtPayload,
  // v0 cloud payloads stored Record<number, true>; true becomes "caught".
  migrate: (raw) => migrateCaughtState(raw),
  // Caught-ness is a natural set union, so the adoption edge case merges
  // instead of picking a side.
  merge: (local, remote) => ({
    caught: {
      ...(remote as CaughtPayload).caught,
      ...(local as CaughtPayload).caught,
    },
  }),
  subscribe: (listener) => useCaughtStore.subscribe(listener),
  hasHydrated: () => useCaughtStore.persist.hasHydrated(),
  onFinishHydration: (listener) => useCaughtStore.persist.onFinishHydration(listener),
};

const generationConfig: SyncedStoreConfig = {
  key: "generation",
  version: 0,
  getPayload: () => ({
    globalGeneration: useGenerationStore.getState().globalGeneration,
  }),
  // setState directly, NOT setGeneration(): that action also resets all
  // damage-calc gimmicks, which must not happen as a side effect of a
  // background download.
  applyPayload: (payload) => {
    useGenerationStore.setState({
      globalGeneration: (payload as GenerationPayload).globalGeneration,
    });
  },
  isDefault: (payload) => (payload as GenerationPayload).globalGeneration === 9,
  validate: isGenerationPayload,
  subscribe: (listener) => useGenerationStore.subscribe(listener),
  hasHydrated: () => useGenerationStore.persist.hasHydrated(),
  onFinishHydration: (listener) => useGenerationStore.persist.onFinishHydration(listener),
};

const modulesConfig: SyncedStoreConfig = {
  key: "modules",
  version: MODULE_STORE_VERSION,
  getPayload: () => partializeModuleState(useModuleStore.getState()),
  applyPayload: (payload) => {
    const state = payload as PersistedModuleState;
    // Sanity-fix dangling references before applying.
    const activeTabId = state.tabs.some((t) => t.id === state.activeTabId)
      ? state.activeTabId
      : state.tabs[0].id;
    const activeTab = state.tabs.find((t) => t.id === activeTabId)!;
    const selectedModuleId =
      state.selectedModuleId && activeTab.modules.some((m) => m.id === state.selectedModuleId)
        ? state.selectedModuleId
        : activeTab.modules[0]?.id ?? null;
    useModuleStore.setState({
      tabs: state.tabs,
      activeTabId,
      selectedModuleId,
      savedTeams: state.savedTeams,
    });
  },
  isDefault: (payload) => {
    const state = payload as PersistedModuleState;
    if (state.savedTeams.length > 0 || state.tabs.length !== 1) return false;
    const tab = state.tabs[0];
    if (tab.recentSearches.length > 0 || tab.modules.length !== 1) return false;
    const m = tab.modules[0];
    return m.moduleType === "pokemon" && (m as PokemonModule).pokemonName === null;
  },
  validate: isModulesPayload,
  migrate: (raw, fromVersion) => {
    // Older migrate outputs (v0-v2) can lack selectedModuleId/savedTeams;
    // normalize so the payload always validates against the v4 shape.
    const migrated = migrateModuleState(raw, fromVersion) as Record<string, unknown>;
    return {
      tabs: migrated.tabs,
      activeTabId: migrated.activeTabId,
      selectedModuleId: migrated.selectedModuleId ?? null,
      savedTeams: migrated.savedTeams ?? [],
    };
  },
  subscribe: (listener) => useModuleStore.subscribe(listener),
  hasHydrated: () => useModuleStore.persist.hasHydrated(),
  onFinishHydration: (listener) => useModuleStore.persist.onFinishHydration(listener),
};

export const SYNCED_STORES: SyncedStoreConfig[] = [
  caughtConfig,
  modulesConfig,
  generationConfig,
];
