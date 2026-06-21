import { describe, it, expect } from "vitest";
import {
  getGenerationFeatures,
  TERRAIN_TYPES,
  POKEMON_TYPES,
  Z_MOVE_NAMES,
  MAX_MOVE_NAMES,
  getZMoveName,
  getMaxMoveName,
  getZMovePower,
  getMaxMovePower,
  MAX_MOVE_EFFECTS,
  getMaxMoveEffect,
  GIGANTAMAX_POKEMON,
  canGigantamax,
  getGMaxMove,
  getDynamaxHpMultiplier,
  MEGA_POKEMON,
  MEGA_STONE_MAP,
  isMegaPokemon,
  getMegaStone,
  getMegaPokemonInfo,
  REGIONAL_VARIANTS,
  isRegionalVariant,
  getRegionalVariantInfo,
  getRegionalVariantsForGeneration,
  Z_CRYSTALS,
  getZCrystals,
  isZCrystal,
  getZCrystalType,
  COMMON_COMPETITIVE_ITEMS,
  getItemsForGeneration,
  getCommonItemsForGeneration,
} from "./generationConfig";

// ============================================================
// getGenerationFeatures
// ============================================================
describe("getGenerationFeatures", () => {
  it("returns a fully-shaped feature object", () => {
    const f = getGenerationFeatures(9);
    expect(f).toHaveProperty("hasAbilities");
    expect(f).toHaveProperty("weatherTypes");
    expect(Array.isArray(f.weatherTypes)).toBe(true);
  });

  describe("core mechanics gates", () => {
    it("abilities/natures from Gen 3", () => {
      expect(getGenerationFeatures(2).hasAbilities).toBe(false);
      expect(getGenerationFeatures(3).hasAbilities).toBe(true);
      expect(getGenerationFeatures(2).hasNatures).toBe(false);
      expect(getGenerationFeatures(3).hasNatures).toBe(true);
    });

    it("items from Gen 2", () => {
      expect(getGenerationFeatures(1).hasItems).toBe(false);
      expect(getGenerationFeatures(2).hasItems).toBe(true);
    });

    it("physical/special split from Gen 4", () => {
      expect(getGenerationFeatures(3).hasPhysicalSpecialSplit).toBe(false);
      expect(getGenerationFeatures(4).hasPhysicalSpecialSplit).toBe(true);
      expect(getGenerationFeatures(9).hasPhysicalSpecialSplit).toBe(true);
    });
  });

  describe("weather", () => {
    it("hasWeather from Gen 2", () => {
      expect(getGenerationFeatures(1).hasWeather).toBe(false);
      expect(getGenerationFeatures(2).hasWeather).toBe(true);
    });

    it("Gen 1 has no weather types", () => {
      expect(getGenerationFeatures(1).weatherTypes).toEqual([]);
    });

    it("Gen 2 has base weather but no Hail", () => {
      expect(getGenerationFeatures(2).weatherTypes).toEqual(["Sun", "Rain", "Sand"]);
    });

    it("Gen 3 adds Hail (but no primal weather)", () => {
      expect(getGenerationFeatures(3).weatherTypes).toEqual(["Sun", "Rain", "Sand", "Hail"]);
    });

    it("Gen 6 adds primal weather, keeps Hail", () => {
      expect(getGenerationFeatures(6).weatherTypes).toEqual([
        "Sun", "Rain", "Sand", "Hail", "Harsh Sunshine", "Heavy Rain", "Strong Winds",
      ]);
    });

    it("Gen 8 still has Hail and primal weather", () => {
      const w = getGenerationFeatures(8).weatherTypes;
      expect(w).toContain("Hail");
      expect(w).toContain("Harsh Sunshine");
      expect(w).not.toContain("Snow");
    });

    it("Gen 9 swaps Hail for Snow and drops primal weather", () => {
      expect(getGenerationFeatures(9).weatherTypes).toEqual(["Sun", "Rain", "Sand", "Snow"]);
    });
  });

  describe("terrain / aura field effects", () => {
    it("terrains from Gen 6", () => {
      expect(getGenerationFeatures(5).hasTerrains).toBe(false);
      expect(getGenerationFeatures(6).hasTerrains).toBe(true);
    });

    it("auras from Gen 6", () => {
      expect(getGenerationFeatures(5).hasAuras).toBe(false);
      expect(getGenerationFeatures(6).hasAuras).toBe(true);
    });

    it("ruin abilities only from Gen 9", () => {
      expect(getGenerationFeatures(8).hasRuinAbilities).toBe(false);
      expect(getGenerationFeatures(9).hasRuinAbilities).toBe(true);
    });
  });

  describe("field effects", () => {
    it("Reflect/Light Screen available in all gens", () => {
      expect(getGenerationFeatures(1).hasReflectLightScreen).toBe(true);
      expect(getGenerationFeatures(9).hasReflectLightScreen).toBe(true);
    });

    it("Aurora Veil from Gen 7", () => {
      expect(getGenerationFeatures(6).hasAuroraVeil).toBe(false);
      expect(getGenerationFeatures(7).hasAuroraVeil).toBe(true);
    });

    it("Tailwind/Gravity from Gen 4", () => {
      expect(getGenerationFeatures(3).hasTailwind).toBe(false);
      expect(getGenerationFeatures(4).hasTailwind).toBe(true);
      expect(getGenerationFeatures(3).hasGravity).toBe(false);
      expect(getGenerationFeatures(4).hasGravity).toBe(true);
    });

    it("Magic Room/Wonder Room from Gen 5", () => {
      expect(getGenerationFeatures(4).hasMagicRoom).toBe(false);
      expect(getGenerationFeatures(5).hasMagicRoom).toBe(true);
      expect(getGenerationFeatures(4).hasWonderRoom).toBe(false);
      expect(getGenerationFeatures(5).hasWonderRoom).toBe(true);
    });
  });

  describe("entry hazards", () => {
    it("Spikes from Gen 2", () => {
      expect(getGenerationFeatures(1).hasSpikes).toBe(false);
      expect(getGenerationFeatures(2).hasSpikes).toBe(true);
    });

    it("Stealth Rock from Gen 4", () => {
      expect(getGenerationFeatures(3).hasStealthRock).toBe(false);
      expect(getGenerationFeatures(4).hasStealthRock).toBe(true);
    });

    it("G-Max hazards only in Gen 8", () => {
      expect(getGenerationFeatures(7).hasGMaxHazards).toBe(false);
      expect(getGenerationFeatures(8).hasGMaxHazards).toBe(true);
      expect(getGenerationFeatures(9).hasGMaxHazards).toBe(false);
    });
  });

  describe("status effects", () => {
    it("Leech Seed available all gens", () => {
      expect(getGenerationFeatures(1).hasLeechSeed).toBe(true);
      expect(getGenerationFeatures(9).hasLeechSeed).toBe(true);
    });

    it("Foresight from Gen 2", () => {
      expect(getGenerationFeatures(1).hasForesight).toBe(false);
      expect(getGenerationFeatures(2).hasForesight).toBe(true);
    });
  });

  describe("gimmicks are exclusive to their generation", () => {
    it("Z-Moves only Gen 7", () => {
      expect(getGenerationFeatures(6).hasZMoves).toBe(false);
      expect(getGenerationFeatures(7).hasZMoves).toBe(true);
      expect(getGenerationFeatures(8).hasZMoves).toBe(false);
    });

    it("Dynamax only Gen 8", () => {
      expect(getGenerationFeatures(7).hasDynamax).toBe(false);
      expect(getGenerationFeatures(8).hasDynamax).toBe(true);
      expect(getGenerationFeatures(9).hasDynamax).toBe(false);
    });

    it("Tera from Gen 9 (>= 9)", () => {
      expect(getGenerationFeatures(8).hasTera).toBe(false);
      expect(getGenerationFeatures(9).hasTera).toBe(true);
      expect(getGenerationFeatures(10).hasTera).toBe(true);
    });
  });
});

