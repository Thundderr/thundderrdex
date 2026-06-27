import { pick, pickN, pickWeightedPair, shuffle } from "./random";
import {
  buildPokemon,
  computeKo,
  getGen,
  moveName,
  toCalcSetup,
  KO_BUCKETS,
  type KoResult,
} from "./calcEngine";
import type { SmogonSet } from "@/hooks/useSmogonSets";
import type { PoolEntry, SetPool } from "./setPool";
import { usagePoolFromDataset } from "./usageBuilds";
import {
  settingValue,
  type ModeSetting,
  type QuizContext,
  type QuizMode,
  type QuizQuestion,
} from "./types";

const SETTINGS: ModeSetting[] = [
  {
    key: "scenario",
    label: "Matchups",
    options: [
      { id: "meta", label: "Meta-weighted" },
      { id: "random", label: "Random" },
    ],
    default: "meta",
  },
  {
    key: "move",
    label: "Move",
    options: [
      { id: "biggest", label: "Biggest threat" },
      { id: "random", label: "Random move" },
    ],
    default: "biggest",
  },
];

export const willItKoMode: QuizMode = {
  id: "will-it-ko",
  title: "Will It KO?",
  blurb: "Predict OHKO/2HKO/3HKO from real format builds — calc-in-your-head training.",
  needsSetPool: false,
  needsUsage: true,
  settings: SETTINGS,
  generate(ctx: QuizContext, poolArg?: SetPool): QuizQuestion | null {
    // Prefer the selected format's real meta builds (level 50); fall back to a
    // passed-in singles set pool (used by tests).
    const pool = ctx.usage ? usagePoolFromDataset(ctx.usage) : poolArg;
    if (!pool || pool.length < 2) return null;
    // Meta-weighted by default so the attacker/defender pairs reflect mons you
    // actually face; "Random" gives uniform pure-chance matchups.
    const metaWeighted = settingValue(willItKoMode, ctx, "scenario") !== "random" && !!ctx.usage;
    const [atk, def] = metaWeighted
      ? pickWeightedPair(ctx.rng, pool, pool.map((e) => e.usagePct ?? 1))
      : (pickN(ctx.rng, pool, 2) as [PoolEntry, PoolEntry]);
    if (!atk || !def) return null;

    const gen = getGen(ctx.generation);
    const atkSet = pick(ctx.rng, atk.sets) as SmogonSet;
    const defSet = pick(ctx.rng, def.sets) as SmogonSet;
    const attacker = buildPokemon(gen, atk.species, atkSet);
    const defender = buildPokemon(gen, def.species, defSet);
    if (!attacker || !defender) return null;

    // Evaluate every damaging move on the attacker's set.
    const damaging: { move: string; ko: KoResult }[] = [];
    for (const entry of atkSet.moves) {
      const name = moveName(entry);
      if (!name) continue;
      const ko = computeKo(gen, attacker, defender, name);
      if (ko) damaging.push({ move: name, ko });
    }
    if (damaging.length === 0) return null; // nothing connected — caller retries

    // Either the single biggest threat (the matchup-relevant question) or, when
    // toggled, a random damaging move for variety.
    const chosen =
      settingValue(willItKoMode, ctx, "move") === "random"
        ? pick(ctx.rng, damaging)
        : damaging.reduce((best, d) => (d.ko.maxPercent > best.ko.maxPercent ? d : best));

    const atkItem = atkSet.item ? ` @ ${atkSet.item}` : "";
    const breakdown = [
      `Damage: ${chosen.ko.minPercent.toFixed(1)}–${chosen.ko.maxPercent.toFixed(1)}% of HP`,
    ];
    if (chosen.ko.koText) breakdown.push(`KO chance: ${chosen.ko.koText}`);
    if (chosen.ko.fullDesc) breakdown.push(chosen.ko.fullDesc);

    return {
      modeId: "will-it-ko",
      srsKey: `ko:${atk.species}-${chosen.move}-vs-${def.species}`,
      prompt: `${atk.species}${atkItem} uses ${chosen.move} vs ${def.species}`,
      subPrompt: "What's the guaranteed result (worst-roll)?",
      choices: shuffle(
        ctx.rng,
        KO_BUCKETS.map((b) => ({ id: b, label: b }))
      ),
      correctChoiceId: chosen.ko.bucket,
      // Headline = the guaranteed (worst-roll) bucket; the exact KO chance and
      // roll-dependent nuance live in the breakdown ("KO chance: …").
      explanation: `${chosen.move} is a guaranteed ${chosen.ko.bucket} on ${def.species}.`,
      breakdown,
      explainLink: {
        kind: "damage-calc",
        label: "Open Calculator",
        attacker: toCalcSetup(atk.species, atkSet),
        defender: toCalcSetup(def.species, defSet),
        move: chosen.move,
      },
    };
  },
};
