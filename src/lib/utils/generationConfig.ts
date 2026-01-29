/**
 * Generation-specific feature configuration for the damage calculator.
 * Defines what mechanics are available in each Pokemon generation.
 */

export type WeatherType = "Sun" | "Rain" | "Sand" | "Hail" | "Snow" | "Harsh Sunshine" | "Heavy Rain" | "Strong Winds";

export interface GenerationFeatures {
  // Core mechanics
  hasAbilities: boolean;
  hasItems: boolean;
  hasNatures: boolean;
  hasPhysicalSpecialSplit: boolean;

  // Weather
  hasWeather: boolean;
  weatherTypes: WeatherType[];

  // Terrain (Gen 6+)
  hasTerrains: boolean;

  // Field effects
  hasReflectLightScreen: boolean;
  hasAuroraVeil: boolean;
  hasTailwind: boolean;
  hasGravity: boolean;
  hasMagicRoom: boolean;
  hasWonderRoom: boolean;

  // Gimmicks
  hasZMoves: boolean;
  hasDynamax: boolean;
  hasTera: boolean;
}

/**
 * Get the features available for a specific generation.
 */
export function getGenerationFeatures(gen: number): GenerationFeatures {
  return {
    // Core mechanics - abilities and natures from Gen 3, items from Gen 2
    hasAbilities: gen >= 3,
    hasItems: gen >= 2,
    hasNatures: gen >= 3,
    hasPhysicalSpecialSplit: gen >= 4,

    // Weather
    hasWeather: gen >= 2,
    weatherTypes: getWeatherTypes(gen),

    // Terrain (Gen 6+)
    hasTerrains: gen >= 6,

    // Field effects
    hasReflectLightScreen: true, // Available in all gens
    hasAuroraVeil: gen >= 7,
    hasTailwind: gen >= 4,
    hasGravity: gen >= 4,
    hasMagicRoom: gen >= 5,
    hasWonderRoom: gen >= 5,

    // Gimmicks - each exclusive to their generation
    hasZMoves: gen === 7,
    hasDynamax: gen === 8,
    hasTera: gen >= 9,
  };
}

/**
 * Get available weather types for a generation.
 */
function getWeatherTypes(gen: number): WeatherType[] {
  if (gen < 2) return [];

  const weathers: WeatherType[] = ["Sun", "Rain", "Sand"];

  // Hail: Gen 3-8, Snow: Gen 9+
  if (gen >= 3 && gen <= 8) {
    weathers.push("Hail");
  }
  if (gen >= 9) {
    weathers.push("Snow");
  }

  // Primal weather: Gen 6-8 only (Primal Groudon/Kyogre, Mega Rayquaza)
  if (gen >= 6 && gen <= 8) {
    weathers.push("Harsh Sunshine", "Heavy Rain", "Strong Winds");
  }

  return weathers;
}

/**
 * All possible terrain types (Gen 6+)
 */
export const TERRAIN_TYPES = ["Electric", "Grassy", "Misty", "Psychic"] as const;
export type TerrainType = typeof TERRAIN_TYPES[number];

/**
 * All Pokemon types for Tera Type selector
 */
export const POKEMON_TYPES = [
  "Normal", "Fire", "Water", "Electric", "Grass", "Ice",
  "Fighting", "Poison", "Ground", "Flying", "Psychic", "Bug",
  "Rock", "Ghost", "Dragon", "Dark", "Steel", "Fairy", "Stellar"
] as const;
export type PokemonType = typeof POKEMON_TYPES[number];

/**
 * Z-Move names by type (lowercase keys to match PokemonTypeName)
 */
export const Z_MOVE_NAMES: Record<string, string> = {
  "normal": "Breakneck Blitz",
  "fire": "Inferno Overdrive",
  "water": "Hydro Vortex",
  "electric": "Gigavolt Havoc",
  "grass": "Bloom Doom",
  "ice": "Subzero Slammer",
  "fighting": "All-Out Pummeling",
  "poison": "Acid Downpour",
  "ground": "Tectonic Rage",
  "flying": "Supersonic Skystrike",
  "psychic": "Shattered Psyche",
  "bug": "Savage Spin-Out",
  "rock": "Continental Crush",
  "ghost": "Never-Ending Nightmare",
  "dragon": "Devastating Drake",
  "dark": "Black Hole Eclipse",
  "steel": "Corkscrew Crash",
  "fairy": "Twinkle Tackle",
};

/**
 * Max Move names by type (lowercase keys to match PokemonTypeName)
 */
export const MAX_MOVE_NAMES: Record<string, string> = {
  "normal": "Max Strike",
  "fire": "Max Flare",
  "water": "Max Geyser",
  "electric": "Max Lightning",
  "grass": "Max Overgrowth",
  "ice": "Max Hailstorm",
  "fighting": "Max Knuckle",
  "poison": "Max Ooze",
  "ground": "Max Quake",
  "flying": "Max Airstream",
  "psychic": "Max Mindstorm",
  "bug": "Max Flutterby",
  "rock": "Max Rockfall",
  "ghost": "Max Phantasm",
  "dragon": "Max Wyrmwind",
  "dark": "Max Darkness",
  "steel": "Max Steelspike",
  "fairy": "Max Starfall",
};

/**
 * Get Z-Move name for a move type
 */
export function getZMoveName(moveType: string): string {
  return Z_MOVE_NAMES[moveType] || "Z-Move";
}

/**
 * Get Max Move name for a move type
 */
export function getMaxMoveName(moveType: string): string {
  return MAX_MOVE_NAMES[moveType] || "Max Move";
}

/**
 * Calculate Z-Move power based on original move's base power
 * Status moves don't have Z-Move power (they become Z-Status moves with effects)
 */
export function getZMovePower(basePower: number | null): number | null {
  if (basePower === null || basePower === 0) return null; // Status move

  if (basePower <= 55) return 100;
  if (basePower <= 65) return 120;
  if (basePower <= 75) return 140;
  if (basePower <= 85) return 160;
  if (basePower <= 95) return 175;
  if (basePower === 100) return 180;
  if (basePower <= 110) return 185;
  if (basePower <= 125) return 190;
  if (basePower <= 130) return 195;
  return 200; // 140+ BP
}

