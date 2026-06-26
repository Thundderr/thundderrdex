/**
 * Lightweight Leitner-style spaced repetition. Each *fact* (keyed by `srsKey`)
 * lives in a box 0..MAX_BOX; a correct answer promotes it, a wrong answer sends
 * it back to box 0. Question generation is biased toward unseen and low-box
 * facts so the Dojo trains weak spots instead of re-asking what you know.
 */

export const MAX_BOX = 5;

export interface SrsRecord {
  /** Leitner box, 0 (struggling / new-ish) .. MAX_BOX (mastered). */
  box: number;
  /** Total times this fact has been asked. */
  seen: number;
  /** Total correct answers. */
  correct: number;
  /** Result of the most recent attempt. */
  lastResult: boolean;
  /** Timestamp (ms) of the most recent attempt. */
  lastSeenAt: number;
}

export function emptyRecord(): SrsRecord {
  return { box: 0, seen: 0, correct: 0, lastResult: false, lastSeenAt: 0 };
}

/** Fold one answer into a record, returning a new record (never mutates). */
export function applyResult(
  rec: SrsRecord | undefined,
  correct: boolean,
  now: number
): SrsRecord {
  const base = rec ?? emptyRecord();
  return {
    box: correct ? Math.min(MAX_BOX, base.box + 1) : 0,
    seen: base.seen + 1,
    correct: base.correct + (correct ? 1 : 0),
    lastResult: correct,
    lastSeenAt: now,
  };
}

/**
 * Selection weight for a fact: unseen facts dominate, then low boxes, with a
 * floor so even mastered facts resurface occasionally. A freshly-missed fact
 * gets a bonus so it comes back soon.
 */
export function selectionWeight(rec: SrsRecord | undefined): number {
  if (!rec || rec.seen === 0) return MAX_BOX + 4; // unseen: strongly preferred
  const base = MAX_BOX - rec.box + 1; // 1 (mastered) .. MAX_BOX+1 (box 0)
  return base + (rec.lastResult ? 0 : 2);
}

/**
 * Weighted-random pick from a universe of fact keys, favouring weak/unseen ones.
 * `rng` returns [0, 1); inject a deterministic one in tests.
 */
export function pickWeightedKey(
  keys: string[],
  records: Record<string, SrsRecord>,
  rng: () => number
): string | null {
  if (keys.length === 0) return null;
  const weights = keys.map((k) => selectionWeight(records[k]));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return keys[Math.floor(rng() * keys.length)] ?? keys[0];
  let roll = rng() * total;
  for (let i = 0; i < keys.length; i++) {
    roll -= weights[i];
    if (roll < 0) return keys[i];
  }
  return keys[keys.length - 1];
}

export interface ModeStats {
  attempts: number;
  correct: number;
  bestStreak: number;
}

export function emptyModeStats(): ModeStats {
  return { attempts: 0, correct: 0, bestStreak: 0 };
}

export function accuracyPct(stats: ModeStats): number {
  return stats.attempts === 0 ? 0 : Math.round((stats.correct / stats.attempts) * 100);
}
