import { describe, it, expect } from "vitest";
import { getRoster, isAppPokemon } from "./roster";
import { getRegionalVariantInfo } from "@/lib/utils/generationConfig";

describe("roster ↔ regional gating consistency", () => {
  // Every regional-variant roster entry's id must resolve via getRegionalVariantInfo,
  // or its generation gating (and regional badge) silently breaks. Guards @pkmn ↔
  // PokéAPI/REGIONAL_VARIANTS naming drift (e.g. Darmanitan-Galar vs -galar-standard).
  it("every regional roster entry resolves via getRegionalVariantInfo", () => {
    const regionals = getRoster().filter((e) => /-(Alola|Galar|Hisui|Paldea)\b/.test(e.showdownName));
    const broken = regionals
      .filter((e) => !getRegionalVariantInfo(e.id))
      .map((e) => `${e.showdownName} (id=${e.id})`);
    expect(broken).toEqual([]);
  });
});

describe("getRoster", () => {
  const roster = getRoster();
  const byDisplay = new Map(roster.map((e) => [e.displayName, e]));

  it("names base species plainly and includes their alt battle forms", () => {
    expect(byDisplay.has("Landorus")).toBe(true);
    expect(byDisplay.has("Landorus-Therian")).toBe(true);
    expect(byDisplay.get("Landorus")!.forme).toBe("");
    expect(byDisplay.has("Shaymin")).toBe(true);
    expect(byDisplay.has("Shaymin-Sky")).toBe(true);
  });
  it("resolves alt-form ids to their PokéAPI slugs", () => {
    expect(byDisplay.get("Landorus-Therian")!.id).toBe("landorus-therian");
    expect(byDisplay.get("Landorus")!.id).toBe("landorus-incarnate");
  });
  it("includes megas and regionals uniformly", () => {
    expect(byDisplay.has("Charizard-Mega-X")).toBe(true);
    expect(byDisplay.has("Raichu-Alola")).toBe(true);
  });
  it("excludes cosmetic patterns, gender forms, and CAP", () => {
    expect(byDisplay.has("Vivillon-Fancy")).toBe(false); // cosmetic
    expect(byDisplay.has("Meowstic-F")).toBe(false); // gender → Phase 2
    expect(byDisplay.has("Meowstic")).toBe(true); // base kept
    expect(byDisplay.has("Crucibelle-Mega")).toBe(false); // CAP
    expect(roster.some((e) => /-Gmax$/.test(e.showdownName))).toBe(false);
  });
  it("flags Champions megas", () => {
    expect(byDisplay.get("Pyroar-Mega")?.isChampionsMega).toBe(true);
  });
});

describe("isAppPokemon", () => {
  it("matches roster ids", () => {
    expect(isAppPokemon("landorus-therian")).toBe(true);
    expect(isAppPokemon("not-a-pokemon")).toBe(false);
  });
});