/**
 * Calculate Max Move power based on original move's base power
 * Status moves become Max Guard
 * Power scaling based on official game data:
 * 10-40 BP → 90, 45-50 BP → 100, 55-60 BP → 110, 65-70 BP → 120,
 * 75-100 BP → 130, 110-140 BP → 140, 150+ BP → 150
 */
export function getMaxMovePower(basePower: number | null, _moveType?: string): number | null {
  if (basePower === null || basePower === 0) return null; // Becomes Max Guard

  if (basePower <= 40) return 90;
  if (basePower <= 50) return 100;
  if (basePower <= 60) return 110;
  if (basePower <= 70) return 120;
  if (basePower <= 100) return 130;
  if (basePower <= 140) return 140;
  return 150; // 150+ BP
}

/**
 * Max Move secondary effects by type (lowercase keys to match PokemonTypeName)
 */
export const MAX_MOVE_EFFECTS: Record<string, string> = {
  "normal": "Lowers the target's Speed by 1 stage",
  "fire": "Sets up harsh sunlight for 5 turns",
  "water": "Sets up rain for 5 turns",
  "electric": "Sets up Electric Terrain for 5 turns",
  "grass": "Sets up Grassy Terrain for 5 turns",
  "ice": "Sets up hail for 5 turns",
  "fighting": "Raises ally Pokémon's Attack by 1 stage",
  "poison": "Raises ally Pokémon's Sp. Atk by 1 stage",
  "ground": "Raises ally Pokémon's Sp. Def by 1 stage",
  "flying": "Raises ally Pokémon's Speed by 1 stage",
  "psychic": "Sets up Psychic Terrain for 5 turns",
  "bug": "Lowers the target's Sp. Atk by 1 stage",
  "rock": "Sets up a sandstorm for 5 turns",
  "ghost": "Lowers the target's Defense by 1 stage",
  "dragon": "Lowers the target's Attack by 1 stage",
  "dark": "Lowers the target's Sp. Def by 1 stage",
  "steel": "Raises ally Pokémon's Defense by 1 stage",
  "fairy": "Sets up Misty Terrain for 5 turns",
};

/**
 * Get Max Move effect description
 */
export function getMaxMoveEffect(moveType: string): string {
  return MAX_MOVE_EFFECTS[moveType] || "Unknown effect";
}

/**
 * Gigantamax Pokemon and their signature G-Max moves
 * Effects are abbreviated versions of official descriptions
 * Type values are lowercase to match PokemonTypeName
 */
