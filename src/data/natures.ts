export type StatKey = "attack" | "defense" | "specialAttack" | "specialDefense" | "speed";

export interface Nature {
  name: string;
  increasedStat: StatKey | null;  // +10%
  decreasedStat: StatKey | null;  // -10%
}

// All 25 Pokemon natures
// Neutral natures (5): Hardy, Docile, Serious, Bashful, Quirky - no stat changes
// Other natures (20): Each increases one stat by 10% and decreases another by 10%
export const NATURES: Nature[] = [
  // Neutral natures (no stat changes)
  { name: "Hardy", increasedStat: null, decreasedStat: null },
  { name: "Docile", increasedStat: null, decreasedStat: null },
  { name: "Serious", increasedStat: null, decreasedStat: null },
  { name: "Bashful", increasedStat: null, decreasedStat: null },
  { name: "Quirky", increasedStat: null, decreasedStat: null },

  // Attack increasing natures
  { name: "Lonely", increasedStat: "attack", decreasedStat: "defense" },
  { name: "Brave", increasedStat: "attack", decreasedStat: "speed" },
  { name: "Adamant", increasedStat: "attack", decreasedStat: "specialAttack" },
  { name: "Naughty", increasedStat: "attack", decreasedStat: "specialDefense" },

  // Defense increasing natures
  { name: "Bold", increasedStat: "defense", decreasedStat: "attack" },
  { name: "Relaxed", increasedStat: "defense", decreasedStat: "speed" },
  { name: "Impish", increasedStat: "defense", decreasedStat: "specialAttack" },
  { name: "Lax", increasedStat: "defense", decreasedStat: "specialDefense" },

  // Special Attack increasing natures
  { name: "Modest", increasedStat: "specialAttack", decreasedStat: "attack" },
  { name: "Mild", increasedStat: "specialAttack", decreasedStat: "defense" },
  { name: "Quiet", increasedStat: "specialAttack", decreasedStat: "speed" },
  { name: "Rash", increasedStat: "specialAttack", decreasedStat: "specialDefense" },

  // Special Defense increasing natures
  { name: "Calm", increasedStat: "specialDefense", decreasedStat: "attack" },
  { name: "Gentle", increasedStat: "specialDefense", decreasedStat: "defense" },
  { name: "Sassy", increasedStat: "specialDefense", decreasedStat: "speed" },
  { name: "Careful", increasedStat: "specialDefense", decreasedStat: "specialAttack" },

  // Speed increasing natures
  { name: "Timid", increasedStat: "speed", decreasedStat: "attack" },
  { name: "Hasty", increasedStat: "speed", decreasedStat: "defense" },
  { name: "Jolly", increasedStat: "speed", decreasedStat: "specialAttack" },
  { name: "Naive", increasedStat: "speed", decreasedStat: "specialDefense" },
];

// Helper to get nature modifier for a specific stat
export function getNatureModifier(nature: Nature, stat: StatKey): number {
  if (nature.increasedStat === stat) return 1.1;
  if (nature.decreasedStat === stat) return 0.9;
  return 1.0;
}

// Get nature by name
export function getNatureByName(name: string): Nature | undefined {
  return NATURES.find((n) => n.name.toLowerCase() === name.toLowerCase());
}

// Get stat display name for UI
export const STAT_DISPLAY_NAMES: Record<StatKey, string> = {
  attack: "Atk",
  defense: "Def",
  specialAttack: "SpA",
  specialDefense: "SpD",
  speed: "Spe",
};
