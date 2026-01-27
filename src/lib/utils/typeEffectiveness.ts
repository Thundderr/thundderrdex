import { PokemonTypeName } from "@/types/pokemon";
import { TYPE_CHART, ALL_TYPES } from "@/data/typeChart";

export interface TypeMatchup {
  type: PokemonTypeName;
  multiplier: number;
}

export interface DualTypeEffectiveness {
  types: PokemonTypeName[];
  weaknesses: TypeMatchup[]; // 2x or 4x
  resistances: TypeMatchup[]; // 0.25x or 0.5x
  immunities: PokemonTypeName[]; // 0x
}

export function calculateDualTypeEffectiveness(
  types: PokemonTypeName[]
): DualTypeEffectiveness {
  const multipliers: Record<PokemonTypeName, number> = {} as Record<
    PokemonTypeName,
    number
  >;

  // Initialize all multipliers to 1
  for (const type of ALL_TYPES) {
    multipliers[type] = 1;
  }

  // Calculate multipliers for each attacking type
  for (const attackingType of ALL_TYPES) {
    for (const defendingType of types) {
      const typeData = TYPE_CHART[defendingType].defending;

      if (typeData.immuneTo.includes(attackingType)) {
        multipliers[attackingType] *= 0;
      } else if (typeData.weakTo.includes(attackingType)) {
        multipliers[attackingType] *= 2;
      } else if (typeData.resistantTo.includes(attackingType)) {
        multipliers[attackingType] *= 0.5;
      }
    }
  }

  // Categorize results (omit neutral 1x)
  const weaknesses: TypeMatchup[] = [];
  const resistances: TypeMatchup[] = [];
  const immunities: PokemonTypeName[] = [];

  for (const [type, mult] of Object.entries(multipliers)) {
    const typeName = type as PokemonTypeName;
    if (mult === 0) {
      immunities.push(typeName);
    } else if (mult >= 2) {
      weaknesses.push({ type: typeName, multiplier: mult });
    } else if (mult < 1) {
      resistances.push({ type: typeName, multiplier: mult });
    }
    // Skip mult === 1 (neutral)
  }

  // Sort: 4x before 2x, 0.25x before 0.5x
  weaknesses.sort((a, b) => b.multiplier - a.multiplier);
  resistances.sort((a, b) => a.multiplier - b.multiplier);

  return { types, weaknesses, resistances, immunities };
}

export function getTypeEffectivenessMultiplier(
  attackingType: PokemonTypeName,
  defendingType: PokemonTypeName
): number {
  const chart = TYPE_CHART[attackingType].attacking;
  if (chart.immune.includes(defendingType)) return 0;
  if (chart.superEffective.includes(defendingType)) return 2;
  if (chart.notVeryEffective.includes(defendingType)) return 0.5;
  return 1;
}
