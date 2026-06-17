# Catch Rate Module — Design

**Date:** 2026-06-17
**Status:** Approved (design), pending implementation

## Summary

A new dashboard module, `catch-rate`, that calculates the per-throw capture
probability for a Pokémon given a Poké Ball type and battle conditions. It is a
**single calculator that follows the app's global generation selector**
(`useGenerationStore`), using era-correct capture math for **every generation
1–9** at **maximum fidelity** (all balls, all contextual flags, and the modern
meta-progression modifiers). Modeled on the reference calculator at
https://www.dragonflycave.com/calculators/gen-ix-catch-rate (mechanics pages
under `/mechanics/gen-{i..ix}-capturing`).

## Goals / Non-goals

**Goals**
- Accurate per-throw catch chance for the selected generation.
- Generation-aware UI: only show balls/inputs that exist in that gen.
- Standalone module (no dependency on other modules); persists + cloud-syncs
  through the existing `modules` store automatically.

**Non-goals**
- Cross-generation comparison view (rejected in brainstorming).
- Max Raid / SOS-chaining / Safari Zone bait-throw mechanics (out of scope;
  may note "not modeled").
- Auto-filling the Pokémon from a sibling module (standalone for now).

## Architecture

### 1. Module wiring (mirrors existing module types)
- `src/types/module.ts`: add `"catch-rate"` to `ModuleType`; add
  `CatchRateModule extends BaseModule` holding all calculator inputs (below);
  add it to the `AnyModule` union.
