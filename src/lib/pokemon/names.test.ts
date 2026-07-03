import { describe, it, expect } from "vitest";
import { toShowdownName, toUsageSpecies, resolveShowdown, toPokeApiName } from "./names";

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

describe("toPokeApiName (→ PokéAPI slug for usePokemon)", () => {
  it("passes through names whose general transform is a valid slug", () => {
    expect(toPokeApiName("Incineroar").pokeApiName).toBe("incineroar");
    expect(toPokeApiName("Urshifu-Rapid-Strike").pokeApiName).toBe("urshifu-rapid-strike");
    expect(toPokeApiName("Tapu Koko").pokeApiName).toBe("tapu-koko");
    expect(toPokeApiName("Mr. Rime").pokeApiName).toBe("mr-rime");
    expect(toPokeApiName("Type: Null").pokeApiName).toBe("type-null");
  });
  it("maps gendered/cosmetic Showdown names to PokéAPI slugs via overrides", () => {
    expect(toPokeApiName("Basculegion").pokeApiName).toBe("basculegion-male");
    expect(toPokeApiName("Basculegion-F").pokeApiName).toBe("basculegion-female");
    expect(toPokeApiName("Indeedee-F").pokeApiName).toBe("indeedee-female");
    expect(toPokeApiName("Tauros-Paldea-Aqua").pokeApiName).toBe("tauros-paldea-aqua-breed");
    expect(toPokeApiName("Maushold").pokeApiName).toBe("maushold-family-of-four");
  });
  it("maps base forms whose PokéAPI default is suffixed", () => {
    expect(toPokeApiName("Urshifu").pokeApiName).toBe("urshifu-single-strike");
    expect(toPokeApiName("Tornadus").pokeApiName).toBe("tornadus-incarnate");
    expect(toPokeApiName("Lycanroc").pokeApiName).toBe("lycanroc-midday");
  });
  it("accepts usage-key input too (basculegion-f → basculegion-female)", () => {
    expect(toPokeApiName("basculegion-f").pokeApiName).toBe("basculegion-female");
  });
  it("flags unresolved names", () => {
    expect(toPokeApiName("notapokemon").resolved).toBe(false);
  });
  it("strips curly apostrophe (U+2019) from names like Farfetch’d and Sirfetch’d", () => {
    expect(toPokeApiName("Farfetch’d").pokeApiName).toBe("farfetchd");
    expect(toPokeApiName("Sirfetch’d").pokeApiName).toBe("sirfetchd");
  });
});