// ============================================================
// Constants
// ============================================================
describe("constants", () => {
  it("TERRAIN_TYPES has the four terrains", () => {
    expect([...TERRAIN_TYPES]).toEqual(["Electric", "Grassy", "Misty", "Psychic"]);
  });

  it("POKEMON_TYPES includes Stellar and has 19 entries", () => {
    expect(POKEMON_TYPES).toHaveLength(19);
    expect(POKEMON_TYPES).toContain("Stellar");
    expect(POKEMON_TYPES).toContain("Fairy");
  });

  it("Z_MOVE_NAMES has 18 types (no Stellar/Fairy-less gaps)", () => {
    expect(Object.keys(Z_MOVE_NAMES)).toHaveLength(18);
    expect(Z_MOVE_NAMES["fire"]).toBe("Inferno Overdrive");
  });

  it("MAX_MOVE_NAMES has 18 types", () => {
    expect(Object.keys(MAX_MOVE_NAMES)).toHaveLength(18);
    expect(MAX_MOVE_NAMES["dragon"]).toBe("Max Wyrmwind");
  });

  it("MAX_MOVE_EFFECTS has 18 types", () => {
    expect(Object.keys(MAX_MOVE_EFFECTS)).toHaveLength(18);
  });
});

// ============================================================
// getZMoveName / getMaxMoveName
// ============================================================
describe("getZMoveName", () => {
  it("returns the correct Z-move for known types", () => {
    expect(getZMoveName("normal")).toBe("Breakneck Blitz");
    expect(getZMoveName("water")).toBe("Hydro Vortex");
    expect(getZMoveName("fairy")).toBe("Twinkle Tackle");
  });

  it("falls back to 'Z-Move' for unknown/uncovered types", () => {
    expect(getZMoveName("stellar")).toBe("Z-Move");
    expect(getZMoveName("")).toBe("Z-Move");
  });

  it("normalizes case before lookup", () => {
    expect(getZMoveName("FIRE")).toBe("Inferno Overdrive");
    expect(getZMoveName("Water")).toBe("Hydro Vortex");
  });
});

