import { pick, pickN, shuffle } from "./random";
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
import {
  settingValue,
  type ModeSetting,
  type QuizContext,
  type QuizMode,
  type QuizQuestion,
} from "./types";

const SETTINGS: ModeSetting[] = [
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
  blurb: "Predict OHKO/2HKO/3HKO from real sets — calc-in-your-head training.",
  needsSetPool: true,
  settings: SETTINGS,
  generate(ctx: QuizContext, pool?: SetPool): QuizQuestion | null {
    if (!pool || pool.length < 2) return null;
    const [atk, def] = pickN(ctx.rng, pool, 2) as [PoolEntry, PoolEntry];
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
      explanation: `${chosen.move} is a guaranteed ${chosen.ko.bucket}${
        chosen.ko.koText ? ` (${chosen.ko.koText})` : ""
      }.`,
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
