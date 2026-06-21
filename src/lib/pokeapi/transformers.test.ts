import { describe, it, expect } from "vitest";
import {
  formatPokemonName,
  getTypesForGeneration,
  abilitiesExistInGeneration,
  transformFullPokemon,
} from "./transformers";
import type { Pokemon, PokemonType } from "@/types/pokemon";
import type { PokeAPIPokemon } from "@/types/api";

describe("formatPokemonName", () => {
  it("maps known special cases to their human-readable form", () => {
    expect(formatPokemonName("mr-mime")).toBe("Mr. Mime");
    expect(formatPokemonName("ho-oh")).toBe("Ho-Oh");
    expect(formatPokemonName("type-null")).toBe("Type: Null");
    expect(formatPokemonName("farfetchd")).toBe("Farfetch'd");
    expect(formatPokemonName("nidoran-f")).toBe("Nidoran♀");
    expect(formatPokemonName("porygon-z")).toBe("Porygon-Z");
    expect(formatPokemonName("tapu-koko")).toBe("Tapu Koko");
  });

  it("title-cases each hyphen segment for non-special names, joining with spaces", () => {
    expect(formatPokemonName("charizard")).toBe("Charizard");
    // Not in the special table -> generic split-on-hyphen formatting
    expect(formatPokemonName("charizard-mega-x")).toBe("Charizard Mega X");
    expect(formatPokemonName("bulbasaur")).toBe("Bulbasaur");
  });

  it("handles empty string", () => {
    // "".split("-") => [""], charAt(0) of "" is "", toUpperCase "" => ""
    expect(formatPokemonName("")).toBe("");
  });

  it("does not break on a trailing hyphen (produces a trailing space)", () => {
    expect(formatPokemonName("foo-")).toBe("Foo ");
  });
});

describe("abilitiesExistInGeneration", () => {
  it("is false for generations 1 and 2 (pre-abilities)", () => {
    expect(abilitiesExistInGeneration(1)).toBe(false);
    expect(abilitiesExistInGeneration(2)).toBe(false);
  });

  it("is true for generation 3 (abilities introduced) and later", () => {
    expect(abilitiesExistInGeneration(3)).toBe(true);
    expect(abilitiesExistInGeneration(4)).toBe(true);
    expect(abilitiesExistInGeneration(9)).toBe(true);
  });
});

describe("getTypesForGeneration", () => {
  const fairyType: PokemonType = { name: "fairy", color: "#D685AD" };
  const normalType: PokemonType = { name: "normal", color: "#A8A77A" };

  const buildPokemon = (
    overrides: Partial<Pokemon> = {}
  ): Pokemon => ({
    id: 35,
    name: "clefairy",
    displayName: "Clefairy",
    types: [fairyType],
    stats: {
      hp: 70,
      attack: 45,
      defense: 48,
      specialAttack: 60,
      specialDefense: 65,
      speed: 35,
      total: 323,
    },
    abilities: [],
    sprites: {
      front_default: null,
      front_shiny: null,
      official_artwork: null,
    },
    generation: 1,
    pastTypes: [],
    pastAbilities: [],
    ...overrides,
  });

  it("returns current types when there are no past_types", () => {
    const pokemon = buildPokemon();
    expect(getTypesForGeneration(pokemon, 1)).toEqual([fairyType]);
    expect(getTypesForGeneration(pokemon, 9)).toEqual([fairyType]);
  });

  it("returns the historical types for a generation at/below the past_types entry", () => {
    // Clefairy was Normal through gen 5; past_types entry generation = 5.
    const pokemon = buildPokemon({
      pastTypes: [{ generation: 5, types: [normalType] }],
    });
    // generation <= 5 -> use the past (Normal) types
    expect(getTypesForGeneration(pokemon, 1)).toEqual([normalType]);
    expect(getTypesForGeneration(pokemon, 5)).toEqual([normalType]);
  });

  it("returns current types when the generation is above all past_types entries", () => {
    const pokemon = buildPokemon({
      pastTypes: [{ generation: 5, types: [normalType] }],
    });
    // generation 6 > 5 -> current (Fairy) types
    expect(getTypesForGeneration(pokemon, 6)).toEqual([fairyType]);
    expect(getTypesForGeneration(pokemon, 9)).toEqual([fairyType]);
  });
});