describe("getMaxMoveName", () => {
  it("returns the correct Max move for known types", () => {
    expect(getMaxMoveName("fire")).toBe("Max Flare");
    expect(getMaxMoveName("steel")).toBe("Max Steelspike");
  });

  it("falls back to 'Max Move' for unknown types", () => {
    expect(getMaxMoveName("stellar")).toBe("Max Move");
    expect(getMaxMoveName("")).toBe("Max Move");
  });

  it("normalizes case before lookup", () => {
    expect(getMaxMoveName("FIRE")).toBe("Max Flare");
    expect(getMaxMoveEffect("FIRE")).not.toBe("Unknown effect");
  });
});

// ============================================================
// getZMovePower
// ============================================================
describe("getZMovePower", () => {
  it("returns null for status moves (null or 0 BP)", () => {
    expect(getZMovePower(null)).toBeNull();
    expect(getZMovePower(0)).toBeNull();
  });

  it("scales across all tiers", () => {
    expect(getZMovePower(40)).toBe(100); // <= 55
    expect(getZMovePower(55)).toBe(100);
    expect(getZMovePower(60)).toBe(120); // <= 65
    expect(getZMovePower(70)).toBe(140); // <= 75
    expect(getZMovePower(80)).toBe(160); // <= 85
    expect(getZMovePower(90)).toBe(175); // <= 95
    expect(getZMovePower(100)).toBe(180); // exactly 100
    expect(getZMovePower(110)).toBe(185); // <= 110
    expect(getZMovePower(120)).toBe(190); // <= 125
    expect(getZMovePower(130)).toBe(195); // <= 130
    expect(getZMovePower(140)).toBe(200); // 140+
    expect(getZMovePower(250)).toBe(200);
  });

  it("96-99 BP falls into the 175 tier (<=95 is false, but <100 handled by next)", () => {
    // 96-99: not <=95, not ===100, but <=110 -> 185
    expect(getZMovePower(96)).toBe(185);
    expect(getZMovePower(99)).toBe(185);
  });
});

