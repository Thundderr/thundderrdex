import { describe, it, expect, beforeEach } from "vitest";
import { v4 as uuidv4 } from "uuid";
import { useModuleStore } from "./moduleStore";
import type { WorkspaceTab, DamageCalcModule, PokemonModule } from "@/types/module";

const get = () => useModuleStore.getState();

// Build a clean, single-tab/single-module workspace for each test. This store is
// a singleton with a persisted/initial tab, so we reset to a deterministic state.
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

const activeTab = () => {
  const s = get();
  return s.tabs.find((t) => t.id === s.activeTabId)!;
};
const activeModules = () => activeTab().modules;

describe("moduleStore - workspace tabs", () => {
  it("addWorkspaceTab appends a new tab and activates it", () => {
    const before = get().tabs.length;
    get().addWorkspaceTab();
    const s = get();
    expect(s.tabs.length).toBe(before + 1);
    expect(s.activeTabId).toBe(s.tabs[s.tabs.length - 1].id);
    // New tab seeds a default module and marks it newly created.
    expect(s.newlyCreatedModuleId).toBe(activeModules()[0].id);
    expect(s.selectedModuleId).toBe(activeModules()[0].id);
  });

  it("removeWorkspaceTab removes a tab but refuses to remove the last one", () => {
    get().addWorkspaceTab();
    const second = get().activeTabId;
    get().removeWorkspaceTab(second);
    expect(get().tabs.find((t) => t.id === second)).toBeUndefined();

    // Now only one tab remains; removing it is a no-op.
    const onlyId = get().tabs[0].id;
    get().removeWorkspaceTab(onlyId);
    expect(get().tabs.length).toBe(1);
  });

  it("renameWorkspaceTab updates the name", () => {
    const id = get().tabs[0].id;
    get().renameWorkspaceTab(id, "Renamed");
    expect(get().tabs[0].name).toBe("Renamed");
  });

  it("setActiveWorkspaceTab switches active tab and selects its first module", () => {
    const firstId = get().tabs[0].id;
    get().addWorkspaceTab();
    get().setActiveWorkspaceTab(firstId);
    expect(get().activeTabId).toBe(firstId);
    expect(get().selectedModuleId).toBe(
      get().tabs.find((t) => t.id === firstId)!.modules[0].id
    );
  });

  describe("tab navigation (goToPreviousTab / goToNextTab)", () => {
    it("goToNextTab advances to the next tab", () => {
      const firstId = get().tabs[0].id;
      get().addWorkspaceTab();
      const secondId = get().tabs[1].id;
      get().setActiveWorkspaceTab(firstId);

      get().goToNextTab();
      expect(get().activeTabId).toBe(secondId);
    });

    it("goToPreviousTab moves back to the previous tab", () => {
      get().addWorkspaceTab(); // now on second
      const firstId = get().tabs[0].id;
      get().goToPreviousTab();
      expect(get().activeTabId).toBe(firstId);
    });

    // The implementation clamps at the boundaries rather than wrapping around.
    it("goToNextTab does NOT wrap past the last tab (clamps)", () => {
      get().addWorkspaceTab(); // active = last tab
      const lastId = get().activeTabId;
      get().goToNextTab();
      expect(get().activeTabId).toBe(lastId);
    });

    it("goToPreviousTab does NOT wrap before the first tab (clamps)", () => {
      get().addWorkspaceTab();
      const firstId = get().tabs[0].id;
      get().setActiveWorkspaceTab(firstId);
      get().goToPreviousTab();
      expect(get().activeTabId).toBe(firstId);
    });
  });

  it("reorderTabs moves a tab to a new position", () => {
    get().addWorkspaceTab();
    get().addWorkspaceTab();
    const [a, b, c] = get().tabs.map((t) => t.id);
    get().reorderTabs(a, c); // move first tab to where third is
    expect(get().tabs.map((t) => t.id)).toEqual([b, c, a]);
  });

  describe("tab removal confirmation flow", () => {
    it("requestRemoveTab then confirmRemoveTab removes the tab", () => {
      get().addWorkspaceTab();
      const target = get().activeTabId;
      get().requestRemoveTab(target);
      expect(get().pendingTabRemoval).toBe(target);
      get().confirmRemoveTab();
      expect(get().tabs.find((t) => t.id === target)).toBeUndefined();
      expect(get().pendingTabRemoval).toBeNull();
    });

    it("cancelRemoveTab clears the pending removal without deleting", () => {
      get().addWorkspaceTab();
      const target = get().activeTabId;
      const count = get().tabs.length;
      get().requestRemoveTab(target);
      get().cancelRemoveTab();
      expect(get().pendingTabRemoval).toBeNull();
      expect(get().tabs.length).toBe(count);
    });

    it("confirmRemoveTab is a no-op (only clears pending) when one tab remains", () => {
      const only = get().tabs[0].id;
      get().requestRemoveTab(only);
      get().confirmRemoveTab();
      expect(get().tabs.length).toBe(1);
      expect(get().pendingTabRemoval).toBeNull();
    });
  });
});

