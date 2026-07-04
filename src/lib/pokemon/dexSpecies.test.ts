import { describe, it, expect } from "vitest";
import { transformDexSpecies } from "./dexSpecies";

describe("transformDexSpecies", () => {
  it("builds a Pokemon from @pkmn/dex for a Champions mega", () => {
    const p = transformDexSpecies("Pyroar-Mega");
    expect(p.name).toBe("pyroar-mega");
    expect(p.displayName).toBe("Mega Pyroar");
    expect(p.types.map((t) => t.name)).toEqual(["fire", "normal"]);
    expect(p.stats.total).toBe(p.stats.hp + p.stats.attack + p.stats.defense + p.stats.specialAttack + p.stats.specialDefense + p.stats.speed);
    expect(p.sprites.front_default).toBe("https://play.pokemonshowdown.com/sprites/ani/pyroar-mega.gif");
  });
  it("builds a Pokemon for a regular alt form", () => {
    const p = transformDexSpecies("Landorus-Therian");
    expect(p.displayName).toBe("Landorus Therian");
    expect(p.types.map((t) => t.name).sort()).toEqual(["flying", "ground"]);
    expect(p.abilities.some((a) => a.displayName === "Intimidate")).toBe(true);
  });
  it("throws on an unknown species", () => {
    expect(() => transformDexSpecies("Notapokemon")).toThrow();
  });
});
