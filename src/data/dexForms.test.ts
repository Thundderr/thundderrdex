import { describe, it, expect } from "vitest";
import { resolveDexForm } from "./dexForms";

describe("resolveDexForm - native region dexes", () => {
  it("resolves an Alolan form in an Alola dex (Vulpix #37 in original-alola, id 16)", () => {
    const form = resolveDexForm(16, 37);
    expect(form).not.toBeNull();
    expect(form?.variantName).toBe("vulpix-alola");
    expect(form?.displayName).toBe("Alolan Vulpix");
    expect(form?.region).toBe("alola");
    expect(typeof form?.formId).toBe("number");
  });

  it("resolves a Galarian form in the Galar dex (Ponyta #77 in galar, id 27)", () => {
    const form = resolveDexForm(27, 77);
    expect(form?.variantName).toBe("ponyta-galar");
    expect(form?.region).toBe("galar");
  });

  it("resolves a Hisuian form in the Hisui dex (Growlithe #58 in hisui, id 30)", () => {
    const form = resolveDexForm(30, 58);
    expect(form?.variantName).toBe("growlithe-hisui");
    expect(form?.region).toBe("hisui");
  });

  it("resolves a Paldean form in the Paldea dex (Wooper #194 in paldea, id 31)", () => {
    const form = resolveDexForm(31, 194);
    expect(form?.variantName).toBe("wooper-paldea");
    expect(form?.region).toBe("paldea");
  });

  it("resolves Paldean Tauros to the first (Combat) breed in the Paldea dex", () => {
    const form = resolveDexForm(31, 128);
    expect(form?.variantName).toBe("tauros-paldea-combat-breed");
  });

  it("returns null for a species with no regional form in a native dex", () => {
    // Bulbasaur #1 has no Alolan form
    expect(resolveDexForm(16, 1)).toBeNull();
  });
});

describe("resolveDexForm - cross-region override dexes", () => {
  it("blueberry (id 33) imports Galarian Slowpoke (#79)", () => {
    const form = resolveDexForm(33, 79);
    expect(form?.variantName).toBe("slowpoke-galar");
    expect(form?.region).toBe("galar");
  });

  it("blueberry imports Alolan Sandshrew (#27)", () => {
    expect(resolveDexForm(33, 27)?.variantName).toBe("sandshrew-alola");
  });

  it("blueberry imports the Combat-breed Paldean Tauros (#128)", () => {
    expect(resolveDexForm(33, 128)?.variantName).toBe(
      "tauros-paldea-combat-breed"
    );
  });

  it("lumiose-city (id 34) imports Alolan Raichu (#26)", () => {
    expect(resolveDexForm(34, 26)?.variantName).toBe("raichu-alola");
  });

  it("hyperspace (id 35) imports Galarian Meowth (#52) as the representative", () => {
    expect(resolveDexForm(35, 52)?.variantName).toBe("meowth-galar");
  });

  it("returns null for a national id not present in the override map", () => {
    // #1 (Bulbasaur) is not in blueberry's override list
    expect(resolveDexForm(33, 1)).toBeNull();
  });
});

describe("resolveDexForm - dexes that show only base forms", () => {
  it("Kanto dex (id 2) resolves no forms", () => {
    expect(resolveDexForm(2, 37)).toBeNull(); // Vulpix base, not Alolan
  });

  it("Kitakami dex (id 32) shows base Wooper, not Paldean", () => {
    // Kitakami is in the Paldea group but intentionally excluded from DEX_FORM_REGION
    expect(resolveDexForm(32, 194)).toBeNull();
  });
});

describe("resolveDexForm - invalid input", () => {
  it("returns null for an unknown dex id", () => {
    expect(resolveDexForm(99999, 37)).toBeNull();
  });

  it("returns null for an unknown national id in a native dex", () => {
    expect(resolveDexForm(16, 99999)).toBeNull();
  });
});
