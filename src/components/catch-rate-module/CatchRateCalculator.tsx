"use client";

import { useMemo } from "react";
import { useGenerationStore } from "@/stores/generationStore";
import { useModuleStore } from "@/stores/moduleStore";
import { useCatchRateData } from "@/hooks/useCatchRateData";
import { SearchBar } from "@/components/pokemon-module/SearchBar";
import { QueryState } from "@/components/ui";
import { formatPokemonName } from "@/lib/pokeapi/transformers";
import { CatchRateModule, CatchRateStatus } from "@/types/module";
import {
  calculateCatchRate,
  ballsForGeneration,
  estimateMaxHp,
  resolveCurrentHp,
  CatchRateInputs,
  SupportedGen,
} from "@/lib/utils/catchRate";

const STATUS_OPTIONS: { value: CatchRateStatus; label: string }[] = [
  { value: "none", label: "None" },
  { value: "sleep", label: "Asleep" },
  { value: "freeze", label: "Frozen" },
  { value: "poison", label: "Poisoned" },
  { value: "burn", label: "Burned" },
  { value: "paralysis", label: "Paralyzed" },
];

// Which conditional control a ball needs shown.
const BALL_NEEDS = {
  turn: new Set(["timer", "quick"]),
  water: new Set(["dive", "lure"]),
  night: new Set(["dusk"]),
  caught: new Set(["repeat"]),
  yourLevel: new Set(["level"]),
  love: new Set(["love"]),
};

