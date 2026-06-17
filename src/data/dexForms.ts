/**
 * Per-dex regional-form resolution.
 *
 * PokeAPI's /pokedex/{id} endpoint lists each entry by its base `pokemon_species`
 * only (always "slowpoke" #79, never "slowpoke-galar"). It carries no information
 * about which FORM a given game's dex actually shows. So the regular Slowpoke in
 * the Paldea dex and the Galarian Slowpoke in the Blueberry dex arrive from
 * PokeAPI as the identical species #79 — indistinguishable without the data below.
 *
 * This module bridges that gap: given a dex and a national id, it resolves which
 * regional variant (if any) that dex's entry represents, pulling the display
 * name, sprite form id, and region from the existing REGIONAL_VARIANTS table.
 *
 * Two mechanisms:
 *  - DEX_FORM_REGION: "native" dexes that show exactly one region's forms (every
 *    Alola dex shows Alolan forms, Galar shows Galarian, etc.). Derived against
 *    REGIONAL_VARIANTS, so adding a variant there is automatically picked up.
 *  - DEX_FORM_OVERRIDES: "cross-region" dexes that import forms from multiple
 *    regions (Blueberry/Indigo Disk, Lumiose City/Legends Z-A, Hyperspace/Mega
 *    Dimension). These can't be derived from a single region and are listed
 *    explicitly per national id.
 *
 * Dexes absent from both maps (Kanto, Johto, Hoenn, Sinnoh, Unova, Kalos,
 * Let's Go Kanto, and Kitakami) show base forms only and need no entry.
 *
 * Form rosters verified June 2026 against Bulbapedia, Serebii, and live PokeAPI.
 */

import { REGIONAL_VARIANTS, RegionalVariantInfo } from "@/lib/utils/generationConfig";
import { getRegionalDexById } from "@/data/pokedexes";

export type FormRegion = RegionalVariantInfo["region"]; // "alola" | "galar" | "hisui" | "paldea"

export interface ResolvedForm {
  variantName: string; // PokeAPI slug, e.g. "slowpoke-galar"
  displayName: string; // e.g. "Galarian Slowpoke"
  formId: number; // PokeAPI form id, for sprite lookup
  region: FormRegion; // used as the catch-key suffix, e.g. "79-galar"
}

// --- Indexes over REGIONAL_VARIANTS (built once) -----------------------------

// region+species -> variant. First match wins, so multi-form species (Paldean
// Tauros has three breeds at #128) resolve to the first listed (Combat breed),
// the representative for the single per-dex slot the tracker exposes.
const byRegionSpecies = new Map<string, RegionalVariantInfo>();
// slug -> variant, for override lookups.
const bySlug = new Map<string, RegionalVariantInfo>();
for (const v of REGIONAL_VARIANTS) {
  const key = `${v.region}:${v.baseSpeciesId}`;
  if (!byRegionSpecies.has(key)) byRegionSpecies.set(key, v);
  bySlug.set(v.name, v);
}

// --- Native dexes: one region of forms each ----------------------------------

const DEX_FORM_REGION: Record<string, FormRegion> = {
  // Alola — every island/regional dex (SM + USUM) shows Alolan forms.
  "original-alola": "alola",
  "original-melemele": "alola",
  "original-akala": "alola",
  "original-ulaula": "alola",
  "original-poni": "alola",
  "updated-alola": "alola",
  "updated-melemele": "alola",
  "updated-akala": "alola",
  "updated-ulaula": "alola",
  "updated-poni": "alola",
  // Galar — base + both DLC dexes show Galarian forms.
  galar: "galar",
  "isle-of-armor": "galar",
  "crown-tundra": "galar",
  // Hisui — Legends: Arceus shows Hisuian forms.
  hisui: "hisui",
  // Paldea — Scarlet/Violet base dex shows Paldean forms (Wooper, Tauros).
  // NOTE: Kitakami (Teal Mask) is intentionally NOT here — it is Johto-flavored
  // and shows base forms (e.g. base Wooper), despite sharing the Paldea group.
  paldea: "paldea",
};

// --- Cross-region dexes: explicit national-id -> variant slug -----------------

const DEX_FORM_OVERRIDES: Record<string, Record<number, string>> = {
  // Blueberry / Indigo Disk — imports Alolan, Galarian, Hisuian forms + Paldean Tauros.
  blueberry: {
    27: "sandshrew-alola",
    28: "sandslash-alola",
    37: "vulpix-alola",
    38: "ninetales-alola",
    50: "diglett-alola",
    51: "dugtrio-alola",
    74: "geodude-alola",
    75: "graveler-alola",
    76: "golem-alola",
    88: "grimer-alola",
    89: "muk-alola",
    103: "exeggutor-alola",
    79: "slowpoke-galar",
    80: "slowbro-galar",
    199: "slowking-galar",
    211: "qwilfish-hisui",
    128: "tauros-paldea-combat-breed", // representative of the 3 Paldean breeds
  },
  // Lumiose City / Legends Z-A.
  "lumiose-city": {
    26: "raichu-alola",
    79: "slowpoke-galar",
    80: "slowbro-galar",
    199: "slowking-galar",
    618: "stunfisk-galar",
    705: "sliggoo-hisui",
    706: "goodra-hisui",
    713: "avalugg-hisui",
  },
  // Hyperspace / Mega Dimension DLC.
  hyperspace: {
    52: "meowth-galar", // dex shows BOTH Alolan & Galarian Meowth; Galarian is the representative
    53: "persian-alola",
    83: "farfetchd-galar",
    105: "marowak-alola",
    211: "qwilfish-hisui",
    562: "yamask-galar",
    122: "mr-mime-galar",
  },
};

/**
 * Resolve the regional variant a dex's entry represents, or null if the entry is
 * the base form. Overrides take precedence over the native region rule.
 */
export function resolveDexForm(dexId: number, nationalId: number): ResolvedForm | null {
  const dex = getRegionalDexById(dexId);
  if (!dex) return null;

  let variant: RegionalVariantInfo | undefined;

  const override = DEX_FORM_OVERRIDES[dex.name]?.[nationalId];
  if (override) {
    variant = bySlug.get(override);
  } else {
    const region = DEX_FORM_REGION[dex.name];
    if (region) variant = byRegionSpecies.get(`${region}:${nationalId}`);
  }

  if (!variant) return null;
  return {
    variantName: variant.name,
    displayName: variant.displayName,
    formId: variant.formId,
    region: variant.region,
  };
}