export const GIGANTAMAX_POKEMON: Record<string, { move: string; type: string; effect: string }> = {
  // Gen 8 Gigantamax forms
  "charizard": { move: "G-Max Wildfire", type: "fire", effect: "Deals damage to non-Fire-type opponents for 4 turns" },
  "charizard-gmax": { move: "G-Max Wildfire", type: "fire", effect: "Deals damage to non-Fire-type opponents for 4 turns" },
  "butterfree": { move: "G-Max Befuddle", type: "bug", effect: "Inflicts Poison, Paralysis, or Sleep on opponents" },
  "butterfree-gmax": { move: "G-Max Befuddle", type: "bug", effect: "Inflicts Poison, Paralysis, or Sleep on opponents" },
  "pikachu": { move: "G-Max Volt Crash", type: "electric", effect: "Paralyzes all opponents" },
  "pikachu-gmax": { move: "G-Max Volt Crash", type: "electric", effect: "Paralyzes all opponents" },
  "meowth": { move: "G-Max Gold Rush", type: "normal", effect: "Confuses opponents and earns extra money" },
  "meowth-gmax": { move: "G-Max Gold Rush", type: "normal", effect: "Confuses opponents and earns extra money" },
  "machamp": { move: "G-Max Chi Strike", type: "fighting", effect: "Raises critical hit ratio of allies" },
  "machamp-gmax": { move: "G-Max Chi Strike", type: "fighting", effect: "Raises critical hit ratio of allies" },
  "gengar": { move: "G-Max Terror", type: "ghost", effect: "Traps opponents, preventing escape" },
  "gengar-gmax": { move: "G-Max Terror", type: "ghost", effect: "Traps opponents, preventing escape" },
  "kingler": { move: "G-Max Foam Burst", type: "water", effect: "Harshly lowers opponents' Speed" },
  "kingler-gmax": { move: "G-Max Foam Burst", type: "water", effect: "Harshly lowers opponents' Speed" },
  "lapras": { move: "G-Max Resonance", type: "ice", effect: "Reduces damage received for 5 turns (Aurora Veil)" },
  "lapras-gmax": { move: "G-Max Resonance", type: "ice", effect: "Reduces damage received for 5 turns (Aurora Veil)" },
  "eevee": { move: "G-Max Cuddle", type: "normal", effect: "Infatuates opponents" },
  "eevee-gmax": { move: "G-Max Cuddle", type: "normal", effect: "Infatuates opponents" },
  "snorlax": { move: "G-Max Replenish", type: "normal", effect: "Restores Berries that have been eaten" },
  "snorlax-gmax": { move: "G-Max Replenish", type: "normal", effect: "Restores Berries that have been eaten" },
  "garbodor": { move: "G-Max Malodor", type: "poison", effect: "Poisons all opponents" },
  "garbodor-gmax": { move: "G-Max Malodor", type: "poison", effect: "Poisons all opponents" },
  "melmetal": { move: "G-Max Meltdown", type: "steel", effect: "Prevents opponents from using the same move twice" },
  "corviknight": { move: "G-Max Wind Rage", type: "flying", effect: "Removes Reflect, Light Screen, and hazards" },
  "corviknight-gmax": { move: "G-Max Wind Rage", type: "flying", effect: "Removes Reflect, Light Screen, and hazards" },
  "orbeetle": { move: "G-Max Gravitas", type: "psychic", effect: "Sets up Gravity for 5 turns" },
  "orbeetle-gmax": { move: "G-Max Gravitas", type: "psychic", effect: "Sets up Gravity for 5 turns" },
  "drednaw": { move: "G-Max Stonesurge", type: "water", effect: "Sets up Stealth Rock" },
  "drednaw-gmax": { move: "G-Max Stonesurge", type: "water", effect: "Sets up Stealth Rock" },
  "coalossal": { move: "G-Max Volcalith", type: "rock", effect: "Deals damage to non-Rock-type opponents for 4 turns" },
  "coalossal-gmax": { move: "G-Max Volcalith", type: "rock", effect: "Deals damage to non-Rock-type opponents for 4 turns" },
  "flapple": { move: "G-Max Tartness", type: "grass", effect: "Lowers opponents' Evasiveness" },
  "flapple-gmax": { move: "G-Max Tartness", type: "grass", effect: "Lowers opponents' Evasiveness" },
  "appletun": { move: "G-Max Sweetness", type: "grass", effect: "Heals status conditions of allies" },
  "appletun-gmax": { move: "G-Max Sweetness", type: "grass", effect: "Heals status conditions of allies" },
  "sandaconda": { move: "G-Max Sandblast", type: "ground", effect: "Traps opponents in a sandstorm for 4-5 turns" },
  "sandaconda-gmax": { move: "G-Max Sandblast", type: "ground", effect: "Traps opponents in a sandstorm for 4-5 turns" },
  "toxtricity": { move: "G-Max Stun Shock", type: "electric", effect: "Poisons or Paralyzes opponents" },
  "toxtricity-amped": { move: "G-Max Stun Shock", type: "electric", effect: "Poisons or Paralyzes opponents" },
  "toxtricity-amped-gmax": { move: "G-Max Stun Shock", type: "electric", effect: "Poisons or Paralyzes opponents" },
  "toxtricity-low-key": { move: "G-Max Stun Shock", type: "electric", effect: "Poisons or Paralyzes opponents" },
  "toxtricity-low-key-gmax": { move: "G-Max Stun Shock", type: "electric", effect: "Poisons or Paralyzes opponents" },
  "centiskorch": { move: "G-Max Centiferno", type: "fire", effect: "Traps opponents in flames for 4-5 turns" },
  "centiskorch-gmax": { move: "G-Max Centiferno", type: "fire", effect: "Traps opponents in flames for 4-5 turns" },
  "hatterene": { move: "G-Max Smite", type: "fairy", effect: "Confuses all opponents" },
  "hatterene-gmax": { move: "G-Max Smite", type: "fairy", effect: "Confuses all opponents" },
  "grimmsnarl": { move: "G-Max Snooze", type: "dark", effect: "Makes opponents drowsy (sleep next turn)" },
  "grimmsnarl-gmax": { move: "G-Max Snooze", type: "dark", effect: "Makes opponents drowsy (sleep next turn)" },
  "alcremie": { move: "G-Max Finale", type: "fairy", effect: "Heals HP of allies" },
  "alcremie-gmax": { move: "G-Max Finale", type: "fairy", effect: "Heals HP of allies" },
  "copperajah": { move: "G-Max Steelsurge", type: "steel", effect: "Sets up Steel-type entry hazard (Steelsurge)" },
  "copperajah-gmax": { move: "G-Max Steelsurge", type: "steel", effect: "Sets up Steel-type entry hazard (Steelsurge)" },
  "duraludon": { move: "G-Max Depletion", type: "dragon", effect: "Reduces PP of the last move used" },
  "duraludon-gmax": { move: "G-Max Depletion", type: "dragon", effect: "Reduces PP of the last move used" },
  "urshifu": { move: "G-Max One Blow", type: "dark", effect: "Bypasses Protect and Max Guard" },
  "urshifu-single-strike": { move: "G-Max One Blow", type: "dark", effect: "Bypasses Protect and Max Guard" },
  "urshifu-single-strike-gmax": { move: "G-Max One Blow", type: "dark", effect: "Bypasses Protect and Max Guard" },
  "urshifu-rapid-strike": { move: "G-Max Rapid Flow", type: "water", effect: "Bypasses Protect and Max Guard" },
  "urshifu-rapid-strike-gmax": { move: "G-Max Rapid Flow", type: "water", effect: "Bypasses Protect and Max Guard" },
  "rillaboom": { move: "G-Max Drum Solo", type: "grass", effect: "Ignores opponents' abilities (always 160 BP)" },
  "rillaboom-gmax": { move: "G-Max Drum Solo", type: "grass", effect: "Ignores opponents' abilities (always 160 BP)" },
  "cinderace": { move: "G-Max Fireball", type: "fire", effect: "Ignores opponents' abilities (always 160 BP)" },
  "cinderace-gmax": { move: "G-Max Fireball", type: "fire", effect: "Ignores opponents' abilities (always 160 BP)" },
  "inteleon": { move: "G-Max Hydrosnipe", type: "water", effect: "Ignores opponents' abilities (always 160 BP)" },
  "inteleon-gmax": { move: "G-Max Hydrosnipe", type: "water", effect: "Ignores opponents' abilities (always 160 BP)" },
  "venusaur": { move: "G-Max Vine Lash", type: "grass", effect: "Deals damage to non-Grass-type opponents for 4 turns" },
  "venusaur-gmax": { move: "G-Max Vine Lash", type: "grass", effect: "Deals damage to non-Grass-type opponents for 4 turns" },
  "blastoise": { move: "G-Max Cannonade", type: "water", effect: "Deals damage to non-Water-type opponents for 4 turns" },
  "blastoise-gmax": { move: "G-Max Cannonade", type: "water", effect: "Deals damage to non-Water-type opponents for 4 turns" },
};

/**
 * Check if a Pokemon can Gigantamax
 */
export function canGigantamax(pokemonName: string): boolean {
  const normalized = pokemonName.toLowerCase().replace(/[^a-z0-9-]/g, "");
  return normalized in GIGANTAMAX_POKEMON;
}

/**
 * Get G-Max move info for a Pokemon
 */
export function getGMaxMove(pokemonName: string): { move: string; type: string; effect: string } | null {
  const normalized = pokemonName.toLowerCase().replace(/[^a-z0-9-]/g, "");
  return GIGANTAMAX_POKEMON[normalized] || null;
}

/**
 * Calculate Dynamax HP multiplier based on Dynamax level (0-10)
 * At level 10, HP is doubled (2x)
 */
export function getDynamaxHpMultiplier(dynamaxLevel: number): number {
  return 1 + (0.05 * Math.min(10, Math.max(0, dynamaxLevel)));
}

/**
 * Mega Pokemon data - maps Mega Pokemon names to their info
 * Includes base species ID for sprite lookup and required Mega Stone
 * Gen 6-7 only
 */
export interface MegaPokemonInfo {
  name: string;           // API name (e.g., "venusaur-mega")
  displayName: string;    // Display name (e.g., "Mega Venusaur")
  baseSpeciesId: number;  // Base Pokemon ID for display (e.g., #3 for Venusaur)
  formId: number;         // PokeAPI form ID for sprite lookup
  megaStone: string;      // Required held item
}

