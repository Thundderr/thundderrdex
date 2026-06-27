import { pick, pickN, pickWeightedPair } from "./random";
import { buildPokemon, getGen, speedBreakdown, toCalcSetup, type SpeedBreakdown } from "./calcEngine";
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

const SPEED_TIE = "__tie__";

interface SpeedMod {
  label: string;
  factor: number;
}

const NO_MOD: SpeedMod = { label: "", factor: 1 };
// Scenario modifiers add the most decision-relevant speed swings.
const MODS: SpeedMod[] = [
  { label: "Choice Scarf", factor: 1.5 },
  { label: "Tailwind", factor: 2 },
  { label: "Paralysis", factor: 0.5 },
];

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
    key: "modifiers",
    label: "Modifiers",
    options: [
      { id: "on", label: "Scarf / Tailwind / Para" },
      { id: "off", label: "Raw speed only" },
    ],
    default: "on",
  },
];

function line(name: string, b: SpeedBreakdown, mod: SpeedMod): string {
  const evText = `${b.ev} EVs`;
  const ivText = b.iv !== 31 ? `, ${b.iv} IVs` : "";
  const base = `${name}: ${b.base} base, ${evText}${ivText}, ${b.nature} (${b.natureEffect}) = ${b.final}`;
  if (mod.factor === 1) return base;
  return `${base}  ×${mod.factor} ${mod.label} → ${Math.floor(b.final * mod.factor)}`;
}

export const speedMode: QuizMode = {
  id: "speed",
  title: "Speed Tiers",
  blurb: "Call who moves first from real format builds — the turn's most important read.",
  needsSetPool: false,
  needsUsage: true,
  settings: SETTINGS,
  generate(ctx: QuizContext, poolArg?: SetPool): QuizQuestion | null {
    // Prefer the selected format's real meta builds (level 50); fall back to a
    // passed-in singles set pool (used by tests).
    const pool = ctx.usage ? usagePoolFromDataset(ctx.usage) : poolArg;
    if (!pool || pool.length < 2) return null;
    // Meta-weighted by default: common mons face off proportionally to how often
    // you'd actually see them. "Random" gives uniform pure-chance matchups.
    const metaWeighted = settingValue(speedMode, ctx, "scenario") !== "random" && !!ctx.usage;
    const [a, b] = metaWeighted
      ? pickWeightedPair(ctx.rng, pool, pool.map((e) => e.usagePct ?? 1))
      : (pickN(ctx.rng, pool, 2) as [PoolEntry, PoolEntry]);
    if (!a || !b) return null;

    const setA = pick(ctx.rng, a.sets) as SmogonSet;
    const setB = pick(ctx.rng, b.sets) as SmogonSet;
    const gen = getGen(ctx.generation);
    const pa = buildPokemon(gen, a.species, setA);
    const pb = buildPokemon(gen, b.species, setB);
    if (!pa || !pb) return null;

    const brA = speedBreakdown(pa, setA);
    const brB = speedBreakdown(pb, setB);
    if (!brA.final || !brB.final) return null;

    // Optionally give one side a labelled modifier so the answer isn't just
    // "compare two base numbers".
    let modA = NO_MOD;
    let modB = NO_MOD;
    if (settingValue(speedMode, ctx, "modifiers") === "on" && ctx.rng() < 0.55) {
      const mod = pick(ctx.rng, MODS);
      if (ctx.rng() < 0.5) modA = mod;
      else modB = mod;
    }

    const effA = Math.floor(brA.final * modA.factor);
    const effB = Math.floor(brB.final * modB.factor);

    let correctId: string;
    if (effA > effB) correctId = a.species;
    else if (effB > effA) correctId = b.species;
    else correctId = SPEED_TIE;

    const modSummary = (name: string, mod: SpeedMod) => (mod.factor === 1 ? name : `${name} + ${mod.label}`);

    return {
      modeId: "speed",
      srsKey: `speed:${[a.species, b.species].sort().join("-vs-")}`,
      prompt: "Who moves first?",
      subPrompt: `${modSummary(a.species, modA)}  vs  ${modSummary(b.species, modB)}`,
      // Left Pokémon, Speed tie in the middle, right Pokémon.
      choices: [
        { id: a.species, label: a.species },
        { id: SPEED_TIE, label: "Speed tie" },
        { id: b.species, label: b.species },
      ],
      choiceLayout: "row",
      correctChoiceId: correctId,
      explanation:
        correctId === SPEED_TIE
          ? `Speed tie — both reach ${effA} effective Speed.`
          : `${correctId} is faster (${Math.max(effA, effB)} vs ${Math.min(effA, effB)} effective Speed).`,
      breakdown: [line(a.species, brA, modA), line(b.species, brB, modB)],
      explainLink: {
        kind: "damage-calc",
        label: "Open Calculator",
        attacker: toCalcSetup(a.species, setA),
        defender: toCalcSetup(b.species, setB),
        move: null,
      },
    };
  },
};
