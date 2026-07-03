import { describe, it, expect, beforeEach } from "vitest";
import { v4 as uuidv4 } from "uuid";
import { useModuleStore } from "./moduleStore";
import type { WorkspaceTab, PokemonModule, ScoutingModule } from "@/types/module";

const get = () => useModuleStore.getState();

function makeTab(name = "Main"): WorkspaceTab {
  return {
    id: uuidv4(),
    name,
    modules: [
      {
        id: uuidv4(),
        moduleType: "pokemon",
        pokemonName: null,
        isMinimized: false,
        activeTab: "stats",
        statModifiers: {} as PokemonModule["statModifiers"],
        showCalculatedStats: false,
      } as PokemonModule,
    ],
    recentSearches: [],
  };
}

beforeEach(() => {
  const tab = makeTab();
  useModuleStore.setState({
    tabs: [tab],
    activeTabId: tab.id,
    selectedModuleId: tab.modules[0].id,
    pendingTabRemoval: null,
    newlyCreatedModuleId: null,
    savedTeams: [],
  });
});

const activeModules = () => {
  const s = get();
  return s.tabs.find((t) => t.id === s.activeTabId)!.modules;
};
const scouting = () => activeModules().find((m) => m.moduleType === "scouting") as ScoutingModule;

describe("moduleStore - scouting", () => {
  it("addScoutingModule appends a scouting module with 6 empty slots and selects it", () => {
    get().addScoutingModule();
    const m = scouting();
    expect(m).toBeTruthy();
    expect(m.slots).toEqual([null, null, null, null, null, null]);
    expect(get().selectedModuleId).toBe(m.id);
    expect(get().newlyCreatedModuleId).toBe(m.id);
  });

  it("setScoutingSlot fills one slot without touching the others", () => {
    get().addScoutingModule();
    const id = scouting().id;
    get().setScoutingSlot(id, 2, "incineroar");
    expect(scouting().slots).toEqual([null, null, "incineroar", null, null, null]);
  });

  it("clearScoutingSlot resets one slot to null", () => {
    get().addScoutingModule();
    const id = scouting().id;
    get().setScoutingSlot(id, 0, "rillaboom");
    get().clearScoutingSlot(id, 0);
    expect(scouting().slots[0]).toBeNull();
  });
});
