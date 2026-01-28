"use client";

import { useMemo } from "react";
import { calculate, Generations, Pokemon, Move, Field, type GenerationNum } from "@smogon/calc";
import { useGenerationStore } from "@/stores/generationStore";
import { DamageCalcPokemonConfig, DamageCalcFieldConfig, DamageCalcStatus } from "@/types/module";

export interface DamageCalcResult {
  damage: number | number[] | number[][];
  minDamage: number;
  maxDamage: number;
  minPercent: number;
  maxPercent: number;
  defenderMaxHp: number;
  fullDesc: string;
  moveDesc: string;
  koChance: {
    chance: number;
    n: number;
    text: string;
  } | null;
}

// @smogon/calc status names
type SmogonStatus = "brn" | "par" | "psn" | "tox" | "slp" | "frz" | "";

// Convert our status to @smogon/calc status format
function convertStatus(status: DamageCalcStatus): SmogonStatus | undefined {
  const statusMap: Record<DamageCalcStatus, SmogonStatus | undefined> = {
    "Healthy": undefined,
    "Burned": "brn",
    "Paralyzed": "par",
    "Poisoned": "psn",
    "Badly Poisoned": "tox",
    "Asleep": "slp",
    "Frozen": "frz",
  };
  return statusMap[status];
}

// Convert our app's Pokemon config to @smogon/calc format
function convertToSmogonPokemon(
  gen: ReturnType<typeof Generations.get>,
  config: DamageCalcPokemonConfig
): Pokemon | null {
  if (!config.pokemonName) return null;

  try {
    // Clean and convert Pokemon name to proper format (capitalize first letter)
    const pokemonName = config.pokemonName
      .trim()
      .toLowerCase()
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("-");

    // @smogon/calc is lenient with Pokemon names - it will find them even if they're
    // not "officially" in that gen's dex. Just pass the name directly.

    // Build options object, only including defined values
    const ivs = {
      hp: config.ivs.hp,
      atk: config.ivs.attack,
      def: config.ivs.defense,
      spa: config.ivs.specialAttack,
      spd: config.ivs.specialDefense,
      spe: config.ivs.speed,
    };

    const evs = {
      hp: config.evs.hp,
      atk: config.evs.attack,
      def: config.evs.defense,
      spa: config.evs.specialAttack,
      spd: config.evs.specialDefense,
      spe: config.evs.speed,
    };

    // First create Pokemon to get maxHP, then recreate with proper curHP if needed
    const tempPokemon = new Pokemon(gen, pokemonName, {
      level: config.level,
      nature: config.nature,
      ivs,
      evs,
    });

    // Calculate current HP based on percentage
    const maxHP = tempPokemon.maxHP();
    const curHP = config.currentHpPercent < 100
      ? Math.floor((config.currentHpPercent / 100) * maxHP)
      : maxHP;

    // Build the full options, only including ability/item if they're valid strings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options: Record<string, any> = {
      level: config.level,
      nature: config.nature,
      ivs,
      evs,
      boosts: config.boosts,
      status: convertStatus(config.status),
      curHP: curHP,
    };

    // Only add ability if it's a non-empty string
    if (config.ability && typeof config.ability === "string" && config.ability.trim()) {
      options.ability = config.ability;
    }

    // Only add item if it's a non-empty string
    if (config.item && typeof config.item === "string" && config.item.trim()) {
      options.item = config.item;
    }

    // Create the actual Pokemon with all options
    const pokemon = new Pokemon(gen, pokemonName, options as any);

    return pokemon;
  } catch {
    return null;
  }
}

// @smogon/calc weather and terrain types
type SmogonWeather = "Sand" | "Sun" | "Rain" | "Hail" | "Snow" | "Harsh Sunshine" | "Heavy Rain" | "Strong Winds";
type SmogonTerrain = "Electric" | "Grassy" | "Psychic" | "Misty";

// Convert weather string to @smogon/calc format
function convertWeather(weather: DamageCalcFieldConfig["weather"]): SmogonWeather | undefined {
  const weatherMap: Record<DamageCalcFieldConfig["weather"], SmogonWeather | undefined> = {
    None: undefined,
    Sun: "Sun",
    Rain: "Rain",
    Sand: "Sand",
    Snow: "Snow",
    "Harsh Sunshine": "Harsh Sunshine",
    "Heavy Rain": "Heavy Rain",
  };
  return weatherMap[weather];
}

