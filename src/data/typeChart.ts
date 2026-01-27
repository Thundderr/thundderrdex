import { PokemonTypeName } from "@/types/pokemon";

export interface TypeEffectiveness {
  attacking: {
    superEffective: PokemonTypeName[];
    notVeryEffective: PokemonTypeName[];
    immune: PokemonTypeName[];
  };
  defending: {
    weakTo: PokemonTypeName[];
    resistantTo: PokemonTypeName[];
    immuneTo: PokemonTypeName[];
  };
}

export const TYPE_CHART: Record<PokemonTypeName, TypeEffectiveness> = {
  normal: {
    attacking: {
      superEffective: [],
      notVeryEffective: ["rock", "steel"],
      immune: ["ghost"],
    },
    defending: {
      weakTo: ["fighting"],
      resistantTo: [],
      immuneTo: ["ghost"],
    },
  },
  fire: {
    attacking: {
      superEffective: ["grass", "ice", "bug", "steel"],
      notVeryEffective: ["fire", "water", "rock", "dragon"],
      immune: [],
    },
    defending: {
      weakTo: ["water", "ground", "rock"],
      resistantTo: ["fire", "grass", "ice", "bug", "steel", "fairy"],
      immuneTo: [],
    },
  },
  water: {
    attacking: {
      superEffective: ["fire", "ground", "rock"],
      notVeryEffective: ["water", "grass", "dragon"],
      immune: [],
    },
    defending: {
      weakTo: ["electric", "grass"],
      resistantTo: ["fire", "water", "ice", "steel"],
      immuneTo: [],
    },
  },
  electric: {
    attacking: {
      superEffective: ["water", "flying"],
      notVeryEffective: ["electric", "grass", "dragon"],
      immune: ["ground"],
    },
    defending: {
      weakTo: ["ground"],
      resistantTo: ["electric", "flying", "steel"],
      immuneTo: [],
    },
  },
  grass: {
    attacking: {
      superEffective: ["water", "ground", "rock"],
      notVeryEffective: ["fire", "grass", "poison", "flying", "bug", "dragon", "steel"],
      immune: [],
    },
    defending: {
      weakTo: ["fire", "ice", "poison", "flying", "bug"],
      resistantTo: ["water", "electric", "grass", "ground"],
      immuneTo: [],
    },
  },
  ice: {
    attacking: {
      superEffective: ["grass", "ground", "flying", "dragon"],
      notVeryEffective: ["fire", "water", "ice", "steel"],
      immune: [],
    },
    defending: {
      weakTo: ["fire", "fighting", "rock", "steel"],
      resistantTo: ["ice"],
      immuneTo: [],
    },
  },
  fighting: {
    attacking: {
      superEffective: ["normal", "ice", "rock", "dark", "steel"],
      notVeryEffective: ["poison", "flying", "psychic", "bug", "fairy"],
      immune: ["ghost"],
    },
    defending: {
      weakTo: ["flying", "psychic", "fairy"],
      resistantTo: ["bug", "rock", "dark"],
      immuneTo: [],
    },
  },
  poison: {
    attacking: {
      superEffective: ["grass", "fairy"],
      notVeryEffective: ["poison", "ground", "rock", "ghost"],
      immune: ["steel"],
    },
    defending: {
      weakTo: ["ground", "psychic"],
      resistantTo: ["grass", "fighting", "poison", "bug", "fairy"],
      immuneTo: [],
    },
  },
  ground: {
    attacking: {
      superEffective: ["fire", "electric", "poison", "rock", "steel"],
      notVeryEffective: ["grass", "bug"],
      immune: ["flying"],
    },
    defending: {
      weakTo: ["water", "grass", "ice"],
      resistantTo: ["poison", "rock"],
      immuneTo: ["electric"],
    },
  },
  flying: {
    attacking: {
      superEffective: ["grass", "fighting", "bug"],
      notVeryEffective: ["electric", "rock", "steel"],
      immune: [],
    },
    defending: {
      weakTo: ["electric", "ice", "rock"],
      resistantTo: ["grass", "fighting", "bug"],
      immuneTo: ["ground"],
    },
  },
  psychic: {
    attacking: {
      superEffective: ["fighting", "poison"],
      notVeryEffective: ["psychic", "steel"],
      immune: ["dark"],
    },
    defending: {
      weakTo: ["bug", "ghost", "dark"],
      resistantTo: ["fighting", "psychic"],
      immuneTo: [],
    },
  },
  bug: {
    attacking: {
      superEffective: ["grass", "psychic", "dark"],
      notVeryEffective: ["fire", "fighting", "poison", "flying", "ghost", "steel", "fairy"],
      immune: [],
    },
    defending: {
      weakTo: ["fire", "flying", "rock"],
      resistantTo: ["grass", "fighting", "ground"],
      immuneTo: [],
    },
  },
  rock: {
    attacking: {
      superEffective: ["fire", "ice", "flying", "bug"],
      notVeryEffective: ["fighting", "ground", "steel"],
      immune: [],
    },
    defending: {
      weakTo: ["water", "grass", "fighting", "ground", "steel"],
      resistantTo: ["normal", "fire", "poison", "flying"],
      immuneTo: [],
    },
  },
  ghost: {
    attacking: {
      superEffective: ["psychic", "ghost"],
      notVeryEffective: ["dark"],
      immune: ["normal"],
    },
    defending: {
      weakTo: ["ghost", "dark"],
      resistantTo: ["poison", "bug"],
      immuneTo: ["normal", "fighting"],
    },
  },
  dragon: {
    attacking: {
      superEffective: ["dragon"],
      notVeryEffective: ["steel"],
      immune: ["fairy"],
    },
    defending: {
      weakTo: ["ice", "dragon", "fairy"],
      resistantTo: ["fire", "water", "electric", "grass"],
      immuneTo: [],
    },
  },
  dark: {
    attacking: {
      superEffective: ["psychic", "ghost"],
      notVeryEffective: ["fighting", "dark", "fairy"],
      immune: [],
    },
    defending: {
      weakTo: ["fighting", "bug", "fairy"],
      resistantTo: ["ghost", "dark"],
      immuneTo: ["psychic"],
    },
  },
  steel: {
    attacking: {
      superEffective: ["ice", "rock", "fairy"],
      notVeryEffective: ["fire", "water", "electric", "steel"],
      immune: [],
    },
    defending: {
      weakTo: ["fire", "fighting", "ground"],
      resistantTo: [
        "normal",
        "grass",
        "ice",
        "flying",
        "psychic",
        "bug",
        "rock",
        "dragon",
        "steel",
        "fairy",
      ],
      immuneTo: ["poison"],
    },
  },
  fairy: {
    attacking: {
      superEffective: ["fighting", "dragon", "dark"],
      notVeryEffective: ["fire", "poison", "steel"],
      immune: [],
    },
    defending: {
      weakTo: ["poison", "steel"],
      resistantTo: ["fighting", "bug", "dark"],
      immuneTo: ["dragon"],
    },
  },
};

export const TYPE_COLORS: Record<PokemonTypeName, string> = {
  normal: "#A8A77A",
  fire: "#EE8130",
  water: "#6390F0",
  electric: "#F7D02C",
  grass: "#7AC74C",
  ice: "#96D9D6",
  fighting: "#C22E28",
  poison: "#A33EA1",
  ground: "#E2BF65",
  flying: "#A98FF3",
  psychic: "#F95587",
  bug: "#A6B91A",
  rock: "#B6A136",
  ghost: "#735797",
  dragon: "#6F35FC",
  dark: "#705746",
  steel: "#B7B7CE",
  fairy: "#D685AD",
};

export const ALL_TYPES: PokemonTypeName[] = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
];