describe("moduleStore - module CRUD", () => {
  it.each([
    ["addModule", () => get().addModule(), "pokemon"],
    ["addTypeChartModule", () => get().addTypeChartModule(), "type-chart"],
    ["addNatureChartModule", () => get().addNatureChartModule(), "nature-chart"],
    ["addTeamBuilderModule", () => get().addTeamBuilderModule(), "team-builder"],
    ["addDamageCalcModule", () => get().addDamageCalcModule(), "damage-calc"],
    ["addPokedexModule", () => get().addPokedexModule(), "pokedex"],
    ["addCatchRateModule", () => get().addCatchRateModule(), "catch-rate"],
    ["addLocationModule", () => get().addLocationModule(), "location"],
  ])("%s appends a module of the right type and sets new/selected ids", (_name, add, type) => {
    const before = activeModules().length;
    add();
    const mods = activeModules();
    expect(mods.length).toBe(before + 1);
    const created = mods[mods.length - 1];
    expect(created.moduleType).toBe(type);
    expect(get().newlyCreatedModuleId).toBe(created.id);
    expect(get().selectedModuleId).toBe(created.id);
  });

  it("addPokemonModule appends a pokemon module with the given name", () => {
    get().addPokemonModule("pikachu", "moves");
    const mods = activeModules();
    const created = mods[mods.length - 1] as PokemonModule;
    expect(created.moduleType).toBe("pokemon");
    expect(created.pokemonName).toBe("pikachu");
    expect(created.activeTab).toBe("moves");
    expect(get().selectedModuleId).toBe(created.id);
  });

  it("clearNewlyCreatedModule resets the flag", () => {
    get().addModule();
    expect(get().newlyCreatedModuleId).not.toBeNull();
    get().clearNewlyCreatedModule();
    expect(get().newlyCreatedModuleId).toBeNull();
  });

  it("selectModule sets the selected module id", () => {
    get().addTypeChartModule();
    const firstId = activeModules()[0].id;
    get().selectModule(firstId);
    expect(get().selectedModuleId).toBe(firstId);
  });

  describe("removeModule", () => {
    it("removes a module from the active tab", () => {
      get().addTypeChartModule();
      const target = activeModules()[activeModules().length - 1].id;
      get().removeModule(target);
      expect(activeModules().find((m) => m.id === target)).toBeUndefined();
    });

    it("reselects a remaining module when the selected one is removed", () => {
      get().addTypeChartModule(); // now 2 modules; second is selected
      const selected = get().selectedModuleId!;
      get().removeModule(selected);
      expect(get().selectedModuleId).not.toBe(selected);
      expect(get().selectedModuleId).toBe(activeModules()[0].id);
    });

    it("sets selectedModuleId to null when the last module is removed", () => {
      const only = activeModules()[0].id;
      get().removeModule(only);
      expect(activeModules().length).toBe(0);
      expect(get().selectedModuleId).toBeNull();
    });

    it("saves a named pokemon module into recent searches on removal", () => {
      const id = activeModules()[0].id;
      get().setPokemon(id, "bulbasaur");
      get().removeModule(id);
      const recents = get().getRecentSearches();
      expect(recents.some((r) => r.pokemonName === "bulbasaur")).toBe(true);
    });
  });
});