// Convert terrain string to @smogon/calc format
function convertTerrain(terrain: DamageCalcFieldConfig["terrain"]): SmogonTerrain | undefined {
  const terrainMap: Record<DamageCalcFieldConfig["terrain"], SmogonTerrain | undefined> = {
    None: undefined,
    Electric: "Electric",
    Grassy: "Grassy",
    Misty: "Misty",
    Psychic: "Psychic",
  };
  return terrainMap[terrain];
}

// Parse KO chance from result
function parseKoChance(result: ReturnType<typeof calculate>): DamageCalcResult["koChance"] {
  try {
    const kochance = result.kochance();
    if (!kochance) return null;

    // kochance returns an object with chance and n properties
    if (typeof kochance === "object" && "chance" in kochance && "n" in kochance) {
      const chance = (kochance.chance as number) * 100;
      const n = kochance.n as number;

      let text = "";
      if (chance >= 100) {
        text = `Guaranteed ${n === 1 ? "OHKO" : `${n}HKO`}`;
      } else if (chance > 0) {
        text = `${chance.toFixed(1)}% chance to ${n === 1 ? "OHKO" : `${n}HKO`}`;
      } else {
        text = `${n + 1}HKO`;
      }

      return { chance, n, text };
    }
    return null;
  } catch {
    return null;
  }
}

export function useDamageCalc(
  attackerConfig: DamageCalcPokemonConfig,
  defenderConfig: DamageCalcPokemonConfig,
  moveName: string | null,
  fieldConfig: DamageCalcFieldConfig
): DamageCalcResult | null {
  const { globalGeneration } = useGenerationStore();

  return useMemo(() => {
    if (!attackerConfig.pokemonName || !defenderConfig.pokemonName || !moveName) {
      return null;
    }

    try {
      const gen = Generations.get(globalGeneration as GenerationNum);

      const attacker = convertToSmogonPokemon(gen, attackerConfig);
      const defender = convertToSmogonPokemon(gen, defenderConfig);

      if (!attacker || !defender) {
        return null;
      }

      // Convert move name to proper format for @smogon/calc
      // PokeAPI uses kebab-case (e.g., "focus-blast"), Smogon uses Title Case with spaces (e.g., "Focus Blast")
      const formattedMoveName = moveName
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");

      let move: Move;
      try {
        move = new Move(gen, formattedMoveName, {
          isCrit: fieldConfig.isCritical,
        });
      } catch {
        // Try with original name as fallback
        try {
          move = new Move(gen, moveName, {
            isCrit: fieldConfig.isCritical,
          });
        } catch {
          return null;
        }
      }

      const field = new Field({
        gameType: fieldConfig.gameType === "Doubles" ? "Doubles" : "Singles",
        weather: convertWeather(fieldConfig.weather),
        terrain: convertTerrain(fieldConfig.terrain),
        isGravity: fieldConfig.isGravity,
        isMagicRoom: fieldConfig.isMagicRoom,
        isWonderRoom: fieldConfig.isWonderRoom,
        attackerSide: {
          isTailwind: fieldConfig.attackerSide.isTailwind,
          isHelpingHand: fieldConfig.attackerSide.helpingHandCount >= 1,
          isFlowerGift: fieldConfig.attackerSide.isFlowerGift,
          isPowerSpot: fieldConfig.attackerSide.isPowerSpot,
          isBattery: fieldConfig.attackerSide.isBattery,
        },
        defenderSide: {
          isReflect: fieldConfig.defenderSide.isReflect,
          isLightScreen: fieldConfig.defenderSide.isLightScreen,
          isAuroraVeil: fieldConfig.defenderSide.isAuroraVeil,
          isTailwind: fieldConfig.defenderSide.isTailwind,
          isFriendGuard: fieldConfig.defenderSide.isFriendGuard,
        },
      });

      const result = calculate(gen, attacker, defender, move, field);

      // Get damage range
      const range = result.range();
      const minDamage = range[0];
      const maxDamage = range[1];

      // Calculate percentages
      const defenderMaxHp = defender.maxHP();
      const minPercent = (minDamage / defenderMaxHp) * 100;
      const maxPercent = (maxDamage / defenderMaxHp) * 100;

      return {
        damage: result.damage,
        minDamage,
        maxDamage,
        minPercent,
        maxPercent,
        defenderMaxHp,
        fullDesc: result.fullDesc(),
        moveDesc: result.moveDesc(),
        koChance: parseKoChance(result),
      };
    } catch {
      return null;
    }
  }, [attackerConfig, defenderConfig, moveName, fieldConfig, globalGeneration]);
}
