// Small hardcoded lookups the catch-rate engine needs but PokeAPI doesn't
// expose conveniently. Hardcoding is more reliable than walking evolution
// chains / scraping flavor data at runtime.

// Ultra Beasts (Gen 7+). Used by Beast Ball (x5) and the non-Beast-Ball
// penalty (410/4096). Keyed by PokeAPI species slug.
export const ULTRA_BEASTS = new Set<string>([
  "nihilego",
  "buzzwole",
  "pheromosa",
  "xurkitree",
  "celesteela",
  "kartana",
  "guzzlord",
  "poipole",
  "naganadel",
  "stakataka",
  "blacephalon",
]);

// Species that evolve via Moon Stone — Moon Ball target condition (x4).
// The base-stage species you'd actually throw a ball at are what matter.
export const MOON_STONE_EVOLVERS = new Set<string>([
  "nidoran-f",
  "nidorina",
  "nidoran-m",
  "nidorino",
  "clefairy",
  "jigglypuff",
  "skitty",
  "munna",
]);

// GSC Fast Ball only works (x4) on these families due to a famous bug:
// it checks species flagged as "flees", which ended up being only these three
// lines (Magnemite, Grimer, Tangela). Gen 4+ Fast Ball uses base Speed >= 100.
export const GEN2_FAST_BALL_SPECIES = new Set<string>([
  "magnemite",
  "magneton",
  "grimer",
  "muk",
  "tangela",
]);

export function isUltraBeastSpecies(slug: string): boolean {
  return ULTRA_BEASTS.has(slug);
}

export function evolvesByMoonStone(slug: string): boolean {
  return MOON_STONE_EVOLVERS.has(slug);
}

export function isGen2FastBallSpecies(slug: string): boolean {
  return GEN2_FAST_BALL_SPECIES.has(slug);
}
