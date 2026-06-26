import { PokemonTypeName } from "@/types/pokemon";
import {
  getTypeChartForGeneration,
  TYPES_BY_GENERATION,
  ALL_TYPES,
  type TypeEffectiveness,
} from "@/data/typeChart";
import { pickWeightedKey } from "./srs";
import { settingValue, type ModeSetting, type QuizContext, type QuizMode, type QuizQuestion, type ReviewSection, type RichSegment } from "./types";

type GenChart = Record<PokemonTypeName, TypeEffectiveness>;
type DefenderKind = "mono" | "dual" | "both";

/** Effectiveness of one attacking type against one defending type. */
function singleMultiplier(chart: GenChart, atk: PokemonTypeName, def: PokemonTypeName): number {
  const a = chart[atk]?.attacking;
  if (!a) return 1;
  if (a.immune.includes(def)) return 0;
  if (a.superEffective.includes(def)) return 2;
  if (a.notVeryEffective.includes(def)) return 0.5;
  return 1;
}

/** Combined multiplier of an attacking type against a 1- or 2-type defender. */
export function typeMultiplier(
  chart: GenChart,
  atk: PokemonTypeName,
  defTypes: PokemonTypeName[]
): number {
  return defTypes.reduce((acc, d) => acc * singleMultiplier(chart, atk, d), 1);
}

/** Canonical SRS key for an attack/defence matchup (defence types sorted). */
export function typeEffKey(atk: PokemonTypeName, defTypes: PokemonTypeName[]): string {
  return `type-eff:${atk}|${[...defTypes].sort().join("-")}`;
}

function parseKey(key: string): { atk: PokemonTypeName; defTypes: PokemonTypeName[] } | null {
  const body = key.slice("type-eff:".length);
  const [atk, defs] = body.split("|");
  if (!atk || !defs) return null;
  return {
    atk: atk as PokemonTypeName,
    defTypes: defs.split("-") as PokemonTypeName[],
  };
}

/** Attack × defence matchups available in a generation, filtered by defender kind. */
function keyUniverse(generation: number, kind: DefenderKind): string[] {
  const types = TYPES_BY_GENERATION[generation] ?? ALL_TYPES;
  const keys: string[] = [];
  for (const atk of types) {
    for (let i = 0; i < types.length; i++) {
      if (kind !== "dual") keys.push(typeEffKey(atk, [types[i]]));
      if (kind !== "mono") {
        for (let j = i + 1; j < types.length; j++) {
          keys.push(typeEffKey(atk, [types[i], types[j]]));
        }
      }
    }
  }
  return keys;
}

// Universe is stable per (generation, kind); cache so we don't rebuild it per question.
const universeCache = new Map<string, string[]>();
function cachedUniverse(generation: number, kind: DefenderKind): string[] {
  const cacheKey = `${generation}:${kind}`;
  let u = universeCache.get(cacheKey);
  if (!u) {
    u = keyUniverse(generation, kind);
    universeCache.set(cacheKey, u);
  }
  return u;
}

// `short` labels the compact choice buttons (ordered left→right); `long` adds
// the neutral/no-effect hint for the headline explanation.
const SCALE: { value: number; short: string; long: string }[] = [
  { value: 0, short: "0×", long: "0× (no effect)" },
  { value: 0.25, short: "¼×", long: "¼×" },
  { value: 0.5, short: "½×", long: "½×" },
  { value: 1, short: "1×", long: "1× (neutral)" },
  { value: 2, short: "2×", long: "2×" },
  { value: 4, short: "4×", long: "4×" },
];