// ============================================================
// getMaxMovePower
// ============================================================
describe("getMaxMovePower", () => {
  it("returns null for status moves", () => {
    expect(getMaxMovePower(null)).toBeNull();
    expect(getMaxMovePower(0)).toBeNull();
    expect(getMaxMovePower(0, "fire")).toBeNull();
  });

  describe("standard scaling (non fighting/poison)", () => {
    it("scales across tiers", () => {
      expect(getMaxMovePower(40)).toBe(90); // <= 40
      expect(getMaxMovePower(50)).toBe(100); // <= 50
      expect(getMaxMovePower(60)).toBe(110); // <= 60
      expect(getMaxMovePower(70)).toBe(120); // <= 70
      expect(getMaxMovePower(100)).toBe(130); // <= 100
      expect(getMaxMovePower(140)).toBe(140); // <= 140
      expect(getMaxMovePower(200)).toBe(150); // 141+
    });

    it("uses standard scaling when type is unrelated", () => {
      expect(getMaxMovePower(100, "fire")).toBe(130);
      expect(getMaxMovePower(40, "normal")).toBe(90);
    });
  });

  describe("reduced scaling for fighting and poison", () => {
    it("fighting uses reduced table", () => {
      expect(getMaxMovePower(40, "fighting")).toBe(70);
      expect(getMaxMovePower(50, "fighting")).toBe(75);
      expect(getMaxMovePower(60, "fighting")).toBe(80);
      expect(getMaxMovePower(70, "fighting")).toBe(85);
      expect(getMaxMovePower(100, "fighting")).toBe(90);
      expect(getMaxMovePower(120, "fighting")).toBe(95); // 101+ caps at 95
    });

    it("poison uses reduced table", () => {
      expect(getMaxMovePower(40, "poison")).toBe(70);
      expect(getMaxMovePower(101, "poison")).toBe(95);
    });

    it("is case-insensitive on the type", () => {
      expect(getMaxMovePower(40, "FIGHTING")).toBe(70);
      expect(getMaxMovePower(40, "Poison")).toBe(70);
    });
  });
});

// ============================================================
// getMaxMoveEffect
// ============================================================
describe("getMaxMoveEffect", () => {
  it("returns the right effect for known types", () => {
    expect(getMaxMoveEffect("fire")).toBe("Sets up harsh sunlight for 5 turns");
    expect(getMaxMoveEffect("normal")).toBe("Lowers the target's Speed by 1 stage");
    expect(getMaxMoveEffect("fairy")).toBe("Sets up Misty Terrain for 5 turns");
  });

  it("falls back to 'Unknown effect' for unknown types", () => {
    expect(getMaxMoveEffect("stellar")).toBe("Unknown effect");
    expect(getMaxMoveEffect("")).toBe("Unknown effect");
  });
});

// ============================================================
// canGigantamax / getGMaxMove
// ============================================================
describe("canGigantamax", () => {
  it("recognizes Gmax-capable base species", () => {
    expect(canGigantamax("rillaboom")).toBe(true);
    expect(canGigantamax("charizard")).toBe(true);
    expect(canGigantamax("venusaur")).toBe(true);
    expect(canGigantamax("pikachu")).toBe(true);
  });

  it("recognizes -gmax suffixed names", () => {
    expect(canGigantamax("charizard-gmax")).toBe(true);
    expect(canGigantamax("venusaur-gmax")).toBe(true);
  });

  it("is case-insensitive and strips disallowed chars", () => {
    expect(canGigantamax("Charizard")).toBe(true);
    expect(canGigantamax("CHARIZARD")).toBe(true);
    expect(canGigantamax("char izard")).toBe(true); // space stripped -> "charizard"
  });

  it("handles Toxtricity forms", () => {
    expect(canGigantamax("toxtricity")).toBe(true);
    expect(canGigantamax("toxtricity-amped")).toBe(true);
    expect(canGigantamax("toxtricity-low-key")).toBe(true);
  });

  it("returns false for non-Gmax Pokemon", () => {
    expect(canGigantamax("bulbasaur")).toBe(false);
    expect(canGigantamax("mewtwo")).toBe(false);
    expect(canGigantamax("")).toBe(false);
  });
});

