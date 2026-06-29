/**
 * Registry of the competitive formats we target. Format-specific behaviour
 * (legality, Tera, which Smogon/Pikalytics/Limitless feed to hit) keys off this,
 * independent of the app's generation selector.
 *
 * Official Play! Pokémon competition moved off the mainline Scarlet/Violet game
 * to Pokémon Champions on 2026-04-08, so the legacy `vgc-regi` (S&V) format was
 * retired. The registry stays format-aware so future Champions regulations
 * (M-B, etc.) drop straight in.
 *
 * See docs/data-pathways.md for the full source map.
 */

export type CompetitiveFormatId = "champions-regma";

export interface CompetitiveFormat {
  id: CompetitiveFormatId;
  label: string;
  game: "champions";
  /** Smogon stats id, e.g. "gen9championsvgc2026regma". */
  smogonFormat: string;
  /** Best-of-3 ladder variant id. */
  smogonBo3Format: string;
  /** Pikalytics format code (matches Smogon's). */
  pikalyticsCode: string;
  /** Short `format` tags the Limitless API uses for this regulation. */
  limitlessFormatTags: string[];
  /** Whether Terastallization exists in this format (false for Champions). */
  hasTera: boolean;
  generation: number;
}

export const COMPETITIVE_FORMATS: Record<CompetitiveFormatId, CompetitiveFormat> = {
  "champions-regma": {
    id: "champions-regma",
    label: "Champions Reg M-A",
    game: "champions",
    smogonFormat: "gen9championsvgc2026regma",
    smogonBo3Format: "gen9championsvgc2026regmabo3",
    pikalyticsCode: "gen9championsvgc2026regma",
    limitlessFormatTags: ["M-A", "M-B"],
    hasTera: false,
    generation: 9,
  },
};

export const COMPETITIVE_FORMAT_LIST: CompetitiveFormat[] = Object.values(COMPETITIVE_FORMATS);

export function getCompetitiveFormat(id: CompetitiveFormatId): CompetitiveFormat {
  return COMPETITIVE_FORMATS[id];
}
