/**
 * Registry of the competitive formats we target. Format-specific behaviour
 * (legality, Tera, which Smogon/Pikalytics/Limitless feed to hit) keys off this,
 * independent of the app's generation selector.
 *
 * See docs/data-pathways.md for the full source map.
 */

export type CompetitiveFormatId = "vgc-regi" | "champions-regma";

export interface CompetitiveFormat {
  id: CompetitiveFormatId;
  label: string;
  game: "sv" | "champions";
  /** Smogon stats id, e.g. "gen9vgc2026regi". */
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
  "vgc-regi": {
    id: "vgc-regi",
    label: "VGC Reg I",
    game: "sv",
    smogonFormat: "gen9vgc2026regi",
    smogonBo3Format: "gen9vgc2026regibo3",
    pikalyticsCode: "gen9vgc2026regi",
    limitlessFormatTags: ["I"],
    hasTera: true,
    generation: 9,
  },
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
