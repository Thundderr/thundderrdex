import { NATURES, STAT_DISPLAY_NAMES, type Nature, type StatKey } from "@/data/natures";
import { pickN, shuffle } from "./random";
import { pickWeightedKey } from "./srs";
import {
  settingValue,
  type ModeSetting,
  type QuizContext,
  type QuizChoice,
  type QuizMode,
  type QuizQuestion,
  type ReviewSection,
} from "./types";

const KEY_PREFIX = "nature:";

function natureKey(name: string): string {
  return `${KEY_PREFIX}${name}`;
}

function isNeutral(n: Nature): boolean {
  return n.increasedStat === null && n.decreasedStat === null;
}

/** "+Atk, −SpA" style label describing a nature's stat changes. */
export function effectLabel(n: Nature): string {
  if (isNeutral(n)) return "No stat changes";
  const up = STAT_DISPLAY_NAMES[n.increasedStat as StatKey];
  const down = STAT_DISPLAY_NAMES[n.decreasedStat as StatKey];
  return `+${up}, −${down}`;
}

function review(n: Nature): ReviewSection[] {
  if (isNeutral(n)) {
    return [{ title: n.name, chips: [{ label: "No stat changes", tone: "neutral" }] }];
  }
  return [
    {
      title: n.name,
      chips: [
        { label: `+10% ${STAT_DISPLAY_NAMES[n.increasedStat as StatKey]}`, tone: "good" },
        { label: `−10% ${STAT_DISPLAY_NAMES[n.decreasedStat as StatKey]}`, tone: "bad" },
      ],
    },
  ];
}

const ALL_KEYS = NATURES.map((n) => natureKey(n.name));
const NON_NEUTRAL = NATURES.filter((n) => !isNeutral(n));

const SETTINGS: ModeSetting[] = [
  {
    key: "direction",
    label: "Direction",
    options: [
      { id: "both", label: "Mixed" },
      { id: "forward", label: "Name → effect" },
      { id: "reverse", label: "Effect → name" },
    ],
    default: "both",
  },
];

export const natureMode: QuizMode = {
  id: "nature",
  title: "Nature Recall",
  blurb: "Lock in which stat every nature raises and lowers.",
  needsSetPool: false,
  settings: SETTINGS,
  generate(ctx: QuizContext): QuizQuestion | null {
    const key = pickWeightedKey(ALL_KEYS, ctx.records, ctx.rng);
    if (!key) return null;
    const name = key.slice(KEY_PREFIX.length);
    const nature = NATURES.find((n) => n.name === name);
    if (!nature) return null;

    // Neutral natures have no unique up/down pair, so only the forward
    // ("what does it do?") direction is meaningful for them.
    const setting = settingValue(natureMode, ctx, "direction");
    const wantReverse = setting === "reverse" || (setting === "both" && ctx.rng() < 0.5);
    const reverse = wantReverse && !isNeutral(nature);

    if (reverse) {
      // "Which nature raises X and lowers Y?" → choose among nature names.
      const distractors = pickN(
        ctx.rng,
        NON_NEUTRAL.filter((n) => n.name !== nature.name),
        3
      );
      const choices: QuizChoice[] = shuffle(ctx.rng, [nature, ...distractors]).map((n) => ({
        id: n.name,
        label: n.name,
      }));
      return {
        modeId: "nature",
        srsKey: key,
        prompt: `Which nature is ${effectLabel(nature)}?`,
        choices,
        correctChoiceId: nature.name,
        explanation: `${nature.name} is ${effectLabel(nature)}.`,
        review: review(nature),
        explainLink: { kind: "nature-chart", label: "Open Nature Chart" },
      };
    }

    // Forward: "What does <nature> do?" → choose among distinct effect labels so
    // the neutral natures (all "No stat changes") can't produce duplicates.
    const correctLabel = effectLabel(nature);
    const distractorLabels = pickN(
      ctx.rng,
      [...new Set(NATURES.map(effectLabel))].filter((l) => l !== correctLabel),
      3
    );
    const choices: QuizChoice[] = shuffle(ctx.rng, [correctLabel, ...distractorLabels]).map((l) => ({
      id: l,
      label: l,
    }));
    return {
      modeId: "nature",
      srsKey: key,
      prompt: `What does the ${nature.name} nature do?`,
      choices,
      correctChoiceId: correctLabel,
      explanation: `${nature.name} is ${correctLabel}.`,
      review: review(nature),
      explainLink: { kind: "nature-chart", label: "Open Nature Chart" },
    };
  },
};
