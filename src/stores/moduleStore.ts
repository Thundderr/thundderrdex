import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import { PokemonModule, TeamBuilderModule, DamageCalcModule, LocationModule, PokedexModule, CatchRateModule, TrainingModule, ScoutingModule, DamageCalcPokemonConfig, DamageCalcFieldConfig, DamageCalcSideConfig, AnyModule, ModuleTab, ModuleType, RecentSearch, WorkspaceTab, TeamBattleSlot, TeamBattleTeam, SavedTeam } from "@/types/module";
import { StatModifiers, DEFAULT_STAT_MODIFIERS, StatValues, clampEv, clampIv, clampLevel, getEvTotal } from "@/lib/utils/statCalculator";

const MAX_RECENT_SEARCHES = 20;

const createDefaultModule = (type: ModuleType = "pokemon"): PokemonModule => ({
  id: uuidv4(),
  moduleType: type as "pokemon" | "type-chart" | "nature-chart",
  pokemonName: null,
  isMinimized: false,
  activeTab: "stats",
  statModifiers: { ...DEFAULT_STAT_MODIFIERS },
  showCalculatedStats: false,
});

const createTeamBuilderModule = (): TeamBuilderModule => ({
  id: uuidv4(),
  moduleType: "team-builder",
  isMinimized: false,
  teamSlots: [null, null, null, null, null, null],
});

const DEFAULT_DAMAGE_CALC_POKEMON: DamageCalcPokemonConfig = {
  pokemonName: null,
  level: 100,
  nature: "Hardy",
  ability: null,
  item: null,
  ivs: { hp: 31, attack: 31, defense: 31, specialAttack: 31, specialDefense: 31, speed: 31 },
  evs: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
  boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  status: "Healthy",
  currentHpPercent: 100,
  teraType: null,
  moves: [null, null, null, null],
  // Gimmicks
  useZMove: false,
  isDynamaxed: false,
  useGigantamax: false,
  dynamaxLevel: 10,
};

const DEFAULT_SIDE_CONFIG: DamageCalcSideConfig = {
  // Screens
  isReflect: false,
  isLightScreen: false,
  isAuroraVeil: false,

  // Entry Hazards
  spikes: 0,
  isSR: false,
  steelsurge: false,
  vinelash: false,
  wildfire: false,
  cannonade: false,
  volcalith: false,

  // Protection & Status
  isProtected: false,
  isSeeded: false,
  isForesight: false,

  // Support
  isTailwind: false,
  isHelpingHand: false,
  isFlowerGift: false,
  isFriendGuard: false,
  isPowerSpot: false,
  isBattery: false,

  // Switching
  isSwitching: null,
};

const DEFAULT_DAMAGE_CALC_FIELD: DamageCalcFieldConfig = {
  gameType: "Singles",
  weather: "None",
  terrain: "None",
  isGravity: false,
  isMagicRoom: false,
  isWonderRoom: false,

  // Aura effects (Gen 6+)
  isFairyAura: false,
  isDarkAura: false,
  isAuraBreak: false,

  // Ruin abilities (Gen 9)
  isBeadsOfRuin: false,
  isSwordOfRuin: false,
  isTabletsOfRuin: false,
  isVesselOfRuin: false,

  attackerSide: { ...DEFAULT_SIDE_CONFIG },
  defenderSide: { ...DEFAULT_SIDE_CONFIG },
  isCritical: false,
};

const createDamageCalcModule = (): DamageCalcModule => ({
  id: uuidv4(),
  moduleType: "damage-calc",
  isMinimized: false,
  attacker: { ...DEFAULT_DAMAGE_CALC_POKEMON },
  defender: { ...DEFAULT_DAMAGE_CALC_POKEMON },
  selectedMove: null,
  field: { ...DEFAULT_DAMAGE_CALC_FIELD },
});

const createDefaultTeamBattleTeam = (): TeamBattleTeam => ({
  slots: [null, null, null, null, null, null],
  activeSlotIndex: null,
  expandedSlotIndex: null,
  loadedFromTeamId: null,
});

const createLocationModule = (locationAreaName: string | null = null): LocationModule => ({
  id: uuidv4(),
  moduleType: "location",
  isMinimized: false,
  locationAreaName,
});

const createPokedexModule = (): PokedexModule => ({
  id: uuidv4(),
  moduleType: "pokedex",
  isMinimized: false,
});

const createCatchRateModule = (): CatchRateModule => ({
  id: uuidv4(),
  moduleType: "catch-rate",
  isMinimized: false,
  pokemonName: null,
  ballId: "poke",
  hpPercent: 100,
  exactlyOneHp: false,
  status: "none",
  turnCount: 1,
  inWater: false,
  nightOrCave: false,
  alreadyCaught: false,
  yourLevel: 50,
  loveBallMatch: false,
  targetLevel: 50,
  capturePower: 0,
  oPowerLevel: 0,
  caughtOffGuard: false,
  catchingCharm: false,
  badgeCount: 8,
  hasEighthBadge: true,
  dexCaughtBucket: 0,
  darkGrass: false,
});

const createTrainingModule = (): TrainingModule => ({
  id: uuidv4(),
  moduleType: "training",
  isMinimized: false,
  selectedModeId: null,
});

const createScoutingModule = (): ScoutingModule => ({
  id: uuidv4(),
  moduleType: "scouting",
  isMinimized: false,
  slots: [null, null, null, null, null, null],
});

const createDefaultTab = (name: string = "Main"): WorkspaceTab => ({
  id: uuidv4(),
  name,
  modules: [createDefaultModule()],
  recentSearches: [],
});

