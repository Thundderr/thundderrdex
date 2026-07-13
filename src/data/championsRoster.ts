// Pokémon Champions eligibility roster — the ONLY Champions-specific dataset the
// app needs. Champions does not rebalance base stats or typings, so every other
// value (stats, types, moves) reuses the existing mainline (Gen 9) data. This
// file only answers "can this species/form be used in Champions at all."
//
// Source: Bulbapedia, "List of Pokémon in Pokémon Champions"
//   https://bulbapedia.bulbagarden.net/wiki/List_of_Pok%C3%A9mon_in_Pok%C3%A9mon_Champions
// Snapshot: 2026-07-13 (game data version 1.1.0). The roster only grows via
// updates, so a stale snapshot under-reports rather than showing wrong data.
// Counts at snapshot: 209 species, 13 distinct regional forms, 73 Mega Evolutions.

// National Dex ids whose (non-regional) form is usable in Champions.
const BASE_ELIGIBLE_IDS: readonly number[] = [
  3, 6, 9, 15, 18, 24, 25, 26, 36, 38, 45, 59, 65, 68, 71, 80, 94, 115, 121, 127, 128, 130,
  132, 134, 135, 136, 142, 143, 149, 154, 157, 160, 168, 181, 184, 186, 196, 197, 199, 205,
  208, 211, 212, 214, 227, 229, 248, 254, 257, 260, 279, 282, 302, 303, 306, 308, 310, 319,
  323, 324, 334, 350, 351, 354, 358, 359, 362, 376, 389, 392, 395, 398, 405, 407, 409, 411,
  428, 442, 445, 448, 450, 454, 460, 461, 464, 470, 471, 472, 473, 475, 478, 479, 497, 500,
  503, 505, 510, 512, 514, 516, 518, 530, 531, 534, 545, 547, 553, 560, 563, 569, 571, 579,
  584, 587, 604, 609, 614, 618, 623, 635, 637, 652, 655, 658, 660, 663, 666, 668, 670, 671,
  675, 676, 678, 681, 683, 685, 687, 689, 691, 693, 695, 697, 699, 700, 701, 702, 706, 707,
  709, 711, 713, 715, 724, 727, 730, 733, 740, 745, 748, 750, 752, 758, 763, 765, 766, 778,
  780, 784, 823, 841, 842, 844, 855, 858, 861, 866, 867, 869, 870, 877, 887, 899, 900, 902,
  903, 904, 908, 911, 914, 923, 925, 934, 936, 937, 939, 952, 956, 959, 964, 968, 970, 972,
  979, 981, 983, 1000, 1013, 1018, 1019,
];

// Form-aware keys ("<id>-<region>") for regional variants usable in Champions,
// matching the Pokédex catchKey scheme (e.g. "80-galar" = Galarian Slowbro).
const ELIGIBLE_FORM_KEYS: readonly string[] = [
  "26-alola", "38-alola", "59-hisui", "80-galar", "128-paldea", "157-hisui", "199-galar",
  "503-hisui", "571-hisui", "618-galar", "706-hisui", "713-hisui", "724-hisui",
];

// National Dex ids that have a Champions-usable Mega Evolution.
const MEGA_ELIGIBLE_IDS: readonly number[] = [
  3, 6, 9, 15, 18, 26, 36, 65, 71, 80, 94, 115, 121, 127, 130, 142, 149, 154, 160, 181, 208,
  212, 214, 227, 229, 248, 254, 257, 260, 282, 302, 303, 306, 308, 310, 319, 323, 334, 354,
  358, 359, 362, 376, 398, 428, 445, 448, 460, 475, 478, 500, 530, 531, 545, 560, 604, 609,
  623, 652, 655, 658, 668, 670, 678, 687, 689, 691, 701, 740, 780, 870, 952, 970,
];

const baseSet = new Set<number>(BASE_ELIGIBLE_IDS);
const formSet = new Set<string>(ELIGIBLE_FORM_KEYS);
const megaSet = new Set<number>(MEGA_ELIGIBLE_IDS);

/** Does this species appear in Champions at all (any form)? Keyed by National Dex id. */
export function isSpeciesInChampions(nationalId: number): boolean {
  return baseSet.has(nationalId);
}

/**
 * Is this specific Pokédex entry usable in Champions? `catchKey` is the
 * form-aware id: a bare National Dex id ("80") for a base form, or "<id>-<region>"
 * ("80-galar") for a regional variant.
 */
export function isFormInChampions(catchKey: string): boolean {
  const dash = catchKey.indexOf("-");
  if (dash === -1) {
    const id = Number(catchKey);
    return Number.isFinite(id) && baseSet.has(id);
  }
  return formSet.has(catchKey);
}

/** Does this species have a Champions-usable Mega Evolution? */
export function isMegaInChampions(nationalId: number): boolean {
  return megaSet.has(nationalId);
}

/** Total distinct species usable in Champions (for display). */
export const CHAMPIONS_SPECIES_COUNT = BASE_ELIGIBLE_IDS.length;
