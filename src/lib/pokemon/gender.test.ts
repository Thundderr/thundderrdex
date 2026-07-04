import { describe, it, expect } from "vitest";
import { genderState, DISTINCT_MALE_IDS } from "./gender";
import type { Pokemon } from "@/types/pokemon";

function mon(front_female: string | null): Pokemon {
  return {
    id: 1, name: "x", displayName: "X", types: [], stats: { hp:0,attack:0,defense:0,specialAttack:0,specialDefense:0,speed:0,total:0 },
    abilities: [], sprites: { front_default: "m.png", front_shiny: null, front_female, official_artwork: null },
    generation: 9, pastTypes: [], pastAbilities: [],
  };
}

describe("DISTINCT_MALE_IDS", () => {
  it("is exactly the four distinct-gender species", () => {
    expect([...DISTINCT_MALE_IDS].sort()).toEqual(
      ["basculegion-male", "indeedee-male", "meowstic-male", "oinkologne-male"]
    );
  });
});

describe("genderState", () => {
  it("distinct: returns the female slug regardless of sprite data", () => {
    expect(genderState("basculegion-male", undefined)).toEqual({
      kind: "distinct", maleId: "basculegion-male", femaleId: "basculegion-female",
    });
  });
  it("distinct: normalizes a -female id back to its -male base so the toggle can flip back", () => {
    // The damage calc passes the currently-picked slug, which becomes -female
    // after toggling ♀; genderState must still resolve it as distinct.
    expect(genderState("basculegion-female", undefined)).toEqual({
      kind: "distinct", maleId: "basculegion-male", femaleId: "basculegion-female",
    });
  });
  it("cosmetic: returns the front_female sprite", () => {
    expect(genderState("pyroar-male", mon("f.png"))).toEqual({
      kind: "cosmetic", maleId: "pyroar-male", femaleSprite: "f.png",
    });
  });
  it("null when genderless / no female sprite", () => {
    expect(genderState("garchomp", mon(null))).toBeNull();
    expect(genderState("pyroar-male", mon(null))).toBeNull();
  });
});