export const MEGA_POKEMON: MegaPokemonInfo[] = [
  // Gen 1 Megas
  { name: "venusaur-mega", displayName: "Mega Venusaur", baseSpeciesId: 3, formId: 10033, megaStone: "Venusaurite" },
  { name: "charizard-mega-x", displayName: "Mega Charizard X", baseSpeciesId: 6, formId: 10034, megaStone: "Charizardite X" },
  { name: "charizard-mega-y", displayName: "Mega Charizard Y", baseSpeciesId: 6, formId: 10035, megaStone: "Charizardite Y" },
  { name: "blastoise-mega", displayName: "Mega Blastoise", baseSpeciesId: 9, formId: 10036, megaStone: "Blastoisinite" },
  { name: "beedrill-mega", displayName: "Mega Beedrill", baseSpeciesId: 15, formId: 10090, megaStone: "Beedrillite" },
  { name: "pidgeot-mega", displayName: "Mega Pidgeot", baseSpeciesId: 18, formId: 10073, megaStone: "Pidgeotite" },
  { name: "alakazam-mega", displayName: "Mega Alakazam", baseSpeciesId: 65, formId: 10037, megaStone: "Alakazite" },
  { name: "slowbro-mega", displayName: "Mega Slowbro", baseSpeciesId: 80, formId: 10071, megaStone: "Slowbronite" },
  { name: "gengar-mega", displayName: "Mega Gengar", baseSpeciesId: 94, formId: 10038, megaStone: "Gengarite" },
  { name: "kangaskhan-mega", displayName: "Mega Kangaskhan", baseSpeciesId: 115, formId: 10039, megaStone: "Kangaskhanite" },
  { name: "pinsir-mega", displayName: "Mega Pinsir", baseSpeciesId: 127, formId: 10040, megaStone: "Pinsirite" },
  { name: "gyarados-mega", displayName: "Mega Gyarados", baseSpeciesId: 130, formId: 10041, megaStone: "Gyaradosite" },
  { name: "aerodactyl-mega", displayName: "Mega Aerodactyl", baseSpeciesId: 142, formId: 10042, megaStone: "Aerodactylite" },
  { name: "mewtwo-mega-x", displayName: "Mega Mewtwo X", baseSpeciesId: 150, formId: 10043, megaStone: "Mewtwonite X" },
  { name: "mewtwo-mega-y", displayName: "Mega Mewtwo Y", baseSpeciesId: 150, formId: 10044, megaStone: "Mewtwonite Y" },
  // Gen 2 Megas
  { name: "ampharos-mega", displayName: "Mega Ampharos", baseSpeciesId: 181, formId: 10045, megaStone: "Ampharosite" },
  { name: "steelix-mega", displayName: "Mega Steelix", baseSpeciesId: 208, formId: 10072, megaStone: "Steelixite" },
  { name: "scizor-mega", displayName: "Mega Scizor", baseSpeciesId: 212, formId: 10046, megaStone: "Scizorite" },
  { name: "heracross-mega", displayName: "Mega Heracross", baseSpeciesId: 214, formId: 10047, megaStone: "Heracronite" },
  { name: "houndoom-mega", displayName: "Mega Houndoom", baseSpeciesId: 229, formId: 10048, megaStone: "Houndoominite" },
  { name: "tyranitar-mega", displayName: "Mega Tyranitar", baseSpeciesId: 248, formId: 10049, megaStone: "Tyranitarite" },
  // Gen 3 Megas
  { name: "sceptile-mega", displayName: "Mega Sceptile", baseSpeciesId: 254, formId: 10065, megaStone: "Sceptilite" },
  { name: "blaziken-mega", displayName: "Mega Blaziken", baseSpeciesId: 257, formId: 10050, megaStone: "Blazikenite" },
  { name: "swampert-mega", displayName: "Mega Swampert", baseSpeciesId: 260, formId: 10064, megaStone: "Swampertite" },
  { name: "gardevoir-mega", displayName: "Mega Gardevoir", baseSpeciesId: 282, formId: 10051, megaStone: "Gardevoirite" },
  { name: "sableye-mega", displayName: "Mega Sableye", baseSpeciesId: 302, formId: 10066, megaStone: "Sablenite" },
  { name: "mawile-mega", displayName: "Mega Mawile", baseSpeciesId: 303, formId: 10052, megaStone: "Mawilite" },
  { name: "aggron-mega", displayName: "Mega Aggron", baseSpeciesId: 306, formId: 10053, megaStone: "Aggronite" },
  { name: "medicham-mega", displayName: "Mega Medicham", baseSpeciesId: 308, formId: 10054, megaStone: "Medichamite" },
  { name: "manectric-mega", displayName: "Mega Manectric", baseSpeciesId: 310, formId: 10055, megaStone: "Manectite" },
  { name: "sharpedo-mega", displayName: "Mega Sharpedo", baseSpeciesId: 319, formId: 10070, megaStone: "Sharpedoite" },
  { name: "camerupt-mega", displayName: "Mega Camerupt", baseSpeciesId: 323, formId: 10087, megaStone: "Cameruptite" },
  { name: "altaria-mega", displayName: "Mega Altaria", baseSpeciesId: 334, formId: 10067, megaStone: "Altarianite" },
  { name: "banette-mega", displayName: "Mega Banette", baseSpeciesId: 354, formId: 10056, megaStone: "Banettite" },
  { name: "absol-mega", displayName: "Mega Absol", baseSpeciesId: 359, formId: 10057, megaStone: "Absolite" },
  { name: "glalie-mega", displayName: "Mega Glalie", baseSpeciesId: 362, formId: 10074, megaStone: "Glalitite" },
  { name: "salamence-mega", displayName: "Mega Salamence", baseSpeciesId: 373, formId: 10089, megaStone: "Salamencite" },
  { name: "metagross-mega", displayName: "Mega Metagross", baseSpeciesId: 376, formId: 10076, megaStone: "Metagrossite" },
  { name: "latias-mega", displayName: "Mega Latias", baseSpeciesId: 380, formId: 10062, megaStone: "Latiasite" },
  { name: "latios-mega", displayName: "Mega Latios", baseSpeciesId: 381, formId: 10063, megaStone: "Latiosite" },
  { name: "rayquaza-mega", displayName: "Mega Rayquaza", baseSpeciesId: 384, formId: 10079, megaStone: "Dragon Ascent" }, // No stone, requires Dragon Ascent
  // Gen 4 Megas
  { name: "lopunny-mega", displayName: "Mega Lopunny", baseSpeciesId: 428, formId: 10088, megaStone: "Lopunnite" },
  { name: "garchomp-mega", displayName: "Mega Garchomp", baseSpeciesId: 445, formId: 10058, megaStone: "Garchompite" },
  { name: "lucario-mega", displayName: "Mega Lucario", baseSpeciesId: 448, formId: 10059, megaStone: "Lucarionite" },
  { name: "abomasnow-mega", displayName: "Mega Abomasnow", baseSpeciesId: 460, formId: 10060, megaStone: "Abomasite" },
  { name: "gallade-mega", displayName: "Mega Gallade", baseSpeciesId: 475, formId: 10068, megaStone: "Galladite" },
  // Gen 5 Megas
  { name: "audino-mega", displayName: "Mega Audino", baseSpeciesId: 531, formId: 10069, megaStone: "Audinite" },
  // Gen 6 Megas
  { name: "diancie-mega", displayName: "Mega Diancie", baseSpeciesId: 719, formId: 10075, megaStone: "Diancite" },
  // Primal Reversions (similar mechanic)
  { name: "groudon-primal", displayName: "Primal Groudon", baseSpeciesId: 383, formId: 10078, megaStone: "Red Orb" },
  { name: "kyogre-primal", displayName: "Primal Kyogre", baseSpeciesId: 382, formId: 10077, megaStone: "Blue Orb" },
];