export function CatchRateCalculator({ module }: { module: CatchRateModule }) {
  const { globalGeneration } = useGenerationStore();
  const gen = globalGeneration as SupportedGen;
  const { setCatchRateInput } = useModuleStore();
  const { data, isLoading, isError, refetch } = useCatchRateData(module.pokemonName);

  const set = (updates: Partial<CatchRateModule>) => setCatchRateInput(module.id, updates);

  const balls = useMemo(() => ballsForGeneration(gen), [gen]);
  const ballId = balls.some((b) => b.id === module.ballId) ? module.ballId : "poke";

  const result = useMemo(() => {
    if (!data) return null;
    const maxHp = estimateMaxHp(data.baseHp, module.targetLevel, gen);
    const currentHp = resolveCurrentHp(maxHp, module.hpPercent, module.exactlyOneHp);
    const inputs: CatchRateInputs = {
      captureRate: data.captureRate,
      maxHp,
      currentHp,
      baseSpeed: data.baseSpeed,
      weightKg: data.weightKg,
      types: data.types,
      // Love Ball: when matched, your lead is opposite gender to the target.
      targetGender: module.loveBallMatch ? "female" : "male",
      yourGender: "male",
      sameSpeciesAsYours: module.loveBallMatch,
      isUltraBeast: data.isUltraBeast,
      evolvesByMoonStone: data.evolvesByMoonStone,
      isGen2FastBallSpecies: data.isGen2FastBallSpecies,
      ballId,
      status: module.status,
      turnCount: module.turnCount,
      targetLevel: module.targetLevel,
      inWater: module.inWater,
      nightOrCave: module.nightOrCave,
      alreadyCaught: module.alreadyCaught,
      yourLevel: module.yourLevel,
      capturePower: module.capturePower,
      oPowerLevel: module.oPowerLevel,
      caughtOffGuard: module.caughtOffGuard,
      catchingCharm: module.catchingCharm,
      badgeCount: module.badgeCount,
      hasEighthBadge: module.hasEighthBadge,
      dexCaughtBucket: module.dexCaughtBucket,
      darkGrass: module.darkGrass,
    };
    return calculateCatchRate(gen, inputs);
  }, [data, gen, ballId, module]);

  const pct = result ? (result.catchChance * 100).toFixed(1) : null;
  const expected =
    result && result.catchChance > 0 ? result.expectedBalls.toFixed(1) : "—";

  return (
    <div className="flex flex-col gap-3 text-sm">
      {/* Pokémon picker */}
      <SearchBar
        onSelect={(name) => set({ pokemonName: name })}
        currentPokemon={module.pokemonName ? formatPokemonName(module.pokemonName) : null}
      />

      {!module.pokemonName ? (
        <p className="text-slate-500 text-xs py-4 text-center">
          Search for a Pokémon to calculate its catch rate in Gen {gen}.
        </p>
      ) : isLoading || isError || !data ? (
        // Previously a fetch error left this spinning forever; now it shows an
        // error with a retry instead.
        <QueryState
          isLoading={isLoading}
          isError={isError || !data}
          onRetry={() => refetch()}
          loadingLabel="Loading catch data…"
          compact
        >
          {null}
        </QueryState>
      ) : (
        <>
          {/* Result */}
          <div className="rounded-lg bg-slate-800 border border-slate-700 p-3 text-center">
            <div className="text-3xl font-bold text-red-400">
              {result?.guaranteed ? "100%" : `${pct}%`}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              catch chance per throw · ~{expected} ball{expected === "1.0" ? "" : "s"} avg
            </div>
            {result && result.criticalChance > 0 && (
              <div className="text-[11px] text-amber-400 mt-1">
                Critical capture: {(result.criticalChance * 100).toFixed(1)}%
              </div>
            )}
          </div>

          {/* Core inputs */}
          <div className="grid grid-cols-1 @md:grid-cols-2 gap-2">
            <Field label="Poké Ball">
              <Select value={ballId} onChange={(v) => set({ ballId: v })}>
                {balls.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={module.status} onChange={(v) => set({ status: v as CatchRateStatus })}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {/* HP */}
          <Field label={`Target HP: ${module.exactlyOneHp ? "1 HP" : `${module.hpPercent}%`}`}>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={1}
                max={100}
                value={module.hpPercent}
                disabled={module.exactlyOneHp}
                onChange={(e) => set({ hpPercent: Number(e.target.value) })}
                className="flex-1 accent-red-500 disabled:opacity-40"
              />
              <Toggle
                label="1 HP"
                checked={module.exactlyOneHp}
                onChange={(v) => set({ exactlyOneHp: v })}
              />
            </div>
          </Field>

          <div className="grid grid-cols-1 @md:grid-cols-2 gap-2">
            <NumberField
              label="Target level"
              value={module.targetLevel}
              min={1}
              max={100}
              onChange={(v) => set({ targetLevel: v })}
            />
            {BALL_NEEDS.yourLevel.has(ballId) && (
              <NumberField
                label="Your level"
                value={module.yourLevel}
                min={1}
                max={100}
                onChange={(v) => set({ yourLevel: v })}
              />
            )}
            {BALL_NEEDS.turn.has(ballId) && (
              <NumberField
                label="Turn count"
                value={module.turnCount}
                min={1}
                max={99}
                onChange={(v) => set({ turnCount: v })}
              />
            )}
          </div>

          {/* Ball-specific flags */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {BALL_NEEDS.water.has(ballId) && (
              <Toggle label="On/in water" checked={module.inWater} onChange={(v) => set({ inWater: v })} />
            )}
            {BALL_NEEDS.night.has(ballId) && (
              <Toggle label="Night / cave" checked={module.nightOrCave} onChange={(v) => set({ nightOrCave: v })} />
            )}
            {BALL_NEEDS.caught.has(ballId) && (
              <Toggle label="Already caught" checked={module.alreadyCaught} onChange={(v) => set({ alreadyCaught: v })} />
            )}
            {BALL_NEEDS.love.has(ballId) && (
              <Toggle
                label="Same species, opposite gender"
                checked={module.loveBallMatch && !data.isGenderless}
                disabled={data.isGenderless}
                onChange={(v) => set({ loveBallMatch: v })}
              />
            )}
          </div>

          {/* Advanced, generation-gated */}
          <AdvancedSection gen={gen} module={module} set={set} />

          {/* Detailed report */}
          {result && (
            <details className="text-xs text-slate-400">
              <summary className="cursor-pointer hover:text-slate-200">Detailed report</summary>
              <div className="mt-2 space-y-0.5 font-mono">
                <div>Species catch rate: {data.captureRate}</div>
                <div>Modified rate (X): {fmt(result.detail.modifiedCatchRate)}</div>
                {result.detail.shakeThreshold !== null && (
                  <div>
                    Shake threshold (Y): {result.detail.shakeThreshold} · {result.detail.shakeChecks} shakes
                  </div>
                )}
                {result.detail.notes?.map((n) => (
                  <div key={n}>{n}</div>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}

function AdvancedSection({
  gen,
  module,
  set,
}: {
  gen: SupportedGen;
  module: CatchRateModule;
  set: (u: Partial<CatchRateModule>) => void;
}) {
  const showCapturePower = gen === 9;
  const showOffGuard = gen === 9;
  const showBadgeCount = gen === 9;
  const showCharm = gen >= 7;
  const showEighthBadge = gen === 8;
  const showOPower = gen === 5 || gen === 6 || gen === 7;
  const showDex = gen >= 5; // critical capture
  const showDarkGrass = gen === 5;

  if (
    !showCapturePower &&
    !showOffGuard &&
    !showBadgeCount &&
    !showCharm &&
    !showEighthBadge &&
    !showOPower &&
    !showDex &&
    !showDarkGrass
  ) {
    return null;
  }

  const oPowerLabel = gen === 5 ? "Entralink power" : gen === 6 ? "O-Power" : "Roto Catch";

  return (
    <div className="border-t border-slate-700 pt-2 space-y-2">
      <div className="text-[11px] uppercase tracking-wider text-slate-500">Advanced</div>
      <div className="grid grid-cols-1 @md:grid-cols-2 gap-2">
        {showCapturePower && (
          <Field label="Capture Power">
            <Select value={String(module.capturePower)} onChange={(v) => set({ capturePower: Number(v) })}>
              <option value="0">None</option>
              <option value="1">Lv. 1</option>
              <option value="2">Lv. 2</option>
              <option value="3">Lv. 3</option>
            </Select>
          </Field>
        )}
        {showOPower && (
          <Field label={oPowerLabel}>
            <Select value={String(module.oPowerLevel)} onChange={(v) => set({ oPowerLevel: Number(v) })}>
              <option value="0">None</option>
              <option value="1">Lv. 1</option>
              <option value="2">Lv. 2</option>
              <option value="3">Lv. 3 / MAX</option>
            </Select>
          </Field>
        )}
        {showBadgeCount && (
          <NumberField
            label="Badges earned"
            value={module.badgeCount}
            min={0}
            max={8}
            onChange={(v) => set({ badgeCount: v })}
          />
        )}
        {showDex && (
          <NumberField
            label="Species caught"
            value={module.dexCaughtBucket}
            min={0}
            max={1025}
            onChange={(v) => set({ dexCaughtBucket: v })}
          />
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {showOffGuard && (
          <Toggle label="Caught off guard" checked={module.caughtOffGuard} onChange={(v) => set({ caughtOffGuard: v })} />
        )}
        {showCharm && (
          <Toggle label="Catching Charm" checked={module.catchingCharm} onChange={(v) => set({ catchingCharm: v })} />
        )}
        {showEighthBadge && (
          <Toggle label="Have 8th badge" checked={module.hasEighthBadge} onChange={(v) => set({ hasEighthBadge: v })} />
        )}
        {showDarkGrass && (
          <Toggle label="In dark grass" checked={module.darkGrass} onChange={(v) => set({ darkGrass: v })} />
        )}
      </div>
    </div>
  );
}

// --- small presentational helpers ---

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "∞";
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-2 py-1.5 text-xs rounded bg-slate-800 border border-slate-700 text-slate-200 hover:border-slate-600 focus:outline-none focus:border-red-500"
    >
      {children}
    </select>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isNaN(n)) return;
          onChange(Math.max(min, Math.min(max, n)));
        }}
        className="px-2 py-1.5 text-xs rounded bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-red-500"
      />
    </Field>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-center gap-1.5 text-xs ${disabled ? "opacity-40" : "cursor-pointer"}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-red-500"
      />
      <span className="text-slate-300">{label}</span>
    </label>
  );
}
