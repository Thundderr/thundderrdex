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

// Types available per generation
export const TYPES_BY_GENERATION: Record<number, PokemonTypeName[]> = {
  1: ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon"],
  2: ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel"],
  3: ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel"],
  4: ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel"],
  5: ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel"],
  6: ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"],
  7: ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"],
  8: ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"],
  9: ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"],
};

// Current type chart (Gen 6+)
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

// Generation-specific type chart overrides
// Gen 1: Ghost was bugged (0x vs Psychic instead of 2x), Poison was 2x vs Bug
// Gen 2-5: Steel resisted Ghost and Dark
// Gen 6+: Steel lost Ghost/Dark resistance, Fairy added

interface TypeOverride {
  attacking?: Partial<TypeEffectiveness["attacking"]>;
  defending?: Partial<TypeEffectiveness["defending"]>;
}

type GenerationOverrides = Partial<Record<PokemonTypeName, TypeOverride>>;

export const TYPE_CHART_OVERRIDES: Record<number, GenerationOverrides> = {
  // Gen 1: Ghost immune to Psychic (bug), Poison super effective vs Bug
  1: {
    ghost: {
      attacking: {
        superEffective: [], // Ghost couldn't hit Psychic due to bug
        immune: ["normal", "psychic"], // Psychic was immune to Ghost in Gen 1
      },
    },
    psychic: {
      defending: {
        weakTo: ["bug"], // Only Bug was super effective (Ghost was bugged)
        immuneTo: ["ghost"],
      },
    },
    poison: {
      attacking: {
        superEffective: ["grass", "bug"], // Poison was 2x vs Bug in Gen 1
      },
    },
    bug: {
      defending: {
        weakTo: ["fire", "flying", "rock", "poison"], // Weak to Poison in Gen 1
      },
    },
  },
  // Gen 2-5: Steel resisted Ghost and Dark
  2: {
    steel: {
      defending: {
        resistantTo: [
          "normal", "grass", "ice", "flying", "psychic", "bug", "rock", "dragon", "steel",
          "ghost", "dark", // Steel resisted Ghost and Dark in Gen 2-5
        ],
      },
    },
    ghost: {
      attacking: {
        notVeryEffective: ["dark", "steel"], // Ghost was resisted by Steel
      },
    },
    dark: {
      attacking: {
        notVeryEffective: ["fighting", "dark", "steel"], // Dark was resisted by Steel
      },
    },
  },
  3: {
    steel: {
      defending: {
        resistantTo: [
          "normal", "grass", "ice", "flying", "psychic", "bug", "rock", "dragon", "steel",
          "ghost", "dark",
        ],
      },
    },
    ghost: {
      attacking: {
        notVeryEffective: ["dark", "steel"],
      },
    },
    dark: {
      attacking: {
        notVeryEffective: ["fighting", "dark", "steel"],
      },
    },
  },
  4: {
    steel: {
      defending: {
        resistantTo: [
          "normal", "grass", "ice", "flying", "psychic", "bug", "rock", "dragon", "steel",
          "ghost", "dark",
        ],
      },
    },
    ghost: {
      attacking: {
        notVeryEffective: ["dark", "steel"],
      },
    },
    dark: {
      attacking: {
        notVeryEffective: ["fighting", "dark", "steel"],
      },
    },
  },
  5: {
    steel: {
      defending: {
        resistantTo: [
          "normal", "grass", "ice", "flying", "psychic", "bug", "rock", "dragon", "steel",
          "ghost", "dark",
        ],
      },
    },
    ghost: {
      attacking: {
        notVeryEffective: ["dark", "steel"],
      },
    },
    dark: {
      attacking: {
        notVeryEffective: ["fighting", "dark", "steel"],
      },
    },
  },
  // Gen 6+: Use default TYPE_CHART (no overrides needed)
};

// Get type chart for a specific generation
export function getTypeChartForGeneration(generation: number): Record<PokemonTypeName, TypeEffectiveness> {
  const availableTypes = TYPES_BY_GENERATION[generation] || ALL_TYPES;
  const overrides = TYPE_CHART_OVERRIDES[generation] || {};

  const genChart: Record<PokemonTypeName, TypeEffectiveness> = {} as Record<PokemonTypeName, TypeEffectiveness>;

  for (const type of availableTypes) {
    const baseChart = TYPE_CHART[type];
    const typeOverride = overrides[type];

    if (typeOverride) {
      // Merge overrides with base chart
      genChart[type] = {
        attacking: {
          superEffective: typeOverride.attacking?.superEffective ??
            baseChart.attacking.superEffective.filter(t => availableTypes.includes(t)),
          notVeryEffective: typeOverride.attacking?.notVeryEffective ??
            baseChart.attacking.notVeryEffective.filter(t => availableTypes.includes(t)),
          immune: typeOverride.attacking?.immune ??
            baseChart.attacking.immune.filter(t => availableTypes.includes(t)),
        },
        defending: {
          weakTo: typeOverride.defending?.weakTo ??
            baseChart.defending.weakTo.filter(t => availableTypes.includes(t)),
          resistantTo: typeOverride.defending?.resistantTo ??
            baseChart.defending.resistantTo.filter(t => availableTypes.includes(t)),
          immuneTo: typeOverride.defending?.immuneTo ??
            baseChart.defending.immuneTo.filter(t => availableTypes.includes(t)),
        },
      };
    } else {
      // Filter out types that don't exist in this generation
      genChart[type] = {
        attacking: {
          superEffective: baseChart.attacking.superEffective.filter(t => availableTypes.includes(t)),
          notVeryEffective: baseChart.attacking.notVeryEffective.filter(t => availableTypes.includes(t)),
          immune: baseChart.attacking.immune.filter(t => availableTypes.includes(t)),
        },
        defending: {
          weakTo: baseChart.defending.weakTo.filter(t => availableTypes.includes(t)),
          resistantTo: baseChart.defending.resistantTo.filter(t => availableTypes.includes(t)),
          immuneTo: baseChart.defending.immuneTo.filter(t => availableTypes.includes(t)),
        },
      };
    }
  }

  return genChart;
}
