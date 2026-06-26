import { ModuleType } from "@/types/module";
import { PokemonTypeName } from "@/types/pokemon";
import type { SrsRecord } from "./srs";
import type { SetPool } from "./setPool";

/** Canonical id for each quiz mode in the Training Dojo. */
export type TrainingModeId = "type-eff" | "nature" | "speed" | "will-it-ko";

export interface QuizChoice {
  /** Stable identifier compared against the question's correct answer. */
  id: string;
  /** Display text shown on the answer button. */
  label: string;
}

/**
 * A run of question text that may embed coloured type tokens — a plain string,
 * or a `{ type }` token rendered as that type's coloured badge.
 */
export type RichSegment = string | { type: PokemonTypeName };

/** A small coloured pill used in the post-answer visual review. */
export interface ReviewChip {
  label: string;
  /** When set, the chip is coloured as that Pokémon type. */
  type?: PokemonTypeName;
  tone?: "good" | "bad" | "neutral";
}

/** A titled group of review chips (e.g. "Fire is super effective against"). */
export interface ReviewSection {
  title: string;
  chips: ReviewChip[];
  /** Lets the UI column attacking-side vs defending-side hints separately. */
  group?: "attack" | "defense";
}

/** A Pokémon build, enough to reconstruct it in the Damage Calculator. */
export interface CalcSetup {
  /** App-format (kebab-case) species name. */
  species: string;
  level: number;
  nature?: string;
  item?: string;
  ability?: string;
  evs?: Partial<Record<"hp" | "atk" | "def" | "spa" | "spd" | "spe", number>>;
  ivs?: Partial<Record<"hp" | "atk" | "def" | "spa" | "spd" | "spe", number>>;
}

/**
 * A deep-link the results screen offers, opening the real module behind a fact —
 * pre-filled where the target supports it (the Damage Calculator).
 */
export type ExplainLink =
  | { kind: "type-chart"; label: string; attackingType: PokemonTypeName }
  | { kind: "nature-chart"; label: string }
  | { kind: "damage-calc"; label: string; attacker: CalcSetup; defender: CalcSetup; move: string | null };

/**
 * A normalized question, identical in shape across every mode so the session
 * runner and SRS engine never need to know which mode produced it.
 */
export interface QuizQuestion {
  modeId: TrainingModeId;
  /** Identifies the underlying *fact* (not the rendered question) for SRS. */
  srsKey: string;
  prompt: string;
  /** Optional rich (type-coloured) rendering of the prompt; falls back to `prompt`. */
  promptRich?: RichSegment[];
  /** Optional secondary line of context under the prompt. */
  subPrompt?: string;
  choices: QuizChoice[];
  /** "row" lays choices out left-to-right (e.g. an ordered multiplier scale). */
  choiceLayout?: "grid" | "row";
  correctChoiceId: string;
  /** One-line headline shown after answering. */
  explanation: string;
  /** Optional rich (type-coloured) explanation, one entry per line; falls back to `explanation`. */
  explanationLines?: RichSegment[][];
  /** Monospace detail lines (damage rolls, speed math, type interactions). */
  breakdown?: string[];
  /** Visual chip review — the "build neural pathways" reinforcement. */
  review?: ReviewSection[];
  explainLink?: ExplainLink;
}

/** A user-toggleable practice setting a mode exposes (e.g. mono/dual/both). */
export interface ModeSetting {
  key: string;
  label: string;
  options: { id: string; label: string }[];
  default: string;
}

/** Everything a generator needs that isn't the (optional, async) set pool. */
export interface QuizContext {
  generation: number;
  /** Current SRS state, used to bias generation toward weak/unseen facts. */
  records: Record<string, SrsRecord>;
  /** Injectable randomness so generation is deterministic under test. */
  rng: () => number;
  /** Selected option id per setting key; modes fall back to their defaults. */
  settings?: Record<string, string>;
}

/**
 * One quiz mode. The engine drives any mode through this single interface, so
 * adding a fifth mode means implementing this — not touching the runner.
 */
export interface QuizMode {
  id: TrainingModeId;
  title: string;
  blurb: string;
  /** True when the mode needs the async Smogon set pool before it can run. */
  needsSetPool: boolean;
  /** Practice toggles surfaced in the session header. */
  settings?: ModeSetting[];
  /**
   * Produce one question. Returns null when it can't build a sensible one
   * (e.g. no damaging move in a sampled set) — the caller retries.
   */
  generate(ctx: QuizContext, pool?: SetPool): QuizQuestion | null;
}

/** Read a setting's selected value, falling back to its declared default. */
export function settingValue(mode: QuizMode, ctx: QuizContext, key: string): string {
  const def = mode.settings?.find((s) => s.key === key);
  return ctx.settings?.[key] ?? def?.default ?? "";
}