describe("moduleStore - toggles and sizing", () => {
  it("toggleMinimize flips isMinimized", () => {
    const id = activeModules()[0].id;
    expect(activeModules()[0].isMinimized).toBe(false);
    get().toggleMinimize(id);
    expect(activeModules()[0].isMinimized).toBe(true);
    get().toggleMinimize(id);
    expect(activeModules()[0].isMinimized).toBe(false);
  });

  it("toggleExtended flips isExtended", () => {
    const id = activeModules()[0].id;
    get().toggleExtended(id);
    expect(activeModules()[0].isExtended).toBe(true);
    get().toggleExtended(id);
    expect(activeModules()[0].isExtended).toBe(false);
  });

  it("toggleFullscreen sets the target fullscreen and clears others", () => {
    get().addTypeChartModule();
    const [first, second] = activeModules().map((m) => m.id);

    get().toggleFullscreen(first);
    expect(activeModules().find((m) => m.id === first)!.isFullscreen).toBe(true);
    expect(activeModules().find((m) => m.id === second)!.isFullscreen).toBe(false);

    // Fullscreening another clears the first.
    get().toggleFullscreen(second);
    expect(activeModules().find((m) => m.id === first)!.isFullscreen).toBe(false);
    expect(activeModules().find((m) => m.id === second)!.isFullscreen).toBe(true);

    // Toggling the same one off.
    get().toggleFullscreen(second);
    expect(activeModules().find((m) => m.id === second)!.isFullscreen).toBe(false);
  });

  describe("setModuleSize", () => {
    it("sets custom width and height (rounded, width clamped to >= 1)", () => {
      const id = activeModules()[0].id;
      get().setModuleSize(id, { widthCols: 3.7, height: 240.4 });
      const m = activeModules()[0];
      expect(m.customWidthCols).toBe(4);
      expect(m.customHeight).toBe(240);
    });

    it("clamps width to a minimum of 1", () => {
      const id = activeModules()[0].id;
      get().setModuleSize(id, { widthCols: 0 });
      expect(activeModules()[0].customWidthCols).toBe(1);
    });

    it("null clears a dimension back to default", () => {
      const id = activeModules()[0].id;
      get().setModuleSize(id, { widthCols: 5, height: 300 });
      get().setModuleSize(id, { widthCols: null });
      const m = activeModules()[0];
      expect(m.customWidthCols).toBeUndefined();
      expect(m.customHeight).toBe(300); // unchanged
    });

    it("undefined leaves a dimension unchanged", () => {
      const id = activeModules()[0].id;
      get().setModuleSize(id, { widthCols: 5, height: 300 });
      get().setModuleSize(id, { height: 400 }); // widthCols undefined
      const m = activeModules()[0];
      expect(m.customWidthCols).toBe(5);
      expect(m.customHeight).toBe(400);
    });
  });

  it("reorderModules moves a module to a new position", () => {
    get().addTypeChartModule();
    get().addNatureChartModule();
    const [a, b, c] = activeModules().map((m) => m.id);
    get().reorderModules(a, c);
    expect(activeModules().map((m) => m.id)).toEqual([b, c, a]);
  });

  it("bringModuleToFront moves a module to index 0", () => {
    get().addTypeChartModule();
    get().addNatureChartModule();
    const ids = activeModules().map((m) => m.id);
    const last = ids[2];
    get().bringModuleToFront(last);
    expect(activeModules()[0].id).toBe(last);
  });
});

describe("moduleStore - recent searches", () => {
  it("setPokemon archives the previous pokemon into recents when changed", () => {
    const id = activeModules()[0].id;
    get().setPokemon(id, "charmander");
    get().setPokemon(id, "squirtle"); // archives charmander
    const recents = get().getRecentSearches();
    expect(recents[0].pokemonName).toBe("charmander");
  });

  it("restoreFromRecent re-adds a module and removes that recent entry", () => {
    const id = activeModules()[0].id;
    get().setPokemon(id, "eevee");
    get().setPokemon(id, "vaporeon"); // eevee archived
    const before = activeModules().length;

    get().restoreFromRecent("eevee");
    expect(activeModules().length).toBe(before + 1);
    expect(get().getRecentSearches().some((r) => r.pokemonName === "eevee")).toBe(false);
  });

  it("clearRecentSearches empties the active tab's recents", () => {
    const id = activeModules()[0].id;
    get().setPokemon(id, "ditto");
    get().setPokemon(id, "snorlax");
    expect(get().getRecentSearches().length).toBeGreaterThan(0);
    get().clearRecentSearches();
    expect(get().getRecentSearches()).toEqual([]);
  });

  it("caps recent searches at the max length and dedupes by name", () => {
    const id = activeModules()[0].id;
    // Push 25 distinct names through one module to overflow the cap of 20.
    for (let i = 0; i < 25; i++) {
      get().setPokemon(id, `mon-${i}`);
    }
    const recents = get().getRecentSearches();
    expect(recents.length).toBe(20);
    // Most recent archived name is mon-23 (mon-24 is still active in the module).
    expect(recents[0].pokemonName).toBe("mon-23");
  });

  it("moves an existing recent to the front rather than duplicating", () => {
    const id = activeModules()[0].id;
    get().setPokemon(id, "abra");
    get().setPokemon(id, "kadabra"); // abra archived
    get().setPokemon(id, "abra"); // kadabra archived; (re-search abra)
    get().setPokemon(id, "machop"); // abra archived again, dedupe to front
    const recents = get().getRecentSearches();
    const abraCount = recents.filter((r) => r.pokemonName === "abra").length;
    expect(abraCount).toBe(1);
    expect(recents[0].pokemonName).toBe("abra");
  });
});