interface ModuleStore {
  // Tab state
  tabs: WorkspaceTab[];
  activeTabId: string;
  selectedModuleId: string | null;
  pendingTabRemoval: string | null;
  // Saved teams (global, not per-tab)
  savedTeams: SavedTeam[];
  // Tab methods
  addWorkspaceTab: () => void;
  removeWorkspaceTab: (id: string) => void;
  requestRemoveTab: (id: string) => void;
  cancelRemoveTab: () => void;
  confirmRemoveTab: () => void;
  renameWorkspaceTab: (id: string, name: string) => void;
  setActiveWorkspaceTab: (id: string) => void;
  goToPreviousTab: () => void;
  goToNextTab: () => void;
  reorderTabs: (activeId: string, overId: string) => void;
  // Module state
  newlyCreatedModuleId: string | null;
  // Computed getter for active tab's recent searches
  getRecentSearches: () => RecentSearch[];
  // Selection methods
  selectModule: (id: string) => void;
  // Module methods
  addModule: (type?: ModuleType) => void;
  addPokemonModule: (pokemonName: string, activeTab?: ModuleTab) => void;
  clearNewlyCreatedModule: () => void;
  addTypeChartModule: () => void;
  addNatureChartModule: () => void;
  addTeamBuilderModule: () => void;
  removeModule: (id: string) => void;
  updateModule: (id: string, updates: Partial<PokemonModule>) => void;
  // Team Builder methods
  setTeamSlot: (moduleId: string, slotIndex: number, pokemonName: string | null) => void;
  clearTeamSlot: (moduleId: string, slotIndex: number) => void;
  // Damage Calculator methods
  addDamageCalcModule: () => void;
  setDamageCalcAttacker: (moduleId: string, config: Partial<DamageCalcPokemonConfig>) => void;
  setDamageCalcDefender: (moduleId: string, config: Partial<DamageCalcPokemonConfig>) => void;
  setDamageCalcMove: (moduleId: string, moveName: string | null) => void;
  setDamageCalcField: (moduleId: string, field: Partial<DamageCalcFieldConfig>) => void;
  setDamageCalcBothLevels: (moduleId: string, level: number) => void;
  swapDamageCalcPokemon: (moduleId: string) => void;
  swapTeamBattleSides: (moduleId: string) => void;
  // Pokedex module methods
  addPokedexModule: () => void;
  setPokedexDex: (moduleId: string, dexId: number | null) => void;
  // Catch Rate module methods
  addCatchRateModule: () => void;
  setCatchRateInput: (moduleId: string, updates: Partial<CatchRateModule>) => void;
  // Training Dojo module methods
  addTrainingModule: () => void;
  setTrainingMode: (moduleId: string, modeId: string | null) => void;
  // Scouting module methods
  addScoutingModule: () => void;
  setScoutingSlot: (moduleId: string, slotIndex: number, pokemonName: string | null) => void;
  clearScoutingSlot: (moduleId: string, slotIndex: number) => void;
  // Location module methods
  addLocationModule: (locationAreaName?: string | null) => void;
  setLocationArea: (moduleId: string, locationAreaName: string | null) => void;
  setPokemon: (id: string, pokemonName: string) => void;
  setActiveTab: (id: string, tab: ModuleTab) => void;
  toggleMinimize: (id: string) => void;
  toggleExtended: (id: string) => void;
  toggleFullscreen: (id: string) => void;
  // Resize overrides; null clears a dimension back to the default, undefined leaves it unchanged
  setModuleSize: (id: string, size: { widthCols?: number | null; height?: number | null }) => void;
  reorderModules: (activeId: string, overId: string) => void;
  bringModuleToFront: (id: string) => void;
  // Stat modifier methods
  setStatModifiers: (id: string, modifiers: Partial<StatModifiers>) => void;
  setLevel: (id: string, level: number) => void;
  setIv: (id: string, stat: keyof StatValues, value: number) => void;
  setEv: (id: string, stat: keyof StatValues, value: number) => void;
  setAllIvs: (id: string, value: number) => void;
  setAllEvs: (id: string, evs: StatValues) => void;
  setNature: (id: string, nature: string) => void;
  setAbility: (id: string, ability: string | null) => void;
  setItem: (id: string, item: string | null) => void;
  setModuleMove: (id: string, slotIndex: number, moveName: string | null) => void;
  toggleCalculatedStats: (id: string) => void;
  resetStatModifiers: (id: string) => void;
  // Team Battle methods (6v6 fullscreen damage calc)
  initTeamBattle: (moduleId: string) => void;
  setTeamBattleSlot: (moduleId: string, side: "attacker" | "defender", slotIndex: number, config: DamageCalcPokemonConfig) => void;
  clearTeamBattleSlot: (moduleId: string, side: "attacker" | "defender", slotIndex: number) => void;
  selectTeamBattleSlot: (moduleId: string, side: "attacker" | "defender", slotIndex: number) => void;
  expandTeamBattleSlot: (moduleId: string, side: "attacker" | "defender", slotIndex: number | null) => void;
  updateTeamBattleSlotConfig: (moduleId: string, side: "attacker" | "defender", slotIndex: number, config: Partial<DamageCalcPokemonConfig>) => void;
  // Saved teams
  saveTeam: (name: string, slots: (TeamBattleSlot | null)[]) => void;
  overwriteTeam: (teamId: string, slots: (TeamBattleSlot | null)[]) => void;
  deleteTeam: (teamId: string) => void;
  renameTeam: (teamId: string, name: string) => void;
  loadTeamIntoSide: (moduleId: string, side: "attacker" | "defender", team: SavedTeam) => void;
  // Recent searches
  restoreFromRecent: (pokemonName: string) => void;
  clearRecentSearches: () => void;
  // Generation change reset
  resetDamageCalcGimmicks: () => void;
}

// Helper to get active tab
const getActiveTab = (state: { tabs: WorkspaceTab[]; activeTabId: string }): WorkspaceTab | undefined => {
  return state.tabs.find((t) => t.id === state.activeTabId);
};

// Helper to update modules in active tab
const updateActiveTabModules = (
  state: { tabs: WorkspaceTab[]; activeTabId: string },
  updater: (modules: AnyModule[]) => AnyModule[]
): WorkspaceTab[] => {
  return state.tabs.map((tab) =>
    tab.id === state.activeTabId
      ? { ...tab, modules: updater(tab.modules) }
      : tab
  );
};

// Helper to update recent searches in active tab
const updateActiveTabRecents = (
  state: { tabs: WorkspaceTab[]; activeTabId: string },
  updater: (recents: RecentSearch[]) => RecentSearch[]
): WorkspaceTab[] => {
  return state.tabs.map((tab) =>
    tab.id === state.activeTabId
      ? { ...tab, recentSearches: updater(tab.recentSearches) }
      : tab
  );
};

