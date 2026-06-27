import { describe, it, expect } from "vitest";
import {
  itemDisplayName,
  moveDisplayName,
  abilityDisplayName,
  speciesDisplayName,
  teraDisplayName,
  speciesTypes,
  moveInfo,
} from "./dexNames";

// These wrap @pkmn/dex; the tests double as a guard against the dep changing shape.
describe("display name resolution (condensed id → name)", () => {
  it("resolves items, moves, abilities, species", () => {
    expect(itemDisplayName("choicescarf")).toBe("Choice Scarf");
    expect(moveDisplayName("closecombat")).toBe("Close Combat");
    expect(moveDisplayName("uturn")).toBe("U-turn");
    expect(abilityDisplayName("roughskin")).toBe("Rough Skin");
    expect(speciesDisplayName("greattusk")).toBe("Great Tusk");
  });

  it("falls back to the raw id for unknown entries", () => {
    expect(itemDisplayName("notanitem")).toBe("notanitem");
    expect(moveDisplayName("notamove")).toBe("notamove");
  });

  it("title-cases Tera ids", () => {
    expect(teraDisplayName("water")).toBe("Water");
  });
});

describe("speciesTypes", () => {
  it("returns lowercase type ids", () => {
    expect(speciesTypes("garchomp")).toEqual(["dragon", "ground"]);
    expect(speciesTypes("incineroar")).toEqual(["fire", "dark"]);
  });

  it("returns null for unknown species", () => {
    expect(speciesTypes("notapokemon")).toBeNull();
  });
});

describe("moveInfo", () => {
  it("reports attacking type and whether it deals damage", () => {
    expect(moveInfo("earthquake")).toEqual({ type: "ground", damaging: true });
    expect(moveInfo("flamethrower")).toEqual({ type: "fire", damaging: true });
  });

  it("flags status moves as non-damaging", () => {
    expect(moveInfo("protect")?.damaging).toBe(false);
    expect(moveInfo("swordsdance")?.damaging).toBe(false);
  });

  it("returns null for unknown moves", () => {
    expect(moveInfo("notamove")).toBeNull();
  });
});