describe("moduleStore - saved teams", () => {
  it("saveTeam adds a team with a generated id", () => {
    get().saveTeam("Team A", [null, null, null, null, null, null]);
    expect(get().savedTeams.length).toBe(1);
    expect(get().savedTeams[0].name).toBe("Team A");
    expect(get().savedTeams[0].id).toBeTruthy();
  });

  it("allows duplicate team names (does not dedupe)", () => {
    get().saveTeam("Dup", []);
    get().saveTeam("Dup", []);
    expect(get().savedTeams.filter((t) => t.name === "Dup").length).toBe(2);
  });

  it("deleteTeam removes a team by id", () => {
    get().saveTeam("Keep", []);
    get().saveTeam("Drop", []);
    const dropId = get().savedTeams.find((t) => t.name === "Drop")!.id;
    get().deleteTeam(dropId);
    expect(get().savedTeams.map((t) => t.name)).toEqual(["Keep"]);
  });

  it("renameTeam updates a team's name", () => {
    get().saveTeam("Old", []);
    const teamId = get().savedTeams[0].id;
    get().renameTeam(teamId, "New");
    expect(get().savedTeams[0].name).toBe("New");
  });
});

describe("moduleStore - damage calc helpers", () => {
  const addDmg = () => {
    get().addDamageCalcModule();
    return activeModules()[activeModules().length - 1].id;
  };

  it("setDamageCalcBothLevels clamps and applies to both sides", () => {
    const id = addDmg();
    get().setDamageCalcBothLevels(id, 999);
    const m = activeModules().find((x) => x.id === id) as DamageCalcModule;
    expect(m.attacker.level).toBe(100);
    expect(m.defender.level).toBe(100);

    get().setDamageCalcBothLevels(id, -5);
    const m2 = activeModules().find((x) => x.id === id) as DamageCalcModule;
    expect(m2.attacker.level).toBe(1);
  });

  it("swapDamageCalcPokemon swaps attacker/defender and resets the move", () => {
    const id = addDmg();
    get().setDamageCalcAttacker(id, { pokemonName: "garchomp" });
    get().setDamageCalcDefender(id, { pokemonName: "lapras" });
    get().setDamageCalcMove(id, "earthquake");

    get().swapDamageCalcPokemon(id);
    const m = activeModules().find((x) => x.id === id) as DamageCalcModule;
    expect(m.attacker.pokemonName).toBe("lapras");
    expect(m.defender.pokemonName).toBe("garchomp");
    expect(m.selectedMove).toBeNull();
  });

  it("resetDamageCalcGimmicks clears tera/z/dynamax across all modules and tabs", () => {
    const id = addDmg();
    get().setDamageCalcAttacker(id, {
      teraType: "Fire",
      useZMove: true,
      isDynamaxed: true,
      useGigantamax: true,
    });
    get().resetDamageCalcGimmicks();
    const m = activeModules().find((x) => x.id === id) as DamageCalcModule;
    expect(m.attacker.teraType).toBeNull();
    expect(m.attacker.useZMove).toBe(false);
    expect(m.attacker.isDynamaxed).toBe(false);
    expect(m.attacker.useGigantamax).toBe(false);
  });
});