// The persisted slice, schema version, and migration chain are exported so
// the cloud-sync engine (src/lib/sync) can produce/consume exactly the same
// shape and run the same migrations on payloads downloaded from other devices.

export const MODULE_STORE_VERSION = 4;

export interface PersistedModuleState {
  tabs: WorkspaceTab[];
  activeTabId: string;
  selectedModuleId: string | null;
  savedTeams: SavedTeam[];
}

export function partializeModuleState(
  state: Pick<ModuleStore, "tabs" | "activeTabId" | "selectedModuleId" | "savedTeams">
): PersistedModuleState {
  return {
    tabs: state.tabs.map(tab => ({
      ...tab,
      modules: tab.modules.map(m => {
        // Strip isFullscreen so users don't reopen the app in fullscreen
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { isFullscreen, ...rest } = m;
        return rest as AnyModule;
      }),
    })),
    activeTabId: state.activeTabId,
    selectedModuleId: state.selectedModuleId,
    savedTeams: state.savedTeams,
  };
}

// Migration from old formats to new format with tab-specific recents
export function migrateModuleState(persistedState: unknown, version: number) {
  if (version === 0 || version === 1) {
    // Old format had modules array directly
    const oldState = persistedState as { modules?: PokemonModule[]; recentSearches?: RecentSearch[] };
    if (oldState.modules && Array.isArray(oldState.modules)) {
      const newTab: WorkspaceTab = {
        id: uuidv4(),
        name: "Main",
        modules: oldState.modules,
        recentSearches: oldState.recentSearches || [],
      };
      return {
        tabs: [newTab],
        activeTabId: newTab.id,
      };
    }
  }
  if (version === 3) {
    // Version 3 -> 4: Add savedTeams array
    const oldState = persistedState as Record<string, unknown>;
    return {
      ...oldState,
      savedTeams: (oldState as { savedTeams?: SavedTeam[] }).savedTeams ?? [],
    };
  }
  if (version === 2) {
    // Version 2 had global recentSearches, move them to active tab
    const oldState = persistedState as { tabs?: WorkspaceTab[]; activeTabId?: string; recentSearches?: RecentSearch[] };
    if (oldState.tabs && Array.isArray(oldState.tabs)) {
      const updatedTabs = oldState.tabs.map((tab, index) => ({
        ...tab,
        recentSearches: index === 0 ? (oldState.recentSearches || []) : (tab.recentSearches || []),
      }));
      return {
        tabs: updatedTabs,
        activeTabId: oldState.activeTabId,
      };
    }
  }
  return persistedState;
}

const defaultTab = createDefaultTab();

