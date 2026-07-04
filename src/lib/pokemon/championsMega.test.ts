import { describe, it, expect } from "vitest";
import { getChampionsMegas, isChampionsMega } from "./championsMega";

describe("getChampionsMegas", () => {
  const megas = getChampionsMegas();
  const byName = new Map(megas.map((m) => [m.name, m]));

  it("includes new Champions megas with correct fields", () => {
    const pyroar = byName.get("pyroar-mega");
    expect(pyroar).toBeDefined();
    expect(pyroar!.displayName).toBe("Mega Pyroar");
    expect(pyroar!.stone).toBe("Pyroarite");
    expect(pyroar!.types).toEqual(["fire", "normal"]);
    expect(pyroar!.baseSpecies).toBe("Pyroar");

    const floette = byName.get("floette-mega");
    expect(floette!.displayName).toBe("Mega Floette");
    expect(floette!.stone).toBe("Floettite");
    expect(floette!.changesFrom).toBe("Floette-Eternal");
  });

  it("derives X/Y display names", () => {
    expect(byName.get("raichu-mega-x")?.displayName).toBe("Mega Raichu X");
    expect(byName.get("raichu-mega-y")?.displayName).toBe("Mega Raichu Y");
  });

  it("excludes mainline megas and CAP", () => {
    expect(byName.has("charizard-mega-y")).toBe(false); // mainline (isNonstandard Past)
    expect(byName.has("crucibelle-mega")).toBe(false); // CAP
  });

  it("returns a stable non-trivial roster", () => {
    expect(megas.length).toBeGreaterThan(20);
  });
});

describe("isChampionsMega", () => {
  it("is true only for Champions megas", () => {
    expect(isChampionsMega("pyroar-mega")).toBe(true);
    expect(isChampionsMega("floette-mega")).toBe(true);
    expect(isChampionsMega("charizard-mega-y")).toBe(false);
    expect(isChampionsMega("incineroar")).toBe(false);
  });
});