function cap(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function multLabel(value: number): string {
  return SCALE.find((s) => s.value === value)?.short ?? `${value}×`;
}

const SETTINGS: ModeSetting[] = [
  {
    key: "defender",
    label: "Defender",
    options: [
      { id: "both", label: "Mono + Dual" },
      { id: "mono", label: "Mono only" },
      { id: "dual", label: "Dual only" },
    ],
    default: "both",
  },
];

/** Post-answer review chips: the attack's coverage + each defender's resistances. */
function buildReview(
  chart: GenChart,
  atk: PokemonTypeName,
  defTypes: PokemonTypeName[]
): ReviewSection[] {
  const sections: ReviewSection[] = [];

  const atkInfo = chart[atk].attacking;
  sections.push({
    group: "attack",
    title: `${cap(atk)} is super effective against`,
    chips: atkInfo.superEffective.length
      ? atkInfo.superEffective.map((t) => ({ label: cap(t), type: t, tone: "good" as const }))
      : [{ label: "nothing — it's never super effective", tone: "neutral" as const }],
  });

  // Types the attack does nothing to (0×) — the opposite of super effective, so
  // they get their own section rather than polluting the list above.
  if (atkInfo.immune.length) {
    sections.push({
      group: "attack",
      title: `${cap(atk)} has no effect on`,
      chips: atkInfo.immune.map((t) => ({ label: cap(t), type: t, tone: "bad" as const })),
    });
  }

  for (const d of defTypes) {
    const def = chart[d].defending;
    const chips = [
      ...def.resistantTo.map((t) => ({ label: cap(t), type: t, tone: "neutral" as const })),
      ...def.immuneTo.map((t) => ({ label: `${cap(t)} (immune)`, type: t, tone: "good" as const })),
    ];
    sections.push({
      group: "defense",
      title: `${cap(d)} resists`,
      chips: chips.length ? chips : [{ label: "nothing", tone: "neutral" as const }],
    });
  }

  return sections;
}

export const typeEffMode: QuizMode = {
  id: "type-eff",
  title: "Type Effectiveness",
  blurb: "Read attacker-vs-defender matchups instantly — the #1 battle fundamental.",
  needsSetPool: false,
  settings: SETTINGS,
  generate(ctx: QuizContext): QuizQuestion | null {
    const chart = getTypeChartForGeneration(ctx.generation);
    const kind = settingValue(typeEffMode, ctx, "defender") as DefenderKind;
    const key = pickWeightedKey(cachedUniverse(ctx.generation, kind), ctx.records, ctx.rng);
    if (!key) return null;
    const parsed = parseKey(key);
    if (!parsed) return null;
    const { atk, defTypes } = parsed;

    const mult = typeMultiplier(chart, atk, defTypes);
    const correct = SCALE.find((s) => s.value === mult) ?? SCALE[3];
    const defLabel = defTypes.map(cap).join(" / ");

    // A single type can only ever be 0/½/1/2×; ¼× and 4× need a second type, so
    // drop those impossible options when the defender is mono-type.
    const scale = defTypes.length === 1
      ? SCALE.filter((s) => s.value !== 0.25 && s.value !== 4)
      : SCALE;

    // One plain line per defending type, so a dual matchup reads as two distinct
    // facts ("Ghost is 2× against Ghost." / "Ghost is 1× against Grass.") rather
    // than a combined "Ghost/Grass" statement. The rich variants colour the type
    // names with their type backgrounds.
    const explanation = defTypes
      .map((d) => `${cap(atk)} is ${multLabel(singleMultiplier(chart, atk, d))} against ${cap(d)}.`)
      .join("\n");
    const explanationLines: RichSegment[][] = defTypes.map((d) => [
      { type: atk },
      ` is ${multLabel(singleMultiplier(chart, atk, d))} against `,
      { type: d },
      ".",
    ]);

    // Coloured prompt: [Atk] → [Def1] / [Def2]
    const promptRich: RichSegment[] = [{ type: atk }, " → "];
    defTypes.forEach((d, i) => {
      if (i > 0) promptRich.push(" / ");
      promptRich.push({ type: d });
    });

    return {
      modeId: "type-eff",
      srsKey: key,
      prompt: `${cap(atk)} → ${defLabel}`,
      promptRich,
      choices: scale.map((s) => ({ id: String(s.value), label: s.short })),
      choiceLayout: "row",
      correctChoiceId: String(correct.value),
      explanation,
      explanationLines,
      review: buildReview(chart, atk, defTypes),
      explainLink: { kind: "type-chart", label: "Open Type Chart", attackingType: atk },
    };
  },
};
