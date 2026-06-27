/** Small rng-driven helpers, all taking an injectable `rng` for testability. */

export function randInt(rng: () => number, maxExclusive: number): number {
  return Math.floor(rng() * maxExclusive);
}

export function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[randInt(rng, arr.length)];
}

/** Fisher–Yates shuffle returning a new array. */
export function shuffle<T>(rng: () => number, arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Pick up to `n` distinct items at random. */
export function pickN<T>(rng: () => number, arr: readonly T[], n: number): T[] {
  return shuffle(rng, arr).slice(0, n);
}

/** Index of a weighted-random pick. Falls back to uniform if all weights ≤ 0. */
export function weightedIndex(rng: () => number, weights: readonly number[]): number {
  const total = weights.reduce((a, w) => a + (w > 0 ? w : 0), 0);
  if (total <= 0) return randInt(rng, weights.length);
  let roll = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i] > 0 ? weights[i] : 0;
    if (roll < 0) return i;
  }
  return weights.length - 1;
}

/** Weighted-random pick of a single item. */
export function pickWeighted<T>(rng: () => number, items: readonly T[], weights: readonly number[]): T {
  return items[weightedIndex(rng, weights)];
}

/** Two distinct items, each chosen weighted by `weights`. */
export function pickWeightedPair<T>(
  rng: () => number,
  items: readonly T[],
  weights: readonly number[]
): [T, T] {
  const i = weightedIndex(rng, weights);
  // Zero out the first pick so the second is distinct.
  const w2 = weights.map((w, k) => (k === i ? 0 : w));
  const j = weightedIndex(rng, w2);
  return [items[i], items[j]];
}