/**
 * Map from Mega Pokemon name to its Mega Stone
 */
export const MEGA_STONE_MAP: Record<string, string> = Object.fromEntries(
  MEGA_POKEMON.map(m => [m.name, m.megaStone])
);

/**
 * Check if a Pokemon is a Mega Pokemon
 */
export function isMegaPokemon(pokemonName: string | null): boolean {
  if (!pokemonName) return false;
  return pokemonName.includes("-mega") || pokemonName.includes("-primal");
}

/**
 * Get the Mega Stone required for a Mega Pokemon
 */
export function getMegaStone(pokemonName: string | null): string | null {
  if (!pokemonName) return null;
  return MEGA_STONE_MAP[pokemonName] || null;
}

/**
 * Get Mega Pokemon info by name
 */
export function getMegaPokemonInfo(pokemonName: string): MegaPokemonInfo | null {
  return MEGA_POKEMON.find(m => m.name === pokemonName) || null;
}

/**
 * Regional variant data - maps regional form names to their info
 * Includes base species ID for display and formId for sprites
 */
export interface RegionalVariantInfo {
  name: string;           // API name (e.g., "raichu-alola")
  displayName: string;    // Display name (e.g., "Alolan Raichu")
  baseSpeciesId: number;  // Base Pokemon ID for display (e.g., #26 for Raichu)
  formId: number;         // PokeAPI form ID for sprite lookup
  region: "alola" | "galar" | "hisui" | "paldea";
  minGeneration: number;  // First generation this form appears in
}

