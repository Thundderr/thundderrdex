// Poké Ball catalog, per-generation availability, and ball-effect resolution
// for Gens 3-9. (Gens 1 and 2 resolve balls inside their own strategies because
// their ball effects modify the capture rate differently.)

import { CatchRateInputs, SupportedGen } from "./types";

export interface BallDef {
  id: string;
  name: string;
  minGen: number;
}

// Display order roughly follows in-game bag ordering. minGen is the earliest
// generation the ball is selectable in (approximate for fringe cases).
export const BALLS: BallDef[] = [
  { id: "poke", name: "Poké Ball", minGen: 1 },
  { id: "great", name: "Great Ball", minGen: 1 },
  { id: "ultra", name: "Ultra Ball", minGen: 1 },
  { id: "master", name: "Master Ball", minGen: 1 },
  { id: "safari", name: "Safari Ball", minGen: 1 },
  { id: "fast", name: "Fast Ball", minGen: 2 },
  { id: "level", name: "Level Ball", minGen: 2 },
  { id: "lure", name: "Lure Ball", minGen: 2 },
  { id: "heavy", name: "Heavy Ball", minGen: 2 },
  { id: "love", name: "Love Ball", minGen: 2 },
  { id: "friend", name: "Friend Ball", minGen: 2 },
  { id: "moon", name: "Moon Ball", minGen: 2 },
  { id: "sport", name: "Sport Ball", minGen: 2 },
  { id: "net", name: "Net Ball", minGen: 3 },
  { id: "dive", name: "Dive Ball", minGen: 3 },
  { id: "nest", name: "Nest Ball", minGen: 3 },
  { id: "repeat", name: "Repeat Ball", minGen: 3 },
  { id: "timer", name: "Timer Ball", minGen: 3 },
  { id: "luxury", name: "Luxury Ball", minGen: 3 },
  { id: "premier", name: "Premier Ball", minGen: 3 },
  { id: "dusk", name: "Dusk Ball", minGen: 4 },
  { id: "quick", name: "Quick Ball", minGen: 4 },
  { id: "heal", name: "Heal Ball", minGen: 4 },
  { id: "cherish", name: "Cherish Ball", minGen: 4 },
  { id: "dream", name: "Dream Ball", minGen: 5 },
  { id: "beast", name: "Beast Ball", minGen: 7 },
];

export function ballsForGeneration(gen: number): BallDef[] {
  return BALLS.filter((b) => gen >= b.minGen);
}

export function getBall(id: string): BallDef | undefined {
  return BALLS.find((b) => b.id === id);
}

export interface BallEffect {
  autoCatch: boolean; // Master / Park — always catches
  ballBonus: number; // B
  captureRateMul: number; // multiply species C (apricorn balls), default 1
  captureRateAdd: number; // add to species C (Heavy Ball), default 0
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function levelBallBonus(yourLevel: number, targetLevel: number): number {
  if (yourLevel / 4 > targetLevel) return 8;
  if (yourLevel / 2 > targetLevel) return 4;
  if (yourLevel > targetLevel) return 2;
  return 1;
}

function timerBonus(gen: SupportedGen, turns: number): number {
  if (gen <= 4) return Math.min(4, (turns + 10) / 10);
  if (gen === 8) return Math.min(4, 1 + turns * 0.3);
  return Math.min(4, 1 + (turns * 1229) / 4096);
}

function nestBonus(gen: SupportedGen, level: number): number {
  if (gen <= 4) return Math.max(1, (40 - level) / 10);
  return level < 30 ? clamp((41 - level) / 10, 1, 4) : 1;
}

function heavyAdd(gen: SupportedGen, weightKg: number): number {
  if (gen <= 4) {
    if (weightKg >= 409.6) return 40;
    if (weightKg >= 307.2) return 30;
    if (weightKg >= 204.8) return 20;
    if (weightKg >= 102.4) return 0;
    return -20;
  }
  // Gen 7+
  if (weightKg >= 300) return 30;
  if (weightKg >= 200) return 20;
  if (weightKg >= 100) return 0;
  return -20;
}

function lureBonus(gen: SupportedGen): number {
  if (gen <= 4) return 3;
  if (gen <= 7) return 5;
  return 4;
}

const isWaterOrBug = (types: string[]) =>
  types.some((t) => t === "water" || t === "bug");

const oppositeGender = (a: string, b: string) =>
  (a === "male" && b === "female") || (a === "female" && b === "male");

// Resolve a ball's effect for Gens 3-9.
export function resolveBallGen3Plus(
  gen: SupportedGen,
  i: CatchRateInputs
): BallEffect {
  const base: BallEffect = {
    autoCatch: false,
    ballBonus: 1,
    captureRateMul: 1,
    captureRateAdd: 0,
  };

  // Master / Park always catch, even Ultra Beasts.
  if (i.ballId === "master" || i.ballId === "park") {
    return { ...base, autoCatch: true };
  }

  // Gen 7+ Ultra Beast penalty: every ball except the Beast Ball is crippled.
  if (gen >= 7 && i.isUltraBeast && i.ballId !== "beast") {
    return { ...base, ballBonus: 410 / 4096 };
  }

  switch (i.ballId) {
    case "great":
      return { ...base, ballBonus: 1.5 };
    case "ultra":
      return { ...base, ballBonus: 2 };
    case "safari":
    case "sport":
      return { ...base, ballBonus: 1.5 };
    case "net":
      return { ...base, ballBonus: isWaterOrBug(i.types) ? (gen <= 6 ? 3 : 3.5) : 1 };
    case "dive":
      return { ...base, ballBonus: i.inWater ? 3.5 : 1 };
    case "nest":
      return { ...base, ballBonus: nestBonus(gen, i.targetLevel) };
    case "repeat":
      return { ...base, ballBonus: i.alreadyCaught ? (gen <= 6 ? 3 : 3.5) : 1 };
    case "timer":
      return { ...base, ballBonus: timerBonus(gen, i.turnCount) };
    case "quick":
      return { ...base, ballBonus: i.turnCount <= 1 ? (gen >= 5 ? 5 : 4) : 1 };
    case "dusk":
      return { ...base, ballBonus: i.nightOrCave ? (gen <= 6 ? 3.5 : 3) : 1 };
    case "fast":
      return { ...base, ballBonus: i.baseSpeed >= 100 ? 4 : 1 };
    case "level":
      return { ...base, ballBonus: levelBallBonus(i.yourLevel, i.targetLevel) };
    case "love":
      return {
        ...base,
        ballBonus:
          i.sameSpeciesAsYours && oppositeGender(i.yourGender, i.targetGender)
            ? 8
            : 1,
      };
    case "lure":
      return { ...base, ballBonus: i.inWater ? lureBonus(gen) : 1 };
    case "moon":
      return { ...base, ballBonus: i.evolvesByMoonStone ? 4 : 1 };
    case "beast":
      return { ...base, ballBonus: gen >= 7 && i.isUltraBeast ? 5 : 410 / 4096 };
    case "dream":
      return { ...base, ballBonus: gen >= 8 && i.status === "sleep" ? 4 : 1 };
    case "heavy":
      return { ...base, captureRateAdd: heavyAdd(gen, i.weightKg) };
    // Poké, Premier, Luxury, Heal, Cherish, Friend — plain x1.
    default:
      return base;
  }
}
