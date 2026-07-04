import { describe, it, expect } from "vitest";
import { transformDexSpecies } from "./championsData";

describe("transformDexSpecies", () => {
  const p = transformDexSpecies("pyroar-mega");

  it("maps identity + display", () => {
    expect(p.name).toBe("pyroar-mega");
    expect(p.displayName).toBe("Mega Pyroar");
    expect(p.generation).toBe(9);
  });
  it("maps @pkmn/dex base stats", () => {
    // Mega Pyroar's own stats; total is the sum of the six.
    const s = p.stats;
    expect(s.total).toBe(s.hp + s.attack + s.defense + s.specialAttack + s.specialDefense + s.speed);
    expect(s.total).toBeGreaterThan(0);
  });
  it("maps types with colors", () => {
    expect(p.types.map((t) => t.name)).toEqual(["fire", "normal"]);
    expect(p.types[0].color).toMatch(/^#/);
  });
  it("maps abilities (hidden flagged)", () => {
    const names = p.abilities.map((a) => a.displayName);
    expect(names).toContain("Rivalry");
    expect(p.abilities.some((a) => a.isHidden)).toBe(true); // Moxie is the H slot
  });
  it("uses the Showdown ani sprite", () => {
    expect(p.sprites.front_default).toBe("https://play.pokemonshowdown.com/sprites/ani/pyroar-mega.gif");
  });
});