export const REGIONAL_VARIANTS: RegionalVariantInfo[] = [
  // ===== ALOLAN FORMS (Gen 7+) =====
  { name: "rattata-alola", displayName: "Alolan Rattata", baseSpeciesId: 19, formId: 10091, region: "alola", minGeneration: 7 },
  { name: "raticate-alola", displayName: "Alolan Raticate", baseSpeciesId: 20, formId: 10092, region: "alola", minGeneration: 7 },
  { name: "raichu-alola", displayName: "Alolan Raichu", baseSpeciesId: 26, formId: 10100, region: "alola", minGeneration: 7 },
  { name: "sandshrew-alola", displayName: "Alolan Sandshrew", baseSpeciesId: 27, formId: 10101, region: "alola", minGeneration: 7 },
  { name: "sandslash-alola", displayName: "Alolan Sandslash", baseSpeciesId: 28, formId: 10102, region: "alola", minGeneration: 7 },
  { name: "vulpix-alola", displayName: "Alolan Vulpix", baseSpeciesId: 37, formId: 10103, region: "alola", minGeneration: 7 },
  { name: "ninetales-alola", displayName: "Alolan Ninetales", baseSpeciesId: 38, formId: 10104, region: "alola", minGeneration: 7 },
  { name: "diglett-alola", displayName: "Alolan Diglett", baseSpeciesId: 50, formId: 10105, region: "alola", minGeneration: 7 },
  { name: "dugtrio-alola", displayName: "Alolan Dugtrio", baseSpeciesId: 51, formId: 10106, region: "alola", minGeneration: 7 },
  { name: "meowth-alola", displayName: "Alolan Meowth", baseSpeciesId: 52, formId: 10107, region: "alola", minGeneration: 7 },
  { name: "persian-alola", displayName: "Alolan Persian", baseSpeciesId: 53, formId: 10108, region: "alola", minGeneration: 7 },
  { name: "geodude-alola", displayName: "Alolan Geodude", baseSpeciesId: 74, formId: 10109, region: "alola", minGeneration: 7 },
  { name: "graveler-alola", displayName: "Alolan Graveler", baseSpeciesId: 75, formId: 10110, region: "alola", minGeneration: 7 },
  { name: "golem-alola", displayName: "Alolan Golem", baseSpeciesId: 76, formId: 10111, region: "alola", minGeneration: 7 },
  { name: "grimer-alola", displayName: "Alolan Grimer", baseSpeciesId: 88, formId: 10112, region: "alola", minGeneration: 7 },
  { name: "muk-alola", displayName: "Alolan Muk", baseSpeciesId: 89, formId: 10113, region: "alola", minGeneration: 7 },
  { name: "exeggutor-alola", displayName: "Alolan Exeggutor", baseSpeciesId: 103, formId: 10114, region: "alola", minGeneration: 7 },
  { name: "marowak-alola", displayName: "Alolan Marowak", baseSpeciesId: 105, formId: 10115, region: "alola", minGeneration: 7 },

  // ===== GALARIAN FORMS (Gen 8+) =====
  { name: "meowth-galar", displayName: "Galarian Meowth", baseSpeciesId: 52, formId: 10161, region: "galar", minGeneration: 8 },
  { name: "ponyta-galar", displayName: "Galarian Ponyta", baseSpeciesId: 77, formId: 10162, region: "galar", minGeneration: 8 },
  { name: "rapidash-galar", displayName: "Galarian Rapidash", baseSpeciesId: 78, formId: 10163, region: "galar", minGeneration: 8 },
  { name: "slowpoke-galar", displayName: "Galarian Slowpoke", baseSpeciesId: 79, formId: 10164, region: "galar", minGeneration: 8 },
  { name: "slowbro-galar", displayName: "Galarian Slowbro", baseSpeciesId: 80, formId: 10165, region: "galar", minGeneration: 8 },
  { name: "farfetchd-galar", displayName: "Galarian Farfetch'd", baseSpeciesId: 83, formId: 10166, region: "galar", minGeneration: 8 },
  { name: "weezing-galar", displayName: "Galarian Weezing", baseSpeciesId: 110, formId: 10167, region: "galar", minGeneration: 8 },
  { name: "mr-mime-galar", displayName: "Galarian Mr. Mime", baseSpeciesId: 122, formId: 10168, region: "galar", minGeneration: 8 },
  { name: "articuno-galar", displayName: "Galarian Articuno", baseSpeciesId: 144, formId: 10169, region: "galar", minGeneration: 8 },
  { name: "zapdos-galar", displayName: "Galarian Zapdos", baseSpeciesId: 145, formId: 10170, region: "galar", minGeneration: 8 },
  { name: "moltres-galar", displayName: "Galarian Moltres", baseSpeciesId: 146, formId: 10171, region: "galar", minGeneration: 8 },
  { name: "slowking-galar", displayName: "Galarian Slowking", baseSpeciesId: 199, formId: 10172, region: "galar", minGeneration: 8 },
  { name: "corsola-galar", displayName: "Galarian Corsola", baseSpeciesId: 222, formId: 10173, region: "galar", minGeneration: 8 },
  { name: "zigzagoon-galar", displayName: "Galarian Zigzagoon", baseSpeciesId: 263, formId: 10174, region: "galar", minGeneration: 8 },
  { name: "linoone-galar", displayName: "Galarian Linoone", baseSpeciesId: 264, formId: 10175, region: "galar", minGeneration: 8 },
  { name: "darumaka-galar", displayName: "Galarian Darumaka", baseSpeciesId: 554, formId: 10176, region: "galar", minGeneration: 8 },
  { name: "darmanitan-galar-standard", displayName: "Galarian Darmanitan", baseSpeciesId: 555, formId: 10177, region: "galar", minGeneration: 8 },
  { name: "yamask-galar", displayName: "Galarian Yamask", baseSpeciesId: 562, formId: 10178, region: "galar", minGeneration: 8 },
  { name: "stunfisk-galar", displayName: "Galarian Stunfisk", baseSpeciesId: 618, formId: 10179, region: "galar", minGeneration: 8 },

  // ===== HISUIAN FORMS (Gen 8 Legends/Gen 9+) =====
  { name: "growlithe-hisui", displayName: "Hisuian Growlithe", baseSpeciesId: 58, formId: 10229, region: "hisui", minGeneration: 8 },
  { name: "arcanine-hisui", displayName: "Hisuian Arcanine", baseSpeciesId: 59, formId: 10230, region: "hisui", minGeneration: 8 },
  { name: "voltorb-hisui", displayName: "Hisuian Voltorb", baseSpeciesId: 100, formId: 10231, region: "hisui", minGeneration: 8 },
  { name: "electrode-hisui", displayName: "Hisuian Electrode", baseSpeciesId: 101, formId: 10232, region: "hisui", minGeneration: 8 },
  { name: "typhlosion-hisui", displayName: "Hisuian Typhlosion", baseSpeciesId: 157, formId: 10233, region: "hisui", minGeneration: 8 },
  { name: "qwilfish-hisui", displayName: "Hisuian Qwilfish", baseSpeciesId: 211, formId: 10234, region: "hisui", minGeneration: 8 },
  { name: "sneasel-hisui", displayName: "Hisuian Sneasel", baseSpeciesId: 215, formId: 10235, region: "hisui", minGeneration: 8 },
  { name: "samurott-hisui", displayName: "Hisuian Samurott", baseSpeciesId: 503, formId: 10236, region: "hisui", minGeneration: 8 },
  { name: "lilligant-hisui", displayName: "Hisuian Lilligant", baseSpeciesId: 549, formId: 10237, region: "hisui", minGeneration: 8 },
  { name: "zorua-hisui", displayName: "Hisuian Zorua", baseSpeciesId: 570, formId: 10238, region: "hisui", minGeneration: 8 },
  { name: "zoroark-hisui", displayName: "Hisuian Zoroark", baseSpeciesId: 571, formId: 10239, region: "hisui", minGeneration: 8 },
  { name: "braviary-hisui", displayName: "Hisuian Braviary", baseSpeciesId: 628, formId: 10240, region: "hisui", minGeneration: 8 },
  { name: "sliggoo-hisui", displayName: "Hisuian Sliggoo", baseSpeciesId: 705, formId: 10241, region: "hisui", minGeneration: 8 },
  { name: "goodra-hisui", displayName: "Hisuian Goodra", baseSpeciesId: 706, formId: 10242, region: "hisui", minGeneration: 8 },
  { name: "avalugg-hisui", displayName: "Hisuian Avalugg", baseSpeciesId: 713, formId: 10243, region: "hisui", minGeneration: 8 },
  { name: "decidueye-hisui", displayName: "Hisuian Decidueye", baseSpeciesId: 724, formId: 10244, region: "hisui", minGeneration: 8 },

  // ===== PALDEAN FORMS (Gen 9+) =====
  { name: "wooper-paldea", displayName: "Paldean Wooper", baseSpeciesId: 194, formId: 10253, region: "paldea", minGeneration: 9 },
  { name: "tauros-paldea-combat-breed", displayName: "Paldean Tauros (Combat)", baseSpeciesId: 128, formId: 10250, region: "paldea", minGeneration: 9 },
  { name: "tauros-paldea-blaze-breed", displayName: "Paldean Tauros (Blaze)", baseSpeciesId: 128, formId: 10251, region: "paldea", minGeneration: 9 },
  { name: "tauros-paldea-aqua-breed", displayName: "Paldean Tauros (Aqua)", baseSpeciesId: 128, formId: 10252, region: "paldea", minGeneration: 9 },
];

