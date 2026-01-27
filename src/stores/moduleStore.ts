import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import { PokemonModule, ModuleTab, ModuleType, RecentSearch } from "@/types/module";
import { StatModifiers, DEFAULT_STAT_MODIFIERS, StatValues, clampEv, clampIv, clampLevel, getEvTotal } from "@/lib/utils/statCalculator";

const MAX_RECENT_SEARCHES = 20;

interface ModuleStore {
  modules: PokemonModule[];
  recentSearches: RecentSearch[];
  addModule: (type?: ModuleType) => void;
  addTypeChartModule: () => void;
  removeModule: (id: string) => void;
  updateModule: (id: string, updates: Partial<PokemonModule>) => void;
  setPokemon: (id: string, pokemonName: string) => void;
  setActiveTab: (id: string, tab: ModuleTab) => void;
  toggleMinimize: (id: string) => void;
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
  toggleCalculatedStats: (id: string) => void;
  resetStatModifiers: (id: string) => void;
  // Recent searches
  restoreFromRecent: (pokemonName: string) => void;
  clearRecentSearches: () => void;
}

const createDefaultModule = (type: ModuleType = "pokemon"): PokemonModule => ({
  id: uuidv4(),
  moduleType: type,
  pokemonName: null,
  isMinimized: false,
  activeTab: "stats",
  statModifiers: { ...DEFAULT_STAT_MODIFIERS },
  showCalculatedStats: false,
});