describe("getGMaxMove", () => {
  it("returns the G-Max move info object", () => {
    expect(getGMaxMove("rillaboom")).toEqual({
      move: "G-Max Drum Solo",
      type: "grass",
      effect: "Ignores opponents' abilities (always 160 BP)",
    });
  });

  it("returns the same info for base and -gmax form", () => {
    expect(getGMaxMove("charizard")).toEqual(getGMaxMove("charizard-gmax"));
  });

  it("normalizes case before lookup", () => {
    expect(getGMaxMove("Pikachu")?.move).toBe("G-Max Volt Crash");
  });

  it("returns null for non-Gmax Pokemon", () => {
    expect(getGMaxMove("bulbasaur")).toBeNull();
    expect(getGMaxMove("")).toBeNull();
  });
});

// ============================================================
// getDynamaxHpMultiplier
// ============================================================
describe("getDynamaxHpMultiplier", () => {
  it("defaults to level 10 -> 2.0x", () => {
    expect(getDynamaxHpMultiplier()).toBe(2.0);
  });

  it("level 0 -> 1.5x", () => {
    expect(getDynamaxHpMultiplier(0)).toBe(1.5);
  });

  it("level 5 -> 1.75x", () => {
    expect(getDynamaxHpMultiplier(5)).toBe(1.75);
  });

  it("clamps below 0 to level 0", () => {
    expect(getDynamaxHpMultiplier(-5)).toBe(1.5);
  });

  it("clamps above 10 to level 10", () => {
    expect(getDynamaxHpMultiplier(50)).toBe(2.0);
  });
});

// ============================================================
// Mega Pokemon
// ============================================================
describe("MEGA_POKEMON data + MEGA_STONE_MAP", () => {
  it("MEGA_STONE_MAP is derived from MEGA_POKEMON", () => {
    expect(Object.keys(MEGA_STONE_MAP)).toHaveLength(MEGA_POKEMON.length);
    expect(MEGA_STONE_MAP["venusaur-mega"]).toBe("Venusaurite");
  });

  it("includes both Charizard X and Y", () => {
    const names = MEGA_POKEMON.map((m) => m.name);
    expect(names).toContain("charizard-mega-x");
    expect(names).toContain("charizard-mega-y");
  });
});

describe("isMegaPokemon", () => {
  it("recognizes -mega names", () => {
    expect(isMegaPokemon("venusaur-mega")).toBe(true);
    expect(isMegaPokemon("charizard-mega-x")).toBe(true);
    expect(isMegaPokemon("mewtwo-mega-y")).toBe(true);
  });

  it("recognizes -primal reversions", () => {
    expect(isMegaPokemon("groudon-primal")).toBe(true);
    expect(isMegaPokemon("kyogre-primal")).toBe(true);
  });

  it("returns false for normal Pokemon and null/empty", () => {
    expect(isMegaPokemon("charizard")).toBe(false);
    expect(isMegaPokemon("pikachu")).toBe(false);
    expect(isMegaPokemon(null)).toBe(false);
    expect(isMegaPokemon("")).toBe(false);
  });
});

describe("getMegaStone", () => {
  it("returns the mega stone for mega forms", () => {
    expect(getMegaStone("charizard-mega-x")).toBe("Charizardite X");
    expect(getMegaStone("charizard-mega-y")).toBe("Charizardite Y");
    expect(getMegaStone("venusaur-mega")).toBe("Venusaurite");
  });

  it("returns special items for primal reversions", () => {
    expect(getMegaStone("groudon-primal")).toBe("Red Orb");
    expect(getMegaStone("kyogre-primal")).toBe("Blue Orb");
  });

  it("returns 'Dragon Ascent' for Mega Rayquaza (no stone)", () => {
    expect(getMegaStone("rayquaza-mega")).toBe("Dragon Ascent");
  });

  it("returns null for unknown names and null input", () => {
    expect(getMegaStone("charizard")).toBeNull();
    expect(getMegaStone("not-a-mega")).toBeNull();
    expect(getMegaStone(null)).toBeNull();
  });
});