/**
 * Check if a Pokemon is a regional variant
 */
export function isRegionalVariant(pokemonName: string | null): boolean {
  if (!pokemonName) return false;
  return pokemonName.includes("-alola") ||
         pokemonName.includes("-galar") ||
         pokemonName.includes("-hisui") ||
         pokemonName.includes("-paldea");
}

/**
 * Get regional variant info by name
 */
export function getRegionalVariantInfo(pokemonName: string): RegionalVariantInfo | null {
  return REGIONAL_VARIANTS.find(v => v.name === pokemonName) || null;
}

/**
 * Get all regional variants available in a generation
 */
export function getRegionalVariantsForGeneration(gen: number): RegionalVariantInfo[] {
  return REGIONAL_VARIANTS.filter(v => v.minGeneration <= gen);
}

/**
 * Z-Crystals mapped to their types for Z-Move selection
 */
export const Z_CRYSTALS: Record<string, string> = {
  // Type-based Z-Crystals
  "Normalium Z": "Normal",
  "Firium Z": "Fire",
  "Waterium Z": "Water",
  "Electrium Z": "Electric",
  "Grassium Z": "Grass",
  "Icium Z": "Ice",
  "Fightinium Z": "Fighting",
  "Poisonium Z": "Poison",
  "Groundium Z": "Ground",
  "Flyinium Z": "Flying",
  "Psychium Z": "Psychic",
  "Buginium Z": "Bug",
  "Rockium Z": "Rock",
  "Ghostium Z": "Ghost",
  "Dragonium Z": "Dragon",
  "Darkinium Z": "Dark",
  "Steelium Z": "Steel",
  "Fairium Z": "Fairy",
  // Signature Z-Crystals
  "Pikanium Z": "Electric",
  "Aloraichium Z": "Electric",
  "Pikashunium Z": "Electric",
  "Eevium Z": "Normal",
  "Snorlium Z": "Normal",
  "Mewnium Z": "Psychic",
  "Decidium Z": "Ghost",
  "Incinium Z": "Dark",
  "Primarium Z": "Water",
  "Tapunium Z": "Fairy",
  "Marshadium Z": "Ghost",
  "Kommonium Z": "Dragon",
  "Lycanium Z": "Rock",
  "Mimikium Z": "Fairy",
  "Solganium Z": "Steel",
  "Lunalium Z": "Ghost",
  "Ultranecrozium Z": "Psychic",
};

/**
 * Get all Z-Crystal names
 */
export function getZCrystals(): string[] {
  return Object.keys(Z_CRYSTALS);
}

/**
 * Check if an item is a Z-Crystal
 */
export function isZCrystal(item: string | null): boolean {
  if (!item) return false;
  return item in Z_CRYSTALS;
}

/**
 * Get the type associated with a Z-Crystal
 */
export function getZCrystalType(item: string): string | null {
  return Z_CRYSTALS[item] || null;
}

/**
 * All items organized by generation (from @smogon/calc data)
 * These are the items available in the damage calculator
 */