export const useModuleStore = create<ModuleStore>()(
  persist(
    (set, get) => ({
      tabs: [defaultTab],
      activeTabId: defaultTab.id,
      selectedModuleId: defaultTab.modules[0]?.id || null,
      pendingTabRemoval: null,
      newlyCreatedModuleId: null,
      savedTeams: [],

      // Computed getter for active tab's recent searches
      getRecentSearches: () => {
        const state = get();
        const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
        return activeTab?.recentSearches || [];
      },

      // Selection methods
      selectModule: (id) => {
        set({ selectedModuleId: id });
      },

      // Tab removal with confirmation
      requestRemoveTab: (id) => {
        set({ pendingTabRemoval: id });
      },

      cancelRemoveTab: () => {
        set({ pendingTabRemoval: null });
      },

      confirmRemoveTab: () => {
        const state = get();
        if (state.pendingTabRemoval && state.tabs.length > 1) {
          const id = state.pendingTabRemoval;
          const newTabs = state.tabs.filter((t) => t.id !== id);
          const newActiveId = state.activeTabId === id
            ? newTabs[0].id
            : state.activeTabId;
          const newActiveTab = newTabs.find((t) => t.id === newActiveId);
          const firstModuleId = newActiveTab?.modules[0]?.id || null;

          set({
            tabs: newTabs,
            activeTabId: newActiveId,
            selectedModuleId: firstModuleId,
            pendingTabRemoval: null,
          });
        } else {
          set({ pendingTabRemoval: null });
        }
      },

      // Tab methods
      addWorkspaceTab: () => {
        const newTab = createDefaultTab(`Tab ${get().tabs.length + 1}`);
        set((state) => ({
          tabs: [...state.tabs, newTab],
          activeTabId: newTab.id,
          selectedModuleId: newTab.modules[0]?.id || null,
          newlyCreatedModuleId: newTab.modules[0]?.id || null,
        }));
      },

      removeWorkspaceTab: (id) => {
        const state = get();
        if (state.tabs.length <= 1) return; // Don't remove last tab

        const newTabs = state.tabs.filter((t) => t.id !== id);
        const newActiveId = state.activeTabId === id
          ? newTabs[0].id
          : state.activeTabId;

        set({
          tabs: newTabs,
          activeTabId: newActiveId,
        });
      },

      renameWorkspaceTab: (id, name) => {
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === id ? { ...tab, name } : tab
          ),
        }));
      },

      setActiveWorkspaceTab: (id) => {
        const state = get();
        const newTab = state.tabs.find((t) => t.id === id);
        const firstModuleId = newTab?.modules[0]?.id || null;
        set({ activeTabId: id, selectedModuleId: firstModuleId });
      },

      goToPreviousTab: () => {
        const state = get();
        const currentIndex = state.tabs.findIndex((t) => t.id === state.activeTabId);
        if (currentIndex === -1 || state.tabs.length === 0) return;
        // Wrap around so the [ shortcut cycles past the first tab to the last.
        const prevTab = state.tabs[(currentIndex - 1 + state.tabs.length) % state.tabs.length];
        const firstModuleId = prevTab?.modules[0]?.id || null;
        set({ activeTabId: prevTab.id, selectedModuleId: firstModuleId });
      },

      goToNextTab: () => {
        const state = get();
        const currentIndex = state.tabs.findIndex((t) => t.id === state.activeTabId);
        if (currentIndex === -1 || state.tabs.length === 0) return;
        // Wrap around so the ] shortcut cycles past the last tab to the first.
        const nextTab = state.tabs[(currentIndex + 1) % state.tabs.length];
        const firstModuleId = nextTab?.modules[0]?.id || null;
        set({ activeTabId: nextTab.id, selectedModuleId: firstModuleId });
      },

      reorderTabs: (activeId, overId) => {
        set((state) => {
          const oldIndex = state.tabs.findIndex((t) => t.id === activeId);
          const newIndex = state.tabs.findIndex((t) => t.id === overId);

          if (oldIndex === -1 || newIndex === -1) return state;

          const newTabs = [...state.tabs];
          const [removed] = newTabs.splice(oldIndex, 1);
          newTabs.splice(newIndex, 0, removed);

          return { tabs: newTabs };
        });
      },

      // Module methods (operate on active tab)
      addModule: (type: ModuleType = "pokemon") => {
        const newModule = createDefaultModule(type);
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) => [...modules, newModule]),
          newlyCreatedModuleId: newModule.id,
          selectedModuleId: newModule.id,
        }));
      },

      addPokemonModule: (pokemonName: string, activeTab?: ModuleTab) => {
        const newModule: PokemonModule = {
          ...createDefaultModule("pokemon"),
          pokemonName,
          ...(activeTab ? { activeTab } : {}),
        };
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) => [...modules, newModule]),
          newlyCreatedModuleId: newModule.id,
          selectedModuleId: newModule.id,
        }));
      },

      clearNewlyCreatedModule: () => {
        set({ newlyCreatedModuleId: null });
      },

      addTypeChartModule: () => {
        const newModule = createDefaultModule("type-chart");
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) => [...modules, newModule]),
          newlyCreatedModuleId: newModule.id,
          selectedModuleId: newModule.id,
        }));
      },

      addNatureChartModule: () => {
        const newModule = createDefaultModule("nature-chart");
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) => [...modules, newModule]),
          newlyCreatedModuleId: newModule.id,
          selectedModuleId: newModule.id,
        }));
      },

      addTeamBuilderModule: () => {
        const newModule = createTeamBuilderModule();
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) => [...modules, newModule]),
          newlyCreatedModuleId: newModule.id,
          selectedModuleId: newModule.id,
        }));
      },

      setTeamSlot: (moduleId, slotIndex, pokemonName) => {
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) => {
              if (m.id === moduleId && m.moduleType === "team-builder") {
                const teamModule = m as TeamBuilderModule;
                const newSlots = [...teamModule.teamSlots];
                newSlots[slotIndex] = pokemonName;
                return { ...teamModule, teamSlots: newSlots };
              }
              return m;
            })
          ),
        }));
      },

      clearTeamSlot: (moduleId, slotIndex) => {
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) => {
              if (m.id === moduleId && m.moduleType === "team-builder") {
                const teamModule = m as TeamBuilderModule;
                const newSlots = [...teamModule.teamSlots];
                newSlots[slotIndex] = null;
                return { ...teamModule, teamSlots: newSlots };
              }
              return m;
            })
          ),
        }));
      },

      // Damage Calculator methods
      addDamageCalcModule: () => {
        const newModule = createDamageCalcModule();
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) => [...modules, newModule]),
          newlyCreatedModuleId: newModule.id,
          selectedModuleId: newModule.id,
        }));
      },

      setDamageCalcAttacker: (moduleId, config) => {
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) => {
              if (m.id === moduleId && m.moduleType === "damage-calc") {
                const dmgModule = m as DamageCalcModule;
                return { ...dmgModule, attacker: { ...dmgModule.attacker, ...config } };
              }
              return m;
            })
          ),
        }));
      },

      setDamageCalcDefender: (moduleId, config) => {
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) => {
              if (m.id === moduleId && m.moduleType === "damage-calc") {
                const dmgModule = m as DamageCalcModule;
                return { ...dmgModule, defender: { ...dmgModule.defender, ...config } };
              }
              return m;
            })
          ),
        }));
      },

      setDamageCalcMove: (moduleId, moveName) => {
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) => {
              if (m.id === moduleId && m.moduleType === "damage-calc") {
                return { ...m, selectedMove: moveName };
              }
              return m;
            })
          ),
        }));
      },

      setDamageCalcField: (moduleId, field) => {
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) => {
              if (m.id === moduleId && m.moduleType === "damage-calc") {
                const dmgModule = m as DamageCalcModule;
                return { ...dmgModule, field: { ...dmgModule.field, ...field } };
              }
              return m;
            })
          ),
        }));
      },

      setDamageCalcBothLevels: (moduleId, level) => {
        const clampedLevel = Math.max(1, Math.min(100, level));
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) => {
              if (m.id === moduleId && m.moduleType === "damage-calc") {
                const dmgModule = m as DamageCalcModule;
                return {
                  ...dmgModule,
                  attacker: { ...dmgModule.attacker, level: clampedLevel },
                  defender: { ...dmgModule.defender, level: clampedLevel },
                };
              }
              return m;
            })
          ),
        }));
      },

      swapDamageCalcPokemon: (moduleId) => {
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) => {
              if (m.id === moduleId && m.moduleType === "damage-calc") {
                const dmgModule = m as DamageCalcModule;
                return {
                  ...dmgModule,
                  attacker: { ...dmgModule.defender },
                  defender: { ...dmgModule.attacker },
                  selectedMove: null, // Reset move when swapping
                };
              }
              return m;
            })
          ),
        }));
      },

      swapTeamBattleSides: (moduleId) => {
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) => {
              if (m.id !== moduleId || m.moduleType !== "damage-calc") return m;
              const dmg = m as DamageCalcModule;
              const newSwapped = !(dmg.isSwapped ?? false);

              // Re-sync active slot configs to their new calc fields
              const atkTeamActive = dmg.attackerTeam?.activeSlotIndex;
              const defTeamActive = dmg.defenderTeam?.activeSlotIndex;
              const atkSlotConfig = atkTeamActive != null ? dmg.attackerTeam?.slots[atkTeamActive]?.config : null;
              const defSlotConfig = defTeamActive != null ? dmg.defenderTeam?.slots[defTeamActive]?.config : null;

              // attackerTeam maps to: attacker (normal) or defender (swapped)
              const atkCalcKey = newSwapped ? "defender" : "attacker";
              const defCalcKey = newSwapped ? "attacker" : "defender";

              const result: Record<string, unknown> = { ...dmg, isSwapped: newSwapped, selectedMove: null };
              if (atkSlotConfig) result[atkCalcKey] = { ...atkSlotConfig };
              if (defSlotConfig) result[defCalcKey] = { ...defSlotConfig };

              return result as unknown as DamageCalcModule;
            })
          ),
        }));
      },

      // Pokedex module methods
      addPokedexModule: () => {
        const newModule = createPokedexModule();
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) => [...modules, newModule]),
          newlyCreatedModuleId: newModule.id,
          selectedModuleId: newModule.id,
        }));
      },

      setPokedexDex: (moduleId, dexId) => {
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) => {
              if (m.id === moduleId && m.moduleType === "pokedex") {
                return { ...m, selectedDexId: dexId } as PokedexModule;
              }
              return m;
            })
          ),
        }));
      },

      // Catch Rate module methods
      addCatchRateModule: () => {
        const newModule = createCatchRateModule();
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) => [...modules, newModule]),
          newlyCreatedModuleId: newModule.id,
          selectedModuleId: newModule.id,
        }));
      },

      setCatchRateInput: (moduleId, updates) => {
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) =>
              m.id === moduleId && m.moduleType === "catch-rate"
                ? ({ ...m, ...updates } as CatchRateModule)
                : m
            )
          ),
        }));
      },

      // Training Dojo module methods
      addTrainingModule: () => {
        const newModule = createTrainingModule();
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) => [...modules, newModule]),
          newlyCreatedModuleId: newModule.id,
          selectedModuleId: newModule.id,
        }));
      },

      setTrainingMode: (moduleId, modeId) => {
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) =>
              m.id === moduleId && m.moduleType === "training"
                ? ({ ...m, selectedModeId: modeId } as TrainingModule)
                : m
            )
          ),
        }));
      },

      // Scouting module methods
      addScoutingModule: () => {
        const newModule = createScoutingModule();
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) => [...modules, newModule]),
          newlyCreatedModuleId: newModule.id,
          selectedModuleId: newModule.id,
        }));
      },

      setScoutingSlot: (moduleId, slotIndex, pokemonName) => {
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) => {
              if (m.id === moduleId && m.moduleType === "scouting") {
                const sm = m as ScoutingModule;
                const newSlots = [...sm.slots];
                newSlots[slotIndex] = pokemonName;
                return { ...sm, slots: newSlots };
              }
              return m;
            })
          ),
        }));
      },

      clearScoutingSlot: (moduleId, slotIndex) => {
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) => {
              if (m.id === moduleId && m.moduleType === "scouting") {
                const sm = m as ScoutingModule;
                const newSlots = [...sm.slots];
                newSlots[slotIndex] = null;
                return { ...sm, slots: newSlots };
              }
              return m;
            })
          ),
        }));
      },

      // Location module methods
      addLocationModule: (locationAreaName = null) => {
        const newModule = createLocationModule(locationAreaName);
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) => [...modules, newModule]),
          newlyCreatedModuleId: newModule.id,
          selectedModuleId: newModule.id,
        }));
      },

      setLocationArea: (moduleId, locationAreaName) => {
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) => {
              if (m.id === moduleId && m.moduleType === "location") {
                return { ...m, locationAreaName } as LocationModule;
              }
              return m;
            })
          ),
        }));
      },

      removeModule: (id) => {
        const state = get();
        const activeTab = getActiveTab(state);
        const module = activeTab?.modules.find((m) => m.id === id);

        // Calculate new selected module if we're removing the selected one
        let newSelectedModuleId = state.selectedModuleId;
        if (state.selectedModuleId === id && activeTab) {
          const moduleIndex = activeTab.modules.findIndex((m) => m.id === id);
          const remainingModules = activeTab.modules.filter((m) => m.id !== id);
          if (remainingModules.length > 0) {
            // Select the next module, or the previous one if we removed the last
            const newIndex = Math.min(moduleIndex, remainingModules.length - 1);
            newSelectedModuleId = remainingModules[newIndex].id;
          } else {
            newSelectedModuleId = null;
          }
        }

        // Save to recent searches (in the active tab) if it has a Pokemon
        if (module && module.moduleType === "pokemon" && module.pokemonName) {
          const { id: _id, moduleType: _type, ...moduleState } = module;
          const currentRecents = activeTab?.recentSearches || [];
          const existingIndex = currentRecents.findIndex(
            (r) => r.pokemonName === module.pokemonName
          );

          let newRecentSearches = [...currentRecents];

          if (existingIndex !== -1) {
            newRecentSearches.splice(existingIndex, 1);
          }

          newRecentSearches.unshift({
            pokemonName: module.pokemonName,
            moduleState,
            timestamp: Date.now(),
          });

          newRecentSearches = newRecentSearches.slice(0, MAX_RECENT_SEARCHES);

          set({
            tabs: state.tabs.map((tab) =>
              tab.id === state.activeTabId
                ? {
                    ...tab,
                    modules: tab.modules.filter((m) => m.id !== id),
                    recentSearches: newRecentSearches,
                  }
                : tab
            ),
            selectedModuleId: newSelectedModuleId,
          });
        } else {
          set({
            tabs: updateActiveTabModules(state, (modules) => modules.filter((m) => m.id !== id)),
            selectedModuleId: newSelectedModuleId,
          });
        }
      },

      updateModule: (id, updates) => {
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) => {
              if (m.id === id && m.moduleType === "pokemon") {
                return { ...m, ...updates } as PokemonModule;
              }
              return m;
            })
          ),
        }));
      },

      setPokemon: (id, pokemonName) => {
        const state = get();
        const activeTab = getActiveTab(state);
        const module = activeTab?.modules.find((m) => m.id === id);

        if (module && module.moduleType === "pokemon" && module.pokemonName && module.pokemonName !== pokemonName) {
          const { id: _id, moduleType: _type, ...moduleState } = module;
          const currentRecents = activeTab?.recentSearches || [];
          const existingIndex = currentRecents.findIndex(
            (r) => r.pokemonName === module.pokemonName
          );

          let newRecentSearches = [...currentRecents];

          if (existingIndex !== -1) {
            newRecentSearches.splice(existingIndex, 1);
          }

          newRecentSearches.unshift({
            pokemonName: module.pokemonName,
            moduleState,
            timestamp: Date.now(),
          });

          newRecentSearches = newRecentSearches.slice(0, MAX_RECENT_SEARCHES);

          set({
            tabs: state.tabs.map((tab) =>
              tab.id === state.activeTabId
                ? {
                    ...tab,
                    modules: tab.modules.map((m) => {
                      if (m.id === id && m.moduleType === "pokemon") {
                        // Clear item when changing Pokemon (Mega auto-fill handled by component)
                        return { ...m, pokemonName, statModifiers: { ...m.statModifiers, item: null } };
                      }
                      return m;
                    }),
                    recentSearches: newRecentSearches,
                  }
                : tab
            ),
          });
        } else {
          set({
            tabs: updateActiveTabModules(state, (modules) =>
              modules.map((m) => {
                if (m.id === id && m.moduleType === "pokemon") {
                  // Clear item when changing Pokemon (Mega auto-fill handled by component)
                  return { ...m, pokemonName, statModifiers: { ...m.statModifiers, item: null } };
                }
                return m.id === id ? { ...m, pokemonName } : m;
              })
            ),
          });
        }
      },

      setActiveTab: (id, tab) => {
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) => (m.id === id ? { ...m, activeTab: tab } : m))
          ),
        }));
      },

      toggleMinimize: (id) => {
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) => (m.id === id ? { ...m, isMinimized: !m.isMinimized } : m))
          ),
        }));
      },

      toggleExtended: (id) => {
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) => (m.id === id ? { ...m, isExtended: !m.isExtended } : m))
          ),
        }));
      },

      toggleFullscreen: (id) => {
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) => ({
              ...m,
              isFullscreen: m.id === id ? !m.isFullscreen : false,
            }))
          ),
        }));
      },

      setModuleSize: (id, size) => {
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) => {
              if (m.id !== id) return m;
              const next = { ...m };
              if (size.widthCols !== undefined) {
                if (size.widthCols === null) delete next.customWidthCols;
                else next.customWidthCols = Math.max(1, Math.round(size.widthCols));
              }
              if (size.height !== undefined) {
                if (size.height === null) delete next.customHeight;
                else next.customHeight = Math.round(size.height);
              }
              return next;
            })
          ),
        }));
      },

      reorderModules: (activeId, overId) => {
        set((state) => {
          const activeTab = getActiveTab(state);
          if (!activeTab) return state;

          const oldIndex = activeTab.modules.findIndex((m) => m.id === activeId);
          const newIndex = activeTab.modules.findIndex((m) => m.id === overId);

          if (oldIndex === -1 || newIndex === -1) return state;

          const newModules = [...activeTab.modules];
          const [removed] = newModules.splice(oldIndex, 1);
          newModules.splice(newIndex, 0, removed);

          return {
            tabs: state.tabs.map((tab) =>
              tab.id === state.activeTabId ? { ...tab, modules: newModules } : tab
            ),
          };
        });
      },

      bringModuleToFront: (id) => {
        set((state) => {
          const activeTab = getActiveTab(state);
          if (!activeTab) return state;

          const index = activeTab.modules.findIndex((m) => m.id === id);
          if (index === -1 || index === 0) return state;

          const newModules = [...activeTab.modules];
          const [removed] = newModules.splice(index, 1);
          newModules.unshift(removed);

          return {
            tabs: state.tabs.map((tab) =>
              tab.id === state.activeTabId ? { ...tab, modules: newModules } : tab
            ),
          };
        });
      },

      setStatModifiers: (id, modifiers) => {
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) => {
              if (m.id === id && m.moduleType === "pokemon") {
                return { ...m, statModifiers: { ...m.statModifiers, ...modifiers } } as PokemonModule;
              }
              return m;
            })
          ),
        }));
      },

      setLevel: (id, level) => {
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) => {
              if (m.id === id && m.moduleType === "pokemon") {
                return { ...m, statModifiers: { ...m.statModifiers, level: clampLevel(level) } } as PokemonModule;
              }
              return m;
            })
          ),
        }));
      },

      setIv: (id, stat, value) => {
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) => {
              if (m.id === id && m.moduleType === "pokemon") {
                return {
                  ...m,
                  statModifiers: {
                    ...m.statModifiers,
                    ivs: { ...m.statModifiers.ivs, [stat]: clampIv(value) },
                  },
                } as PokemonModule;
              }
              return m;
            })
          ),
        }));
      },

      setEv: (id, stat, value) => {
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) => {
              if (m.id !== id || m.moduleType !== "pokemon") return m;

              const clampedValue = clampEv(value);
              const newEvs = { ...m.statModifiers.evs, [stat]: clampedValue };
              const total = getEvTotal(newEvs);

              if (total > 510) {
                const excess = total - 510;
                newEvs[stat] = Math.max(0, clampedValue - excess);
              }

              return {
                ...m,
                statModifiers: { ...m.statModifiers, evs: newEvs },
              } as PokemonModule;
            })
          ),
        }));
      },

      setAllIvs: (id, value) => {
        const clampedValue = clampIv(value);
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) => {
              if (m.id === id && m.moduleType === "pokemon") {
                return {
                  ...m,
                  statModifiers: {
                    ...m.statModifiers,
                    ivs: {
                      hp: clampedValue,
                      attack: clampedValue,
                      defense: clampedValue,
                      specialAttack: clampedValue,
                      specialDefense: clampedValue,
                      speed: clampedValue,
                    },
                  },
                } as PokemonModule;
              }
              return m;
            })
          ),
        }));
      },

      setAllEvs: (id, evs) => {
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) => {
              if (m.id === id && m.moduleType === "pokemon") {
                return {
                  ...m,
                  statModifiers: {
                    ...m.statModifiers,
                    evs: {
                      hp: clampEv(evs.hp),
                      attack: clampEv(evs.attack),
                      defense: clampEv(evs.defense),
                      specialAttack: clampEv(evs.specialAttack),
                      specialDefense: clampEv(evs.specialDefense),
                      speed: clampEv(evs.speed),
                    },
                  },
                } as PokemonModule;
              }
              return m;
            })
          ),
        }));
      },

      setNature: (id, nature) => {
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) => {
              if (m.id === id && m.moduleType === "pokemon") {
                return { ...m, statModifiers: { ...m.statModifiers, nature } } as PokemonModule;
              }
              return m;
            })
          ),
        }));
      },

      setAbility: (id, ability) => {
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) => {
              if (m.id === id && m.moduleType === "pokemon") {
                return { ...m, statModifiers: { ...m.statModifiers, ability } } as PokemonModule;
              }
              return m;
            })
          ),
        }));
      },

      setItem: (id, item) => {
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) => {
              if (m.id === id && m.moduleType === "pokemon") {
                return { ...m, statModifiers: { ...m.statModifiers, item } } as PokemonModule;
              }
              return m;
            })
          ),
        }));
      },

      setModuleMove: (id, slotIndex, moveName) => {
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) => {
              if (m.id === id && m.moduleType === "pokemon") {
                const currentMoves = m.statModifiers.moves ?? [null, null, null, null];
                const newMoves = [...currentMoves];
                newMoves[slotIndex] = moveName;
                return { ...m, statModifiers: { ...m.statModifiers, moves: newMoves } } as PokemonModule;
              }
              return m;
            })
          ),
        }));
      },

      toggleCalculatedStats: (id) => {
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) => {
              if (m.id === id && m.moduleType === "pokemon") {
                return { ...m, showCalculatedStats: !m.showCalculatedStats } as PokemonModule;
              }
              return m;
            })
          ),
        }));
      },

      resetStatModifiers: (id) => {
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) => {
              if (m.id === id && m.moduleType === "pokemon") {
                return { ...m, statModifiers: { ...DEFAULT_STAT_MODIFIERS } } as PokemonModule;
              }
              return m;
            })
          ),
        }));
      },

      restoreFromRecent: (pokemonName) => {
        const state = get();
        const activeTab = getActiveTab(state);
        const currentRecents = activeTab?.recentSearches || [];
        const recent = currentRecents.find((r) => r.pokemonName === pokemonName);

        if (recent) {
          const newModule: PokemonModule = {
            id: uuidv4(),
            moduleType: "pokemon",
            ...recent.moduleState,
          };

          const newRecentSearches = currentRecents.filter(
            (r) => r.pokemonName !== pokemonName
          );

          set({
            tabs: state.tabs.map((tab) =>
              tab.id === state.activeTabId
                ? {
                    ...tab,
                    modules: [...tab.modules, newModule],
                    recentSearches: newRecentSearches,
                  }
                : tab
            ),
          });
        }
      },

      clearRecentSearches: () => {
        set((state) => ({
          tabs: updateActiveTabRecents(state, () => []),
        }));
      },

      // Team Battle methods
      initTeamBattle: (moduleId) => {
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) => {
              if (m.id !== moduleId || m.moduleType !== "damage-calc") return m;
              const dmg = m as DamageCalcModule;

              const attackerTeam = dmg.attackerTeam ? { ...dmg.attackerTeam, slots: [...dmg.attackerTeam.slots] } : createDefaultTeamBattleTeam();
              const defenderTeam = dmg.defenderTeam ? { ...dmg.defenderTeam, slots: [...dmg.defenderTeam.slots] } : createDefaultTeamBattleTeam();

              // If teams already existed, re-sync active slot with current attacker/defender
              if (dmg.attackerTeam && attackerTeam.activeSlotIndex !== null) {
                attackerTeam.slots[attackerTeam.activeSlotIndex] = { config: { ...dmg.attacker } };
              }
              if (dmg.defenderTeam && defenderTeam.activeSlotIndex !== null) {
                defenderTeam.slots[defenderTeam.activeSlotIndex] = { config: { ...dmg.defender } };
              }

              // Seed slot 0 with current attacker/defender if no teams existed
              if (!dmg.attackerTeam && dmg.attacker.pokemonName) {
                attackerTeam.slots[0] = { config: { ...dmg.attacker } };
                attackerTeam.activeSlotIndex = 0;
              }
              if (!dmg.defenderTeam && dmg.defender.pokemonName) {
                defenderTeam.slots[0] = { config: { ...dmg.defender } };
                defenderTeam.activeSlotIndex = 0;
              }

              return { ...dmg, attackerTeam, defenderTeam };
            })
          ),
        }));
      },

      setTeamBattleSlot: (moduleId, side, slotIndex, config) => {
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) => {
              if (m.id !== moduleId || m.moduleType !== "damage-calc") return m;
              const dmg = m as DamageCalcModule;
              const teamKey = side === "attacker" ? "attackerTeam" : "defenderTeam";
              const team = dmg[teamKey];
              if (!team) return m;

              const updatedSlots = [...team.slots];
              updatedSlots[slotIndex] = { config: { ...config } };
              return { ...dmg, [teamKey]: { ...team, slots: updatedSlots } };
            })
          ),
        }));
      },

      clearTeamBattleSlot: (moduleId, side, slotIndex) => {
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) => {
              if (m.id !== moduleId || m.moduleType !== "damage-calc") return m;
              const dmg = m as DamageCalcModule;
              const isSwapped = dmg.isSwapped ?? false;
              const teamKey = side === "attacker" ? "attackerTeam" : "defenderTeam";
              const calcKey = side === "attacker"
                ? (isSwapped ? "defender" : "attacker")
                : (isSwapped ? "attacker" : "defender");
              const team = dmg[teamKey];
              if (!team) return m;

              const updatedSlots = [...team.slots];
              updatedSlots[slotIndex] = null;
              const updatedTeam = { ...team, slots: updatedSlots };

              // If clearing the active slot, reset the calc side
              const result: Record<string, unknown> = { ...dmg, [teamKey]: updatedTeam };
              if (team.activeSlotIndex === slotIndex) {
                updatedTeam.activeSlotIndex = null;
                result[calcKey] = { ...DEFAULT_DAMAGE_CALC_POKEMON };
                const isAttackerSide = (side === "attacker" && !isSwapped) || (side === "defender" && isSwapped);
                if (isAttackerSide) result.selectedMove = null;
              }

              return result as unknown as DamageCalcModule;
            })
          ),
        }));
      },

      selectTeamBattleSlot: (moduleId, side, slotIndex) => {
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) => {
              if (m.id !== moduleId || m.moduleType !== "damage-calc") return m;
              const dmg = m as DamageCalcModule;
              const isSwapped = dmg.isSwapped ?? false;
              const teamKey = side === "attacker" ? "attackerTeam" : "defenderTeam";
              const calcKey = side === "attacker"
                ? (isSwapped ? "defender" : "attacker")
                : (isSwapped ? "attacker" : "defender");
              const team = dmg[teamKey];
              if (!team || !team.slots[slotIndex]) return m;

              const slotConfig = { ...team.slots[slotIndex]!.config };
              const updatedTeam = { ...team, activeSlotIndex: slotIndex };

              const result: Record<string, unknown> = { ...dmg, [teamKey]: updatedTeam, [calcKey]: slotConfig };
              // Reset move when the attacker side changes
              const isAttackerSide = (side === "attacker" && !isSwapped) || (side === "defender" && isSwapped);
              if (isAttackerSide) result.selectedMove = null;

              return result as unknown as DamageCalcModule;
            })
          ),
        }));
      },

      expandTeamBattleSlot: (moduleId, side, slotIndex) => {
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) => {
              if (m.id !== moduleId || m.moduleType !== "damage-calc") return m;
              const dmg = m as DamageCalcModule;
              const teamKey = side === "attacker" ? "attackerTeam" : "defenderTeam";
              const team = dmg[teamKey];
              if (!team) return m;

              return { ...dmg, [teamKey]: { ...team, expandedSlotIndex: slotIndex } };
            })
          ),
        }));
      },

      updateTeamBattleSlotConfig: (moduleId, side, slotIndex, config) => {
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) => {
              if (m.id !== moduleId || m.moduleType !== "damage-calc") return m;
              const dmg = m as DamageCalcModule;
              const isSwapped = dmg.isSwapped ?? false;
              const teamKey = side === "attacker" ? "attackerTeam" : "defenderTeam";
              const calcKey = side === "attacker"
                ? (isSwapped ? "defender" : "attacker")
                : (isSwapped ? "attacker" : "defender");
              const team = dmg[teamKey];
              if (!team) return m;

              const updatedSlots = [...team.slots];
              const currentSlot = updatedSlots[slotIndex];
              const updatedSlotConfig = currentSlot
                ? { ...currentSlot.config, ...config }
                : { ...DEFAULT_DAMAGE_CALC_POKEMON, ...config };
              updatedSlots[slotIndex] = { config: updatedSlotConfig };
              const updatedTeam = { ...team, slots: updatedSlots };

              const result: Record<string, unknown> = { ...dmg, [teamKey]: updatedTeam };

              // Dual-write: if this is the active slot, also update the calc's attacker/defender
              if (team.activeSlotIndex === slotIndex) {
                result[calcKey] = updatedSlotConfig;
              }

              return result as unknown as DamageCalcModule;
            })
          ),
        }));
      },

      // Saved teams
      saveTeam: (name, slots) => {
        set((state) => ({
          savedTeams: [
            ...state.savedTeams,
            {
              id: uuidv4(),
              name,
              slots: slots.map(s => s ? { config: { ...s.config } } : null),
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
        }));
      },

      overwriteTeam: (teamId, slots) => {
        set((state) => ({
          savedTeams: state.savedTeams.map(t =>
            t.id === teamId
              ? { ...t, slots: slots.map(s => s ? { config: { ...s.config } } : null), updatedAt: Date.now() }
              : t
          ),
        }));
      },

      deleteTeam: (teamId) => {
        set((state) => ({
          savedTeams: state.savedTeams.filter(t => t.id !== teamId),
        }));
      },

      renameTeam: (teamId, name) => {
        set((state) => ({
          savedTeams: state.savedTeams.map(t =>
            t.id === teamId ? { ...t, name, updatedAt: Date.now() } : t
          ),
        }));
      },

      loadTeamIntoSide: (moduleId, side, team) => {
        set((state) => ({
          tabs: updateActiveTabModules(state, (modules) =>
            modules.map((m) => {
              if (m.id !== moduleId || m.moduleType !== "damage-calc") return m;
              const dmg = m as DamageCalcModule;
              const isSwapped = dmg.isSwapped ?? false;
              const teamKey = side === "attacker" ? "attackerTeam" : "defenderTeam";
              const calcKey = side === "attacker"
                ? (isSwapped ? "defender" : "attacker")
                : (isSwapped ? "attacker" : "defender");

              const firstNonNullIndex = team.slots.findIndex(s => s !== null);
              const newTeam: TeamBattleTeam = {
                slots: team.slots.map(s => s ? { config: { ...s.config } } : null),
                activeSlotIndex: firstNonNullIndex >= 0 ? firstNonNullIndex : null,
                expandedSlotIndex: null,
                loadedFromTeamId: team.id,
              };

              const result: Record<string, unknown> = { ...dmg, [teamKey]: newTeam };

              // Auto-select first non-null slot into the calc
              const firstSlot = firstNonNullIndex >= 0 ? newTeam.slots[firstNonNullIndex] : null;
              if (firstSlot) {
                result[calcKey] = { ...firstSlot.config };
                const isAttackerSide = (side === "attacker" && !isSwapped) || (side === "defender" && isSwapped);
                if (isAttackerSide) result.selectedMove = null;
              }

              return result as unknown as DamageCalcModule;
            })
          ),
        }));
      },

      resetDamageCalcGimmicks: () => {
        set((state) => ({
          tabs: state.tabs.map((tab) => ({
            ...tab,
            modules: tab.modules.map((m) => {
              if (m.moduleType === "damage-calc") {
                const dmgModule = m as DamageCalcModule;
                return {
                  ...dmgModule,
                  attacker: {
                    ...dmgModule.attacker,
                    useZMove: false,
                    isDynamaxed: false,
                    useGigantamax: false,
                    teraType: null,
                  },
                  defender: {
                    ...dmgModule.defender,
                    useZMove: false,
                    isDynamaxed: false,
                    useGigantamax: false,
                    teraType: null,
                  },
                };
              }
              return m;
            }),
          })),
        }));
      },
    }),
    {
      name: "thundderrdex-modules",
      version: MODULE_STORE_VERSION,
      partialize: (state) => partializeModuleState(state),
      migrate: migrateModuleState,
    }
  )
);
