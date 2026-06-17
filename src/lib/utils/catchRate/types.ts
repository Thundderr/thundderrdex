// Shared types for the catch-rate engine. Each generation strategy consumes a
// CatchRateInputs and returns a CatchRateResult. The engine is pure (no React,
// no network) so every generation's quirky math can be unit-tested in isolation.

export type CatchStatus =
  | "none"
  | "sleep"
  | "freeze"
  | "poison"
  | "burn"
  | "paralysis";

export type Gender = "male" | "female" | "genderless";

export interface CatchRateInputs {
  // --- Target species data (from PokeAPI) ---
  captureRate: number; // species base catch rate C (0-255)
  maxHp: number; // M — computed for the target's level
  currentHp: number; // H — derived from the HP% / "1 HP" control
  baseSpeed: number; // Fast Ball (Speed >= 100)
  weightKg: number; // Heavy Ball
  types: string[]; // Net Ball (water/bug)
  targetGender: Gender; // Love Ball
  isUltraBeast: boolean; // Beast Ball / UB penalty
  evolvesByMoonStone: boolean; // Moon Ball
  isGen2FastBallSpecies: boolean; // GSC Fast Ball quirk
  sameSpeciesAsYours: boolean; // Love Ball (same species)

  // --- Battle conditions ---
  ballId: string;
  status: CatchStatus;
  turnCount: number; // Timer / Quick
  targetLevel: number; // Nest / low-level / badge penalty / Level Ball
  inWater: boolean; // Dive / Lure
  nightOrCave: boolean; // Dusk
  alreadyCaught: boolean; // Repeat
  yourLevel: number; // Level Ball
  yourGender: Gender; // Love Ball

  // --- Advanced / meta-progression (gen-gated) ---
  capturePower: number; // Gen 9 D: 0-3 -> 1 / 1.1 / 1.25 / 2.0
  oPowerLevel: number; // Gen 5 Entralink, Gen 6 O-Power, Gen 7 Roto: 0-3
  caughtOffGuard: boolean; // Gen 9 D x2
  catchingCharm: boolean; // Gen 7+ critical capture x2
  badgeCount: number; // Gen 9 obedience penalty (0-8)
  hasEighthBadge: boolean; // Gen 8 difficulty
  dexCaughtBucket: number; // species caught -> crit-capture P (and Gen 5 dark grass)
  darkGrass: boolean; // Gen 5 G applies
}

export interface CatchRateResult {
  // Probability the Pokémon is caught with a single throw, [0, 1].
  catchChance: number;
  // Expected number of throws to catch (1 / catchChance), or Infinity.
  expectedBalls: number;
  // Critical-capture probability for this throw (Gen 5+), [0, 1].
  criticalChance: number;
  // True if this configuration always catches (Master/Park ball, X>=255, etc.).
  guaranteed: boolean;
  // Intermediate values for the collapsible "detailed report".
  detail: {
    modifiedCatchRate: number; // the "a" / "X" value
    shakeThreshold: number | null; // "Y" (null for Gen 1's non-shake algorithm)
    shakeChecks: number; // shakes per normal capture (0 for Gen 1)
    notes?: string[];
  };
}

// Generations the engine fully models. (All of 1-9 per the spec.)
export type SupportedGen = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