describe("getMegaPokemonInfo", () => {
  it("returns the full info object", () => {
    expect(getMegaPokemonInfo("venusaur-mega")).toEqual({
      name: "venusaur-mega",
      displayName: "Mega Venusaur",
      baseSpeciesId: 3,
      formId: 10033,
      megaStone: "Venusaurite",
    });
  });

  it("returns null for unknown name", () => {
    expect(getMegaPokemonInfo("venusaur")).toBeNull();
    expect(getMegaPokemonInfo("")).toBeNull();
  });
});

// ============================================================
// Regional Variants
// ============================================================
describe("isRegionalVariant", () => {
  it("recognizes all four region suffixes", () => {
    expect(isRegionalVariant("raichu-alola")).toBe(true);
    expect(isRegionalVariant("meowth-galar")).toBe(true);
    expect(isRegionalVariant("growlithe-hisui")).toBe(true);
    expect(isRegionalVariant("wooper-paldea")).toBe(true);
  });

  it("returns false for base forms and null/empty", () => {
    expect(isRegionalVariant("raichu")).toBe(false);
    expect(isRegionalVariant("charizard")).toBe(false);
    expect(isRegionalVariant(null)).toBe(false);
    expect(isRegionalVariant("")).toBe(false);
  });
});

describe("getRegionalVariantInfo", () => {
  it("returns Alolan Raichu info", () => {
    expect(getRegionalVariantInfo("raichu-alola")).toEqual({
      name: "raichu-alola",
      displayName: "Alolan Raichu",
      baseSpeciesId: 26,
      formId: 10100,
      region: "alola",
      minGeneration: 7,
    });
  });

  it("returns Galarian Meowth info with minGeneration 8", () => {
    const info = getRegionalVariantInfo("meowth-galar");
    expect(info?.region).toBe("galar");
    expect(info?.minGeneration).toBe(8);
  });

  it("Hisuian Growlithe debuts in Gen 8 (Legends: Arceus)", () => {
    const info = getRegionalVariantInfo("growlithe-hisui");
    expect(info?.region).toBe("hisui");
    expect(info?.minGeneration).toBe(8);
  });

  it("Paldean Wooper debuts in Gen 9", () => {
    expect(getRegionalVariantInfo("wooper-paldea")?.minGeneration).toBe(9);
  });

  it("returns null for unknown name", () => {
    expect(getRegionalVariantInfo("raichu")).toBeNull();
    expect(getRegionalVariantInfo("")).toBeNull();
  });
});

describe("getRegionalVariantsForGeneration", () => {
  it("returns nothing before Gen 7", () => {
    expect(getRegionalVariantsForGeneration(6)).toEqual([]);
    expect(getRegionalVariantsForGeneration(1)).toEqual([]);
  });

  it("Gen 7 includes Alolan forms only", () => {
    const v = getRegionalVariantsForGeneration(7);
    expect(v.length).toBeGreaterThan(0);
    expect(v.every((f) => f.region === "alola")).toBe(true);
  });

  it("Gen 8 includes Alola + Galar + Hisui but not Paldea", () => {
    const regions = new Set(getRegionalVariantsForGeneration(8).map((v) => v.region));
    expect(regions).toContain("alola");
    expect(regions).toContain("galar");
    expect(regions).toContain("hisui");
    expect(regions).not.toContain("paldea");
  });

  it("Gen 9 includes all regions", () => {
    const regions = new Set(getRegionalVariantsForGeneration(9).map((v) => v.region));
    expect(regions).toEqual(new Set(["alola", "galar", "hisui", "paldea"]));
    expect(getRegionalVariantsForGeneration(9)).toHaveLength(REGIONAL_VARIANTS.length);
  });
});