describe("transformFullPokemon", () => {
  // Minimal but valid PokeAPIPokemon fixture. abilities is empty so the async
  // ability transform performs no network calls.
  const buildApiPokemon = (
    overrides: Partial<PokeAPIPokemon> = {}
  ): PokeAPIPokemon => ({
    id: 1,
    name: "bulbasaur",
    weight: 69,
    types: [
      { slot: 2, type: { name: "poison", url: "" } },
      { slot: 1, type: { name: "grass", url: "" } },
    ],
    stats: [
      { base_stat: 45, stat: { name: "hp", url: "" } },
      { base_stat: 49, stat: { name: "attack", url: "" } },
      { base_stat: 49, stat: { name: "defense", url: "" } },
      { base_stat: 65, stat: { name: "special-attack", url: "" } },
      { base_stat: 65, stat: { name: "special-defense", url: "" } },
      { base_stat: 45, stat: { name: "speed", url: "" } },
    ],
    abilities: [],
    sprites: {
      front_default: "front.png",
      front_shiny: "shiny.png",
    },
    moves: [],
    past_types: [],
    past_abilities: [],
    ...overrides,
  });

  it("maps id, name and displayName", async () => {
    const result = await transformFullPokemon(buildApiPokemon());
    expect(result.id).toBe(1);
    expect(result.name).toBe("bulbasaur");
    expect(result.displayName).toBe("Bulbasaur");
  });

  it("sorts types by slot and applies type colors", async () => {
    const result = await transformFullPokemon(buildApiPokemon());
    // slot 1 (grass) comes before slot 2 (poison)
    expect(result.types).toEqual([
      { name: "grass", color: "#7AC74C" },
      { name: "poison", color: "#A33EA1" },
    ]);
  });

  it("maps stats by name and computes the total", async () => {
    const result = await transformFullPokemon(buildApiPokemon());
    expect(result.stats).toEqual({
      hp: 45,
      attack: 49,
      defense: 49,
      specialAttack: 65,
      specialDefense: 65,
      speed: 45,
      total: 318,
    });
  });

  it("builds sprites including a derived official artwork url", async () => {
    const result = await transformFullPokemon(buildApiPokemon());
    expect(result.sprites.front_default).toBe("front.png");
    expect(result.sprites.front_shiny).toBe("shiny.png");
    expect(result.sprites.official_artwork).toBe(
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png"
    );
  });

  it("derives the generation from the id", async () => {
    const result = await transformFullPokemon(buildApiPokemon());
    expect(result.generation).toBe(1);
  });

  it("returns an empty abilities array when the api lists no abilities", async () => {
    const result = await transformFullPokemon(buildApiPokemon());
    expect(result.abilities).toEqual([]);
  });

  it("defaults unknown type names to the fallback color", async () => {
    const result = await transformFullPokemon(
      buildApiPokemon({
        types: [{ slot: 1, type: { name: "mystery", url: "" } }],
      })
    );
    expect(result.types).toEqual([{ name: "mystery", color: "#888888" }]);
  });

  it("transforms past_types into generation-numbered entries", async () => {
    const result = await transformFullPokemon(
      buildApiPokemon({
        id: 35,
        name: "clefairy",
        types: [{ slot: 1, type: { name: "fairy", url: "" } }],
        past_types: [
          {
            generation: { name: "generation-v", url: "" },
            types: [{ slot: 1, type: { name: "normal", url: "" } }],
          },
        ],
      })
    );
    expect(result.pastTypes).toEqual([
      { generation: 5, types: [{ name: "normal", color: "#A8A77A" }] },
    ]);
  });
});