const ITEMS_BY_GEN: string[][] = [
  [], // Gen 0 placeholder
  [], // Gen 1 - no items
  // Gen 2 (GSC)
  [
    "Berry Juice", "Leftovers", "Light Ball", "Lucky Punch", "Metal Powder",
    "Thick Club", "Black Belt", "Black Glasses", "Bright Powder", "Charcoal",
    "Dragon Fang", "Hard Stone", "King's Rock", "Magnet", "Metal Coat",
    "Miracle Seed", "Mystic Water", "Never-Melt Ice", "Pink Bow", "Poison Barb",
    "Polkadot Bow", "Quick Claw", "Scope Lens", "Sharp Beak", "Silver Powder",
    "Soft Sand", "Spell Tag", "Twisted Spoon", "Focus Band",
  ],
  // Gen 3 (ADV) - adds Choice Band
  [
    "Choice Band", "Leftovers", "Shell Bell", "Lum Berry", "Sitrus Berry",
    "Liechi Berry", "Ganlon Berry", "Salac Berry", "Petaya Berry", "Apicot Berry",
    "Lansat Berry", "Starf Berry", "Chesto Berry", "White Herb", "Mental Herb",
  ],
  // Gen 4 (DPP) - adds Life Orb, Choice Specs/Scarf, etc.
  [
    "Choice Band", "Choice Scarf", "Choice Specs", "Life Orb", "Leftovers",
    "Expert Belt", "Focus Sash", "Flame Orb", "Toxic Orb", "Black Sludge",
    "Iron Ball", "Metronome", "Wide Lens", "Zoom Lens", "Muscle Band",
    "Wise Glasses", "Power Herb", "Light Clay", "Grip Claw", "Sticky Barb",
    "Lagging Tail", "Shed Shell", "Big Root", "Quick Powder", "Razor Claw",
    "Razor Fang", "Adamant Orb", "Lustrous Orb", "Griseous Orb",
    "Lum Berry", "Sitrus Berry", "Chesto Berry", "Yache Berry", "Occa Berry",
    "Passho Berry", "Wacan Berry", "Rindo Berry", "Shuca Berry", "Coba Berry",
    "Payapa Berry", "Tanga Berry", "Charti Berry", "Kasib Berry", "Haban Berry",
    "Colbur Berry", "Babiri Berry", "Chilan Berry", "Liechi Berry", "Ganlon Berry",
    "Salac Berry", "Petaya Berry", "Apicot Berry",
  ],
  // Gen 5 (BW) - adds Eviolite, Gems, etc.
  [
    "Choice Band", "Choice Scarf", "Choice Specs", "Life Orb", "Leftovers",
    "Eviolite", "Rocky Helmet", "Air Balloon", "Assault Vest", "Focus Sash",
    "Expert Belt", "Flame Orb", "Toxic Orb", "Black Sludge", "Red Card",
    "Eject Button", "Ring Target", "Absorb Bulb", "Cell Battery", "Flying Gem",
    "Lum Berry", "Sitrus Berry", "Chesto Berry",
  ],
  // Gen 6 (XY) - adds Assault Vest, Mega Stones, etc.
  [
    "Choice Band", "Choice Scarf", "Choice Specs", "Life Orb", "Leftovers",
    "Assault Vest", "Eviolite", "Rocky Helmet", "Air Balloon", "Focus Sash",
    "Expert Belt", "Weakness Policy", "Safety Goggles", "Flame Orb", "Toxic Orb",
    "Black Sludge", "Red Card", "Eject Button", "Roseli Berry", "Kee Berry",
    "Maranga Berry", "Lum Berry", "Sitrus Berry", "Chesto Berry",
    "Red Orb", "Blue Orb", // Primal orbs
    // Mega Stones (Gen 6 XY + ORAS)
    "Venusaurite", "Charizardite X", "Charizardite Y", "Blastoisinite",
    "Beedrillite", "Pidgeotite", "Alakazite", "Slowbronite", "Gengarite",
    "Kangaskhanite", "Pinsirite", "Gyaradosite", "Aerodactylite",
    "Mewtwonite X", "Mewtwonite Y", "Ampharosite", "Steelixite", "Scizorite",
    "Heracronite", "Houndoominite", "Tyranitarite", "Sceptilite", "Blazikenite",
    "Swampertite", "Gardevoirite", "Sablenite", "Mawilite", "Aggronite",
    "Medichamite", "Manectite", "Sharpedoite", "Cameruptite", "Altarianite",
    "Banettite", "Absolite", "Glalitite", "Salamencite", "Metagrossite",
    "Latiasite", "Latiosite", "Lopunnite", "Garchompite", "Lucarionite",
    "Abomasite", "Galladite", "Audinite", "Diancite",
  ],
  // Gen 7 (SM) - adds Z-Crystals, terrain seeds
  [
    "Choice Band", "Choice Scarf", "Choice Specs", "Life Orb", "Leftovers",
    "Assault Vest", "Eviolite", "Rocky Helmet", "Air Balloon", "Focus Sash",
    "Expert Belt", "Weakness Policy", "Safety Goggles", "Protective Pads",
    "Terrain Extender", "Electric Seed", "Grassy Seed", "Misty Seed", "Psychic Seed",
    "Flame Orb", "Toxic Orb", "Black Sludge", "Adrenaline Orb",
    "Lum Berry", "Sitrus Berry", "Chesto Berry",
    // Z-Crystals
    "Normalium Z", "Firium Z", "Waterium Z", "Electrium Z", "Grassium Z",
    "Icium Z", "Fightinium Z", "Poisonium Z", "Groundium Z", "Flyinium Z",
    "Psychium Z", "Buginium Z", "Rockium Z", "Ghostium Z", "Dragonium Z",
    "Darkinium Z", "Steelium Z", "Fairium Z",
    "Pikanium Z", "Aloraichium Z", "Pikashunium Z", "Eevium Z", "Snorlium Z",
    "Mewnium Z", "Decidium Z", "Incinium Z", "Primarium Z", "Tapunium Z",
    "Marshadium Z", "Kommonium Z", "Lycanium Z", "Mimikium Z", "Solganium Z",
    "Lunalium Z", "Ultranecrozium Z",
  ],
  // Gen 8 (SS) - adds Heavy-Duty Boots, etc.
  [
    "Choice Band", "Choice Scarf", "Choice Specs", "Life Orb", "Leftovers",
    "Assault Vest", "Eviolite", "Rocky Helmet", "Air Balloon", "Focus Sash",
    "Expert Belt", "Weakness Policy", "Safety Goggles", "Heavy-Duty Boots",
    "Room Service", "Eject Pack", "Blunder Policy", "Throat Spray",
    "Terrain Extender", "Electric Seed", "Grassy Seed", "Misty Seed", "Psychic Seed",
    "Flame Orb", "Toxic Orb", "Black Sludge",
    "Rusted Sword", "Rusted Shield",
    "Lum Berry", "Sitrus Berry", "Chesto Berry",
  ],
  // Gen 9 (SV) - adds Booster Energy, etc.
  [
    "Choice Band", "Choice Scarf", "Choice Specs", "Life Orb", "Leftovers",
    "Assault Vest", "Eviolite", "Rocky Helmet", "Air Balloon", "Focus Sash",
    "Expert Belt", "Weakness Policy", "Safety Goggles", "Heavy-Duty Boots",
    "Booster Energy", "Clear Amulet", "Covert Cloak", "Loaded Dice",
    "Mirror Herb", "Punching Glove", "Ability Shield",
    "Terrain Extender", "Electric Seed", "Grassy Seed", "Misty Seed", "Psychic Seed",
    "Flame Orb", "Toxic Orb", "Black Sludge",
    "Adamant Crystal", "Lustrous Globe", "Griseous Core",
    "Lum Berry", "Sitrus Berry", "Chesto Berry", "Fairy Feather",
  ],
];

/**
 * Common competitive items shown by default (before user starts typing)
 */
export const COMMON_COMPETITIVE_ITEMS = [
  "Choice Band",
  "Choice Specs",
  "Choice Scarf",
  "Life Orb",
  "Leftovers",
  "Heavy-Duty Boots",
  "Assault Vest",
  "Focus Sash",
  "Rocky Helmet",
  "Eviolite",
  "Black Sludge",
  "Flame Orb",
  "Toxic Orb",
  "Light Clay",
  "Expert Belt",
  "Weakness Policy",
  "Air Balloon",
  "Sitrus Berry",
  "Lum Berry",
  "Booster Energy",
];

/**
 * Get all items available for a generation
 */
export function getItemsForGeneration(gen: number): string[] {
  if (gen < 1 || gen > 9) return [];

  // Combine items from the current gen with commonly used items from that gen
  const genItems = new Set<string>();

  // Add items from the specified generation
  if (ITEMS_BY_GEN[gen]) {
    ITEMS_BY_GEN[gen].forEach(item => genItems.add(item));
  }

  // For earlier gens, also add items that existed in that gen
  // Most competitive items carry forward
  for (let g = 2; g <= gen; g++) {
    if (ITEMS_BY_GEN[g]) {
      ITEMS_BY_GEN[g].forEach(item => {
        // Don't add Z-Crystals to non-Gen 7
        if (item.endsWith(" Z") && gen !== 7) return;
        genItems.add(item);
      });
    }
  }

  return Array.from(genItems).sort();
}

/**
 * Get common items for display (before search)
 */
export function getCommonItemsForGeneration(gen: number): string[] {
  const allItems = getItemsForGeneration(gen);
  return COMMON_COMPETITIVE_ITEMS.filter(item => allItems.includes(item));
}