// ============================================================
// Z-Crystals
// ============================================================
describe("Z-Crystals", () => {
  it("getZCrystals lists all crystal keys", () => {
    const crystals = getZCrystals();
    expect(crystals).toEqual(Object.keys(Z_CRYSTALS));
    expect(crystals).toContain("Firium Z");
    expect(crystals).toContain("Pikanium Z");
  });

  it("isZCrystal recognizes valid crystals", () => {
    expect(isZCrystal("Firium Z")).toBe(true);
    expect(isZCrystal("Ultranecrozium Z")).toBe(true);
  });

  it("isZCrystal returns false for non-crystals and null", () => {
    expect(isZCrystal("Life Orb")).toBe(false);
    expect(isZCrystal("firium z")).toBe(false); // case-sensitive
    expect(isZCrystal(null)).toBe(false);
    expect(isZCrystal("")).toBe(false);
  });

  it("getZCrystalType maps crystal to its type", () => {
    expect(getZCrystalType("Firium Z")).toBe("Fire");
    expect(getZCrystalType("Aloraichium Z")).toBe("Electric");
    expect(getZCrystalType("Mewnium Z")).toBe("Psychic");
  });

  it("getZCrystalType returns null for unknown items", () => {
    expect(getZCrystalType("Life Orb")).toBeNull();
    expect(getZCrystalType("")).toBeNull();
  });
});

// ============================================================
// Items by generation
// ============================================================
describe("getItemsForGeneration", () => {
  it("returns empty for invalid generations", () => {
    expect(getItemsForGeneration(0)).toEqual([]);
    expect(getItemsForGeneration(10)).toEqual([]);
    expect(getItemsForGeneration(-1)).toEqual([]);
  });

  it("Gen 1 has no items", () => {
    expect(getItemsForGeneration(1)).toEqual([]);
  });

  it("returns a sorted list", () => {
    const items = getItemsForGeneration(9);
    const sorted = [...items].sort();
    expect(items).toEqual(sorted);
  });

  it("includes Leftovers from Gen 2 onward (carry-forward)", () => {
    expect(getItemsForGeneration(2)).toContain("Leftovers");
    expect(getItemsForGeneration(9)).toContain("Leftovers");
  });

  it("includes Life Orb from Gen 4 onward but not Gen 3", () => {
    expect(getItemsForGeneration(3)).not.toContain("Life Orb");
    expect(getItemsForGeneration(4)).toContain("Life Orb");
  });

  it("includes Z-Crystals only in Gen 7", () => {
    expect(getItemsForGeneration(6)).not.toContain("Firium Z");
    expect(getItemsForGeneration(7)).toContain("Firium Z");
    expect(getItemsForGeneration(8)).not.toContain("Firium Z");
  });

  it("includes Booster Energy only in Gen 9", () => {
    expect(getItemsForGeneration(8)).not.toContain("Booster Energy");
    expect(getItemsForGeneration(9)).toContain("Booster Energy");
  });

  it("contains no duplicate items", () => {
    const items = getItemsForGeneration(9);
    expect(new Set(items).size).toBe(items.length);
  });
});

describe("getCommonItemsForGeneration", () => {
  it("filters COMMON_COMPETITIVE_ITEMS to those available in the gen", () => {
    const common = getCommonItemsForGeneration(9);
    const all = getItemsForGeneration(9);
    expect(common.every((i) => all.includes(i))).toBe(true);
    expect(common.every((i) => COMMON_COMPETITIVE_ITEMS.includes(i))).toBe(true);
  });

  it("Gen 9 common items include Booster Energy and Heavy-Duty Boots", () => {
    const common = getCommonItemsForGeneration(9);
    expect(common).toContain("Booster Energy");
    expect(common).toContain("Heavy-Duty Boots");
  });

  it("Gen 2 common items exclude later-gen-only items", () => {
    const common = getCommonItemsForGeneration(2);
    expect(common).not.toContain("Booster Energy");
    expect(common).not.toContain("Life Orb");
    expect(common).toContain("Leftovers");
  });

  it("preserves COMMON_COMPETITIVE_ITEMS ordering (filter, not sort)", () => {
    const common = getCommonItemsForGeneration(9);
    const expectedOrder = COMMON_COMPETITIVE_ITEMS.filter((i) =>
      getItemsForGeneration(9).includes(i)
    );
    expect(common).toEqual(expectedOrder);
  });

  it("Gen 1 yields no common items", () => {
    expect(getCommonItemsForGeneration(1)).toEqual([]);
  });
});