- `src/stores/moduleStore.ts`: `createCatchRateModule()`,
  `addCatchRateModule()`, and `setCatchRateInput(moduleId, partial)`. State on
  the module means it **persists to localStorage and syncs to Supabase via the
  existing `modules` sync store** — no new sync store. Bump
  `MODULE_STORE_VERSION` only if a migration is needed (new module type alone
  needs none; existing payloads simply won't contain one).
- `src/components/layout/ModuleContainer.tsx`: render branch (grid + drag
  overlay) for `"catch-rate"`.
- `src/components/layout/Header.tsx`: a `+ Catch Rate` button calling
  `addCatchRateModule()`.
- `src/components/catch-rate-module/CatchRateModule.tsx`: wrapper
  (header/drag/resize/fullscreen) copied from `PokedexModule.tsx`.
- `src/components/catch-rate-module/CatchRateCalculator.tsx`: inner content.

### 2. Calculation engine — `src/lib/utils/catchRate/`
Pure, framework-free, unit-tested.
- `types.ts` — `CatchRateInputs` and `CatchRateResult`.
- `balls.ts` — ball catalog + per-gen multiplier/condition resolution and
  per-gen availability.
- `gen1.ts`, `gen2.ts`, `gen3_4.ts`, `gen5.ts`, `gen6_7.ts`, `gen8.ts`,
  `gen9.ts` — one strategy each, `(inputs) => CatchRateResult`.
- `index.ts` — `calculateCatchRate(gen, inputs)` dispatch +
  `ballsForGeneration(gen)`.
- `data.ts` — small hardcoded lookups: Ultra Beast species (Beast Ball),
  Moon-Stone evolvers (Moon Ball), Gen-2 Fast Ball special species.

### 3. Data layer
- `src/types/api.ts`: extend `PokeAPIPokemonSpecies` with `capture_rate:number`
  and `gender_rate:number` (and `weight` is on `PokeAPIPokemon`).
- `src/hooks/useCatchRateData.ts`: react-query hook (same caching pattern as
  `usePokemon`) returning `{ captureRate, genderRate, baseHp, baseSpeed,
  weightHg, types }` by combining `/pokemon` + `/pokemon-species`.

### 4. Generation-aware UI
Reads `globalGeneration`. Sections:
- **Always:** Pokémon search (reuse `SearchBar` pattern), ball dropdown
  (`ballsForGeneration(gen)`), HP control (% slider + "1 HP" toggle), status
  (None/Sleep/Freeze/Poison/Burn/Paralysis).
- **Conditional on ball:** turn count (Timer/Quick), in-water (Dive/Lure),
  night-or-cave (Dusk), already-caught (Repeat), your-level (Level), your-gender
  (Love).
- **Advanced (gen-gated):** badge/obedience state (Gen 8 8th-badge flag; Gen 9
  badge count), Capture Power 0–3 (Gen 9), Catching Charm (Gen 7+), Pokédex
  completion bucket (Gen 5+ critical capture; Gen 5 dark-grass), "caught off
  guard" (Gen 9), Entralink/O-Power/Roto bonus (Gen 5/6/7).
- **Output:** big per-throw catch % , expected balls `1/p`, critical-capture %
  (Gen 5+), and a collapsible "detailed report" (modified rate `a`/`X`, shake
  threshold `Y`, shake count).

### 5. Testing
Add **vitest** as a dev dependency. One test file per gen strategy asserting
against worked reference values from the dragonflycave mechanics pages, plus a
few hand-computed fixtures (e.g. full-HP Poké Ball on a rate-45 species; 1-HP
asleep Ultra Ball; conditional balls firing vs. not).

## Module state (`CatchRateModule`)
```
pokemonName: string | null
ballId: string            // e.g. "ultra-ball"
hpPercent: number         // 1..100
exactlyOneHp: boolean     // overrides hpPercent when true
status: "none"|"sleep"|"freeze"|"poison"|"burn"|"paralysis"
turnCount: number         // Timer/Quick
inWater: boolean          // Dive/Lure
nightOrCave: boolean      // Dusk
alreadyCaught: boolean    // Repeat
yourLevel: number         // Level Ball
yourGender: "male"|"female"|"genderless"  // Love Ball
targetLevel: number       // Nest/low-level/badge penalty/Level Ball target
// advanced
capturePower: 0|1|2|3     // Gen 9 D (1 / 1.1 / 1.25 / 2.0)
oPowerLevel: 0|1|2|3      // Gen 5 E / Gen 6 O / Gen 7 Roto
caughtOffGuard: boolean   // Gen 9 D ×2
catchingCharm: boolean    // Gen 7+ crit ×2
badgeCount: number        // Gen 9 obedience penalty
hasEighthBadge: boolean   // Gen 8 difficulty
dexCaughtBucket: number   // crit-capture P + Gen5 dark-grass G
darkGrass: boolean        // Gen 5 G applies
```
Defaults: full HP, Poké Ball, no status, turn 1, all flags off, levels 50.

## Per-generation formulas

Notation: `M`=max HP, `H`=current HP, `C`=species capture rate (ball-modified
for apricorn/heavy), `B`=ball bonus, `S`=status. Pre-Gen-5 floor at every step.

### Gen 1 (RBY) — special algorithm, no shake formula
Ball gives a range size `Bv` and the R1 draw is `[0, Bv-1]`:
Poké `Bv=256`, Great `201`, Ultra/Safari `151`, Master auto.
Status auto-catch `S`: sleep/freeze `25`, poison/burn/paralysis `12`, none `0`.
Steps: draw `R1∈[0,Bv-1]`; `R* = R1 - S`; if `R*<0` → caught; if `C < R*` →
fail; else HP factor `F = floor((M*255)/G)` with `G=8` (Great) else `12`, then
`F = floor(F / max(1, floor(H/4)))`, cap `F=255`; draw `R2∈[0,255]`; caught if
`R2 ≤ F`.
Closed-form probability:
`P = S/Bv + (min(C+1, Bv−S)/Bv) * ((F+1)/256)`.

### Gen 2 (GSC)
Ball modifies `C`: Poké/Friend/Park-as-Poké ×1, Great/Park ×1.5, Ultra ×2,
Master auto. Apricorn: Fast ×4 (only the GSC special species — Magnemite,
Grimer, Tangela lines), Level ×8/×4/×2/×1 (player lvl ÷4/÷2/> vs target),
Lure ×3 (fishing), Love ×8 (same species, opposite gender), Moon ×4 (Moon-Stone
evolvers), Heavy `+40/+30/+20/+0/−20` at `≥409.6/307.2/204.8/102.4/else` kg.
Clamp `C∈[1,255]`.
Status `S`: sleep/freeze `+10`, else `0` (poison/burn/para inert — GSC bug).
`X = max(floor((3M−2H)*C/(3M)), 1) + S`, cap `255`. **Level Ball quirk:** `X=C`
(bypasses HP). Capture: `P = (X+1)/256` (X≥255 ⇒ guaranteed).

### Gen 3 & 4
`X = floor( floor((3M−2H)*C*B/(3M)) * S )`. Status `S`: sleep/freeze `2`,
poison/para/burn `1.5`, none `1`. If `X≥255` ⇒ guaranteed; else
`Y = floor(1048560 / sqrt(sqrt(16711680 / X)))`, 4 shakes,
`P = (Y/65536)^4`.
Balls (both): Poké/Premier/Luxury/Heal/Cherish `1`, Great/Safari/Sport `1.5`,
Ultra `2`, Net `3` (Water/Bug) else `1`, Nest `(40−lvl)/10` min `1`, Dive `3.5`
(underwater RSE; surf/fish DPHGSS) else `1`, Repeat `3` (caught) else `1`,
Timer `(turns+10)/10` max `4`, Master/Park auto.
**Gen 4 adds:** Dusk `3.5` (night/cave), Quick `4` (turn 1); HGSS apricorn balls
modify `C` (Fast ×4 if base Speed ≥100, Heavy as Gen-2 thresholds, Level
×8/4/2, Love ×8, Lure ×3, Moon ×4) with `B=1`.

### Gen 5 (BW/B2W2)
`X = floor( floor((3M−2H)*G*C*B/(3M)) * S * E / 100 )`. `G` dark-grass dex
bucket (default `1`): `>600→1, 451-600→0.9, 301-450→0.8, 151-300→0.7,
31-150→0.5, ≤30→0.3` (4096-scaled). `E` Entralink: `100/110/120/130`.
Status `S`: sleep/freeze `2.5`, poison/para/burn `1.5`, none `1`.
`Y = floor(65536 / sqrt(sqrt(255/X)))`, **3 shakes**, normal `P=(Y/65536)^3`.
Critical: `CC = floor(min(255,X)*Pc/6)`, dex `Pc`:
`>600→2.5,451-600→2,301-450→1.5,151-300→1,31-150→0.5,≤30→0`; crit prob
`CC/256`, crit shake once. Final `= (CC/256)*(Y/65536) +
(1−CC/256)*(Y/65536)^3`.
Balls: standard as Gen 4; Net `3`, Dusk `3.5`, Quick `5`, Timer
`1+turns*1229/4096` max `4`, Nest `(41−lvl)/10` (lvl<30, min1 max4), Repeat `3`,
Dive `3.5`; Dream `1` outside Entree.

### Gen 6 & 7 (XY/ORAS, SM/USUM)
`X = floor( ((3M−2H)*G*C*B/(3M)) * S * O )`. `O` = O-Power (Gen 6: `1/1.5/2/2.5`)
/ Roto (Gen 7 lvl3 `2.5`). Status as Gen 5.
`Y = floor(65536 / (255/X)^(3/16))`, **4 shakes**, normal `P=(Y/65536)^4`.
Critical: `CC = floor(min(255,X)*Pc*Ch/6)`; `Ch=2` with Catching Charm (Gen 7+),
else `1`. Final `=(CC/256)*(Y/65536)+(1−CC/256)*(Y/65536)^4`.
Ball deltas — **Gen 6:** Net `3`, Repeat `3`, Dusk `3.5`, Lure `5`, Heavy ×… as
C-mod, no Beast. **Gen 7:** Net `3.5`, Repeat `3.5`, Dusk `3`, Lure `5`, Beast
`5` (Ultra Beast) else `410/4096`, and **all non-Beast balls on an Ultra Beast →
B=410/4096**. Fast `4` (Speed≥100), Level `8/4/2/1`, Love `8`, Moon `4`, Nest
`(41−lvl)/10` (<30), Quick `5`, Timer `1+turns*1229/4096` max4, Dive `3.5`.

### Gen 8 (SwSh/BDSP)
`X = floor( ((3M−2H)*G*C*B/(3M)) * L * S * D )`. `L` low-level: lvl<21 →
`(30−lvl)/10`, else `1`. `D` difficulty: `0.1` (≈410/4096) if no 8th badge AND
your lvl < target, else `1`. Status sleep/freeze `2.5` else `1.5`.
`Y = floor(65536/(255/X)^(3/16))`, 4 shakes; crit `CC=floor(min(255,X)*Pc*Ch/6)`
`Ch=2` w/ charm. Final as Gen 6/7.
Balls: Net `3.5`, Nest `(41−lvl)/10` (<30), Repeat `3.5`, Dive `3.5`, Dusk `3`,
Quick `5`, Timer `1+turns*0.3` max4, Fast `4`, Level `8/4/2/1`, **Lure `4`**
(down from 5), Moon `4`, Dream `4` (asleep/Comatose), Beast `5`/`0.1`, Heavy
`+30/+20/+0/−20` at `≥300/200/100/<100` kg (min `C=1`).

### Gen 9 (SV) — reference
`X = (((3M−2H)*G*C*B*BP)/(3M)) * L * S * D`. `BP` badge penalty: ×0.8 per
missing obedience badge (badges-needed by level: ≤25→0,26-30→1,…,61+→8).
`L` low-level: lvl≤13 → `(36−2*lvl)/10`, else `1`. Status sleep/freeze `2.5`
else `1.5`. `D` = capture power (`1/1.1/1.25/2.0` for Lv0–3) ×2 if "caught off
guard".
`Y = floor(65536/(255/X)^(3/16))`, 4 shakes; crit
`CC=floor(min(255,X)*Pc*Ch/6)`. Final as Gen 6/7.
Balls: Net `3.5`, Nest `(41−lvl)/10` (<30), Dive `3.5`, Repeat `3.5`, Timer
`1+turns*1229/4096` max4, Quick `5` (turn1), Dusk `3` (night/cave), Fast `4`
(Speed≥100), Level `8/4/2/1`, Love `8` (same species opposite gender), Lure `4`,
Moon `4`, Beast `5`/`0.1`, Dream `4`, Heavy `+30/+20/+0/−20` at `≥300/200/100`kg.

## Edge cases / decisions
- Master / Park (auto-catch eras): result = 100%.
- `X≥255` (pre-shake) ⇒ guaranteed (P=1) in shake gens; Gen 1/2 use their own
  guaranteed conditions.
- Weight from PokeAPI is hectograms; convert to kg (`/10`) for Heavy Ball.
- Gender Ball / Love Ball when target is genderless ⇒ condition fails.
- Some constants (Gen-2 Fast Ball species list, dark-grass scaling) carry minor
  historical ambiguity; unit tests against reference values guard them, and the
  detailed report exposes intermediate values for sanity-checking.

## Risks
- Breadth of edge cases across 9 gens. Mitigated by isolating each gen in its
  own tested strategy and shipping the detailed report so discrepancies are
  visible.
- vitest is a new dev dependency (approved by user).
