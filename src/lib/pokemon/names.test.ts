import { describe, it, expect } from "vitest";
import { toShowdownName, toUsageSpecies, resolveShowdown } from "./names";

describe("toShowdownName (→ @smogon/calc + @smogon/sets key)", () => {
  it("passes through base species and keeps spaces/punctuation", () => {
    expect(toShowdownName("incineroar")).toBe("Incineroar");
    expect(toShowdownName("tapu-koko")).toBe("Tapu Koko");
    expect(toShowdownName("type-null")).toBe("Type: Null");
    expect(toShowdownName("mr-rime")).toBe("Mr. Rime");
  });
  it("resolves form suffixes @pkmn/dex knows to their Showdown display", () => {
    expect(toShowdownName("urshifu-rapid-strike")).toBe("Urshifu-Rapid-Strike");
    expect(toShowdownName("urshifu-single-strike")).toBe("Urshifu");
    expect(toShowdownName("raichu-alola")).toBe("Raichu-Alola");
    expect(toShowdownName("tornadus-incarnate")).toBe("Tornadus");
  });
  it("resolves gendered/cosmetic forms via overrides", () => {
    expect(toShowdownName("basculegion-male")).toBe("Basculegion");
    expect(toShowdownName("basculegion-female")).toBe("Basculegion-F");
    expect(toShowdownName("indeedee-female")).toBe("Indeedee-F");
    expect(toShowdownName("tauros-paldea-aqua-breed")).toBe("Tauros-Paldea-Aqua");
    expect(toShowdownName("maushold-family-of-four")).toBe("Maushold");
  });
});

describe("toUsageSpecies (→ Smogon usage `species` key)", () => {
  it("is toAppSpecies of the Showdown name", () => {
    expect(toUsageSpecies("tapu-koko")).toBe("tapu-koko");
    expect(toUsageSpecies("type-null")).toBe("type:-null");
    expect(toUsageSpecies("mr-rime")).toBe("mr.-rime");
    expect(toUsageSpecies("basculegion-male")).toBe("basculegion");
    expect(toUsageSpecies("basculegion-female")).toBe("basculegion-f");
    expect(toUsageSpecies("urshifu-single-strike")).toBe("urshifu");
  });
});

describe("resolveShowdown.resolved flag", () => {
  it("is true for real species, false for junk", () => {
    expect(resolveShowdown("incineroar").resolved).toBe(true);
    expect(resolveShowdown("basculegion-male").resolved).toBe(true);
    expect(resolveShowdown("notapokemon").resolved).toBe(false);
    expect(resolveShowdown("notapokemon").showdownName).toBe("Notapokemon"); // graceful fallback string
  });
});
