"use client";

import { useMemo } from "react";
import { calculate, Generations, Pokemon, Move, Field, type GenerationNum } from "@smogon/calc";
import { useGenerationStore } from "@/stores/generationStore";
import { DamageCalcPokemonConfig, DamageCalcFieldConfig, DamageCalcStatus } from "@/types/module";
import { toShowdownName, resolveShowdown } from "@/lib/pokemon/names";

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
  // Hazard damage on switch-in (percentage of max HP)
  hazardPercent: number;
  hazardBreakdown: {
    stealthRock: number;
    spikes: number;
    steelsurge: number;
  };
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
    // Resolve the app's PokéAPI slug to the Showdown display name @smogon/calc
    // expects (handles forms/gender/punctuation the old title-casing broke).
    const pokemonName = toShowdownName(config.pokemonName);

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

    // Terastallize (Gen 9)
    if (config.teraType && typeof config.teraType === "string" && config.teraType.trim()) {
      options.teraType = config.teraType;
    }

    // Dynamax (Gen 8)
    if (config.isDynamaxed) {
      options.isDynamaxed = true;
      options.dynamaxLevel = config.dynamaxLevel ?? 10;
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
    Hail: "Hail",
    Snow: "Snow",
    "Harsh Sunshine": "Harsh Sunshine",
    "Heavy Rain": "Heavy Rain",
    "Strong Winds": "Strong Winds",
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

// Type effectiveness chart for Stealth Rock (Rock type)
const ROCK_EFFECTIVENESS: Record<string, number> = {
  // 4x weak (50% damage)
  "Bug": 2, "Fire": 2, "Flying": 2, "Ice": 2,
  // 2x resist (6.25% damage)
  "Fighting": 0.5, "Ground": 0.5, "Steel": 0.5,
  // Neutral (12.5% damage)
  "Normal": 1, "Grass": 1, "Poison": 1, "Ghost": 1, "Water": 1,
  "Psychic": 1, "Dragon": 1, "Dark": 1, "Fairy": 1, "Electric": 1,
};

// Calculate hazard damage percentage
function calculateHazardDamage(
  defender: Pokemon,
  fieldConfig: DamageCalcFieldConfig
): { total: number; stealthRock: number; spikes: number; steelsurge: number } {
  let stealthRock = 0;
  let spikes = 0;
  let steelsurge = 0;

  // Check for immunities
  const ability = defender.ability?.toLowerCase() || "";
  const item = defender.item?.toLowerCase() || "";
  const isImmune = ability === "magic guard" || item === "heavy-duty boots";

  if (isImmune) {
    return { total: 0, stealthRock: 0, spikes: 0, steelsurge: 0 };
  }

  const types = defender.types;
  const isFlying = types.some(t => t?.toLowerCase() === "flying");
  const isGrounded = !isFlying && ability !== "levitate";

  // Stealth Rock damage (Rock type effectiveness)
  if (fieldConfig.defenderSide.isSR) {
    let effectiveness = 1;
    for (const type of types) {
      if (type) {
        const typeName = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
        effectiveness *= ROCK_EFFECTIVENESS[typeName] ?? 1;
      }
    }
    stealthRock = 12.5 * effectiveness; // Base 12.5%, modified by effectiveness
  }

  // Spikes damage (only grounded Pokemon)
  if (isGrounded && fieldConfig.defenderSide.spikes > 0) {
    const spikesLayers = fieldConfig.defenderSide.spikes;
    if (spikesLayers === 1) spikes = 12.5;      // 1/8
    else if (spikesLayers === 2) spikes = 16.67; // 1/6
    else if (spikesLayers >= 3) spikes = 25;     // 1/4
  }

  // Steelsurge damage (Steel type effectiveness, Gen 8)
  if (fieldConfig.defenderSide.steelsurge) {
    // Steelsurge works like Stealth Rock but with Steel type
    // For simplicity, use base 12.5% - would need full Steel effectiveness chart for accuracy
    let steelEffectiveness = 1;
    for (const type of types) {
      if (type) {
        const t = type.toLowerCase();
        // Steel is super effective against Ice, Rock, Fairy
        if (t === "ice" || t === "rock" || t === "fairy") steelEffectiveness *= 2;
        // Steel is resisted by Steel, Fire, Water, Electric
        else if (t === "steel" || t === "fire" || t === "water" || t === "electric") steelEffectiveness *= 0.5;
      }
    }
    steelsurge = 12.5 * steelEffectiveness;
  }

  return {
    total: stealthRock + spikes + steelsurge,
    stealthRock,
    spikes,
    steelsurge,
  };
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
): { result: DamageCalcResult | null; unresolvedSpecies: string | null } {
  const { globalGeneration } = useGenerationStore();

  return useMemo(() => {
    if (!attackerConfig.pokemonName || !defenderConfig.pokemonName || !moveName) {
      return { result: null, unresolvedSpecies: null };
    }

    // Detect unresolvable species before attempting the calc so we can surface
    // a visible error instead of silently returning null.
    const attackerUnresolved =
      attackerConfig.pokemonName && !resolveShowdown(attackerConfig.pokemonName).resolved
        ? attackerConfig.pokemonName
        : null;
    const defenderUnresolved =
      defenderConfig.pokemonName && !resolveShowdown(defenderConfig.pokemonName).resolved
        ? defenderConfig.pokemonName
        : null;
    const unresolvedSpecies = attackerUnresolved ?? defenderUnresolved;

    try {
      const gen = Generations.get(globalGeneration as GenerationNum);

      const attacker = convertToSmogonPokemon(gen, attackerConfig);
      const defender = convertToSmogonPokemon(gen, defenderConfig);

      if (!attacker || !defender) {
        return { result: null, unresolvedSpecies };
      }

      // Convert move name to proper format for @smogon/calc
      // PokeAPI uses kebab-case (e.g., "focus-blast"), Smogon uses Title Case with spaces (e.g., "Focus Blast")
      const formattedMoveName = moveName
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");

      // Build move options based on gimmicks
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const moveOptions: Record<string, any> = {
        isCrit: fieldConfig.isCritical,
      };

      // Z-Move (Gen 7) - pass useZ and the item
      if (attackerConfig.useZMove && globalGeneration === 7) {
        moveOptions.useZ = true;
        if (attackerConfig.item) {
          moveOptions.item = attackerConfig.item;
        }
      }

      // Max Move (Gen 8) - pass useMax and species for G-Max moves
      if (attackerConfig.isDynamaxed && globalGeneration === 8) {
        moveOptions.useMax = true;
        if (attackerConfig.pokemonName) {
          moveOptions.species = toShowdownName(attackerConfig.pokemonName);
        }
        if (attackerConfig.ability) {
          moveOptions.ability = attackerConfig.ability;
        }
      }

      let move: Move;
      try {
        move = new Move(gen, formattedMoveName, moveOptions);
      } catch {
        // Try with original name as fallback
        try {
          move = new Move(gen, moveName, moveOptions);
        } catch {
          return { result: null, unresolvedSpecies };
        }
      }

      const field = new Field({
        gameType: fieldConfig.gameType === "Doubles" ? "Doubles" : "Singles",
        weather: convertWeather(fieldConfig.weather),
        terrain: convertTerrain(fieldConfig.terrain),
        isGravity: fieldConfig.isGravity,
        isMagicRoom: fieldConfig.isMagicRoom,
        isWonderRoom: fieldConfig.isWonderRoom,
        // Aura effects (Gen 6+)
        isFairyAura: fieldConfig.isFairyAura,
        isDarkAura: fieldConfig.isDarkAura,
        isAuraBreak: fieldConfig.isAuraBreak,
        // Ruin abilities (Gen 9)
        isBeadsOfRuin: fieldConfig.isBeadsOfRuin,
        isSwordOfRuin: fieldConfig.isSwordOfRuin,
        isTabletsOfRuin: fieldConfig.isTabletsOfRuin,
        isVesselOfRuin: fieldConfig.isVesselOfRuin,
        attackerSide: {
          // Entry hazards
          spikes: fieldConfig.attackerSide.spikes,
          isSR: fieldConfig.attackerSide.isSR,
          steelsurge: fieldConfig.attackerSide.steelsurge,
          vinelash: fieldConfig.attackerSide.vinelash,
          wildfire: fieldConfig.attackerSide.wildfire,
          cannonade: fieldConfig.attackerSide.cannonade,
          volcalith: fieldConfig.attackerSide.volcalith,
          // Screens
          isReflect: fieldConfig.attackerSide.isReflect,
          isLightScreen: fieldConfig.attackerSide.isLightScreen,
          isAuroraVeil: fieldConfig.attackerSide.isAuroraVeil,
          // Protection & Status
          isProtected: fieldConfig.attackerSide.isProtected,
          isSeeded: fieldConfig.attackerSide.isSeeded,
          isForesight: fieldConfig.attackerSide.isForesight,
          // Support
          isTailwind: fieldConfig.attackerSide.isTailwind,
          isHelpingHand: fieldConfig.attackerSide.isHelpingHand,
          isFlowerGift: fieldConfig.attackerSide.isFlowerGift,
          isFriendGuard: fieldConfig.attackerSide.isFriendGuard,
          isPowerSpot: fieldConfig.attackerSide.isPowerSpot,
          isBattery: fieldConfig.attackerSide.isBattery,
          // Switching
          isSwitching: fieldConfig.attackerSide.isSwitching || undefined,
        },
        defenderSide: {
          // Entry hazards
          spikes: fieldConfig.defenderSide.spikes,
          isSR: fieldConfig.defenderSide.isSR,
          steelsurge: fieldConfig.defenderSide.steelsurge,
          vinelash: fieldConfig.defenderSide.vinelash,
          wildfire: fieldConfig.defenderSide.wildfire,
          cannonade: fieldConfig.defenderSide.cannonade,
          volcalith: fieldConfig.defenderSide.volcalith,
          // Screens
          isReflect: fieldConfig.defenderSide.isReflect,
          isLightScreen: fieldConfig.defenderSide.isLightScreen,
          isAuroraVeil: fieldConfig.defenderSide.isAuroraVeil,
          // Protection & Status
          isProtected: fieldConfig.defenderSide.isProtected,
          isSeeded: fieldConfig.defenderSide.isSeeded,
          isForesight: fieldConfig.defenderSide.isForesight,
          // Support
          isTailwind: fieldConfig.defenderSide.isTailwind,
          isHelpingHand: fieldConfig.defenderSide.isHelpingHand,
          isFlowerGift: fieldConfig.defenderSide.isFlowerGift,
          isFriendGuard: fieldConfig.defenderSide.isFriendGuard,
          isPowerSpot: fieldConfig.defenderSide.isPowerSpot,
          isBattery: fieldConfig.defenderSide.isBattery,
          // Switching
          isSwitching: fieldConfig.defenderSide.isSwitching || undefined,
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

      // Calculate hazard damage
      const hazardDamage = calculateHazardDamage(defender, fieldConfig);

      return {
        result: {
          damage: result.damage,
          minDamage,
          maxDamage,
          minPercent,
          maxPercent,
          defenderMaxHp,
          fullDesc: result.fullDesc(),
          moveDesc: result.moveDesc(),
          koChance: parseKoChance(result),
          hazardPercent: hazardDamage.total,
          hazardBreakdown: {
            stealthRock: hazardDamage.stealthRock,
            spikes: hazardDamage.spikes,
            steelsurge: hazardDamage.steelsurge,
          },
        },
        unresolvedSpecies,
      };
    } catch {
      return { result: null, unresolvedSpecies };
    }
  }, [attackerConfig, defenderConfig, moveName, fieldConfig, globalGeneration]);
}
