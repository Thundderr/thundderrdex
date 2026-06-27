import { pickN, shuffle } from "./random";
import { pickWeightedKey } from "./srs";
import { itemDisplayName, moveDisplayName } from "@/lib/competitive/dexNames";
import type { SlimUsageEntry, UsageDataset } from "@/lib/competitive/types";
import {
  settingValue,
  type ModeSetting,
  type QuizContext,
  type QuizChoice,
  type QuizMode,
  type QuizQuestion,
} from "./types";

type Facet = "item" | "move";

// Restrict questions to the most-used mons so we're training the live meta.
const TOP_N = 60;

const FACET = {
  item: { verb: "hold", noun: "item", display: itemDisplayName, list: (e: SlimUsageEntry) => e.items },
  move: { verb: "run", noun: "move", display: moveDisplayName, list: (e: SlimUsageEntry) => e.moves },
} as const;

const SETTINGS: ModeSetting[] = [
  {
    key: "facet",
    label: "Ask about",
    options: [
      { id: "item", label: "Items" },
      { id: "move", label: "Moves" },
      { id: "both", label: "Both" },
    ],
    default: "item",
  },
];

function resolveFacet(ctx: QuizContext, rng: () => number): Facet {
  const setting = settingValue(metaBuildMode, ctx, "facet");
  if (setting === "item" || setting === "move") return setting;
  return rng() < 0.5 ? "item" : "move";
}

/** Unique option ids for a facet across the whole format (distractor pool). */
function facetPool(dataset: UsageDataset, facet: Facet): string[] {
  const set = new Set<string>();
  for (const e of dataset.entries) for (const o of FACET[facet].list(e)) set.add(o.name);
  return [...set];
}

export const metaBuildMode: QuizMode = {
  id: "meta-build",
  title: "Meta Builds",
  blurb: "Know what real teams run — the common items and moves on top threats.",
  needsSetPool: false,
  needsUsage: true,
  settings: SETTINGS,
  generate(ctx: QuizContext): QuizQuestion | null {
    const dataset = ctx.usage;
    if (!dataset || dataset.entries.length === 0) return null;

    const facet = resolveFacet(ctx, ctx.rng);
    const cfg = FACET[facet];

    // Candidate mons: top-N by usage that actually have a clear top option.
    const candidates = dataset.entries.slice(0, TOP_N).filter((e) => cfg.list(e).length > 0);
    if (candidates.length === 0) return null;

    const bySpecies = new Map(candidates.map((e) => [e.species, e]));
    const keyFor = (sp: string) => `meta:${dataset.smogonFormat}:${facet}:${sp}`;
    const key = pickWeightedKey(candidates.map((e) => keyFor(e.species)), ctx.records, ctx.rng);
    if (!key) return null;
    const species = key.split(":").pop()!;
    const entry = bySpecies.get(species);
    if (!entry) return null;

    const top = cfg.list(entry)[0];
    const correctId = top.name;

    // Distractors: other real options in the format the mon does NOT run.
    const onMon = new Set(cfg.list(entry).map((o) => o.name));
    const pool = facetPool(dataset, facet).filter((id) => !onMon.has(id));
    const distractors = pickN(ctx.rng, pool, 3);
    if (distractors.length < 3) return null; // not enough variety (tiny format)

    const choices: QuizChoice[] = shuffle(ctx.rng, [correctId, ...distractors]).map((id) => ({
      id,
      label: cfg.display(id),
    }));

    return {
      modeId: "meta-build",
      srsKey: key,
      prompt: `Which ${cfg.noun} does ${entry.name} most commonly ${cfg.verb}?`,
      subPrompt: `${entry.usagePct.toFixed(1)}% usage in ${dataset.smogonFormat}`,
      choices,
      correctChoiceId: correctId,
      explanation: `${entry.name} ${cfg.verb}s ${cfg.display(correctId)} ${top.pct.toFixed(1)}% of the time.`,
      breakdown: cfg
        .list(entry)
        .slice(0, 4)
        .map((o) => `${cfg.display(o.name)}: ${o.pct.toFixed(1)}%`),
    };
  },
};