export const useModuleStore = create<ModuleStore>()(
  persist(
    (set, get) => ({
      modules: [createDefaultModule()],
      recentSearches: [],

      addModule: (type: ModuleType = "pokemon") => {
        set((state) => ({
          modules: [...state.modules, createDefaultModule(type)],
        }));
      },

      addTypeChartModule: () => {
        set((state) => ({
          modules: [...state.modules, createDefaultModule("type-chart")],
        }));
      },

      removeModule: (id) => {
        const state = get();
        const module = state.modules.find((m) => m.id === id);

        // Save to recent searches if it has a Pokemon
        if (module && module.moduleType === "pokemon" && module.pokemonName) {
          const { id: _id, moduleType: _type, ...moduleState } = module;
          const existingIndex = state.recentSearches.findIndex(
            (r) => r.pokemonName === module.pokemonName
          );

          let newRecentSearches = [...state.recentSearches];

          // Remove existing entry if present
          if (existingIndex !== -1) {
            newRecentSearches.splice(existingIndex, 1);
          }

          // Add to front
          newRecentSearches.unshift({
            pokemonName: module.pokemonName,
            moduleState,
            timestamp: Date.now(),
          });

          // Limit to MAX_RECENT_SEARCHES
          newRecentSearches = newRecentSearches.slice(0, MAX_RECENT_SEARCHES);

          set({
            modules: state.modules.filter((m) => m.id !== id),
            recentSearches: newRecentSearches,
          });
        } else {
          set({
            modules: state.modules.filter((m) => m.id !== id),
          });
        }
      },

      updateModule: (id, updates) => {
        set((state) => ({
          modules: state.modules.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        }));
      },

      setPokemon: (id, pokemonName) => {
        const state = get();
        const module = state.modules.find((m) => m.id === id);

        // Save current Pokemon to recent before switching (if exists)
        if (module && module.moduleType === "pokemon" && module.pokemonName && module.pokemonName !== pokemonName) {
          const { id: _id, moduleType: _type, ...moduleState } = module;
          const existingIndex = state.recentSearches.findIndex(
            (r) => r.pokemonName === module.pokemonName
          );

          let newRecentSearches = [...state.recentSearches];

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
            modules: state.modules.map((m) =>
              m.id === id ? { ...m, pokemonName } : m
            ),
            recentSearches: newRecentSearches,
          });
        } else {
          set({
            modules: state.modules.map((m) =>
              m.id === id ? { ...m, pokemonName } : m
            ),
          });
        }
      },

      setActiveTab: (id, tab) => {
        set((state) => ({
          modules: state.modules.map((m) =>
            m.id === id ? { ...m, activeTab: tab } : m
          ),
        }));
      },

      toggleMinimize: (id) => {
        set((state) => ({
          modules: state.modules.map((m) =>
            m.id === id ? { ...m, isMinimized: !m.isMinimized } : m
          ),
        }));
      },

      reorderModules: (activeId, overId) => {
        set((state) => {
          const oldIndex = state.modules.findIndex((m) => m.id === activeId);
          const newIndex = state.modules.findIndex((m) => m.id === overId);

          if (oldIndex === -1 || newIndex === -1) return state;

          const newModules = [...state.modules];
          const [removed] = newModules.splice(oldIndex, 1);
          newModules.splice(newIndex, 0, removed);

          return { modules: newModules };
        });
      },

      bringModuleToFront: (id) => {
        set((state) => {
          const index = state.modules.findIndex((m) => m.id === id);
          if (index === -1 || index === 0) return state;

          const newModules = [...state.modules];
          const [removed] = newModules.splice(index, 1);
          newModules.unshift(removed);

          return { modules: newModules };
        });
      },

      setStatModifiers: (id, modifiers) => {
        set((state) => ({
          modules: state.modules.map((m) =>
            m.id === id
              ? { ...m, statModifiers: { ...m.statModifiers, ...modifiers } }
              : m
          ),
        }));
      },

      setLevel: (id, level) => {
        set((state) => ({
          modules: state.modules.map((m) =>
            m.id === id
              ? {
                  ...m,
                  statModifiers: {
                    ...m.statModifiers,
                    level: clampLevel(level),
                  },
                }
              : m
          ),
        }));
      },

      setIv: (id, stat, value) => {
        set((state) => ({
          modules: state.modules.map((m) =>
            m.id === id
              ? {
                  ...m,
                  statModifiers: {
                    ...m.statModifiers,
                    ivs: { ...m.statModifiers.ivs, [stat]: clampIv(value) },
                  },
                }
              : m
          ),
        }));
      },

      setEv: (id, stat, value) => {
        set((state) => ({
          modules: state.modules.map((m) => {
            if (m.id !== id) return m;

            const clampedValue = clampEv(value);
            const newEvs = { ...m.statModifiers.evs, [stat]: clampedValue };
            const total = getEvTotal(newEvs);

            if (total > 510) {
              const excess = total - 510;
              newEvs[stat] = Math.max(0, clampedValue - excess);
            }

            return {
              ...m,
              statModifiers: {
                ...m.statModifiers,
                evs: newEvs,
              },
            };
          }),
        }));
      },

      setAllIvs: (id, value) => {
        const clampedValue = clampIv(value);
        set((state) => ({
          modules: state.modules.map((m) =>
            m.id === id
              ? {
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
                }
              : m
          ),
        }));
      },

      setAllEvs: (id, evs) => {
        set((state) => ({
          modules: state.modules.map((m) =>
            m.id === id
              ? {
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
                }
              : m
          ),
        }));
      },

      setNature: (id, nature) => {
        set((state) => ({
          modules: state.modules.map((m) =>
            m.id === id
              ? { ...m, statModifiers: { ...m.statModifiers, nature } }
              : m
          ),
        }));
      },

      toggleCalculatedStats: (id) => {
        set((state) => ({
          modules: state.modules.map((m) =>
            m.id === id
              ? { ...m, showCalculatedStats: !m.showCalculatedStats }
              : m
          ),
        }));
      },

      resetStatModifiers: (id) => {
        set((state) => ({
          modules: state.modules.map((m) =>
            m.id === id
              ? { ...m, statModifiers: { ...DEFAULT_STAT_MODIFIERS } }
              : m
          ),
        }));
      },

      restoreFromRecent: (pokemonName) => {
        const state = get();
        const recent = state.recentSearches.find((r) => r.pokemonName === pokemonName);

        if (recent) {
          const newModule: PokemonModule = {
            id: uuidv4(),
            moduleType: "pokemon",
            ...recent.moduleState,
          };

          const newRecentSearches = state.recentSearches.filter(
            (r) => r.pokemonName !== pokemonName
          );

          set({
            modules: [...state.modules, newModule],
            recentSearches: newRecentSearches,
          });
        }
      },

      clearRecentSearches: () => {
        set({ recentSearches: [] });
      },
    }),
    {
      name: "thundderrdex-modules",
      partialize: (state) => ({
        modules: state.modules,
        recentSearches: state.recentSearches,
      }),
    }
  )
);
