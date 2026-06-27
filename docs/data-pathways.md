# Data Pathways — Competitive + PokéAPI Knowledge Base

> Verified June 2026 by probing every endpoint live. This is the reference for
> where our Pokémon data comes from, the exact shapes, the gotchas, and how the
> pieces should fit together. Nothing here is wired into the app yet — it's the
> map we build from.

---

## 0. The two competitive scenes (this drives everything)

As of June 2026 there are **two parallel formats**, with different legal Pokémon,
mechanics, and data. Anything format-specific (legality, spreads, Tera) must key
off a `competitiveFormat`, separate from the existing generation selector.

| | **SV VGC — Reg I** | **Pokémon Champions — Reg M-A** |
|---|---|---|
| Smogon id | `gen9vgc2026regi` (+ `…regibo3`) | `gen9championsvgc2026regma` (+ `…regmabo3`) |
| Game | Scarlet/Violet | Pokémon Champions (newer game) |
| Dex | Full National Dex | ~242 species seen + Mega Evolutions |
| Restricted legendaries | Yes, up to 2 (Miraidon, Calyrex-Shadow/Ice, Urshifu…) | No restricteds; **Megas instead** (e.g. `Floette-Mega`, `Charizard-Mega-Y`) |
| **Tera** | **Yes** (real Tera Types in data) | **No** — chaos shows `Tera Types: {"nothing": …}` |
| Sample size (May 2026, ≥1760) | 236k battles, 274 mons | 3.36M battles, 242 mons |

We're targeting **both**, switchable.

### Why they diverge (and why the data still shares one pipeline)

**VGC** is the official circuit for the *mainline* games (Scarlet/Violet today) —
Regionals → Worlds. **Pokémon Champions** is a *separate, dedicated* competitive
battling game with its own regulation track. Both inherit the VGC format
conventions (**Gen 9 mechanics, level 50, doubles, bring 6 / pick 4**), which is
why our code treats them as gen-9 siblings — but the *contents* fork:

| Axis | VGC Reg I | Champions Reg M-A | Seen in data as |
|---|---|---|---|
| Roster | full National Dex | curated pool (~242 mons) | different species keys |
| Restricted legendaries | yes (≤2) | none | VGC keys incl. Miraidon, Calyrex-* |
| Mega Evolutions | none (Gen 9) | reintroduced | Champions keys incl. `Charizard-Mega-Y`, `Floette-Mega` |
| **Terastallization** | **yes** | **no** | Champions `Tera Types: {"nothing"}` |
| Ladder volume | ~236k battles/mo | ~3.36M battles/mo | `info["number of battles"]` |

The key plumbing fact: **both formats are laddered on Pokémon Showdown**, so the
*same* sources serve both — the divergence is encoded in the data, not in
separate feeds:

```
Pokémon Showdown ladder (runs gen9vgc2026regi AND gen9championsvgc2026regma)
   └─ Smogon monthly aggregate → chaos JSON   (primary; same parser, divergent contents)
        ├─ Pikalytics  (re-aggregates; clean %, win rate, cores)
        └─ Limitless   (real tournaments — VGC events AND Champions events, tagged by format)
```

So switching format = swapping the format id in the same URL; everything else is
identical. Naming gotcha: `gen9championsvgc2026regma` says both "gen9" and "vgc"
even though it's the Champions game — Showdown namespaces under gen-9 mechanics
and "vgc" denotes the doubles ruleset; the `champions` infix marks the game/roster.

**Where the fork bites us:** Champions' *new invented* Megas (e.g. `Floette-Mega`)
aren't in `@smogon/calc`/`@pkmn/dex` (verified: `Floette-Mega` throws, while the
real `Charizard-Mega-Y` builds). Battle modes skip the unbuildable ones; Reg I is
unaffected. We model the rest of the divergence in `formats.ts` (`hasTera`,
`smogonFormat`, …) and derive legality per-format from the usage keys.

---

## 1. Smogon usage statistics — the backbone (free, no key)

The authoritative source for **usage %, EV spreads, moves, items, abilities,
teammates, Tera**. Same data family as the `@smogon/sets` we already use.

### Endpoints

```
https://www.smogon.com/stats/<YYYY-MM>/                         ← month index
https://www.smogon.com/stats/<YYYY-MM>/chaos/<format>-<cutoff>.json   ← full JSON  (PRIMARY)
https://www.smogon.com/stats/<YYYY-MM>/moveset/<format>-<cutoff>.txt  ← same detail, ~85 KB text
https://www.smogon.com/stats/<YYYY-MM>/<format>-<cutoff>.txt          ← plain usage ranking, ~6 KB
https://www.smogon.com/stats/<YYYY-MM>/metagame/<format>-<cutoff>.txt ← playstyle/stalliness
```

- `<YYYY-MM>` — latest is `2026-05`. Published **monthly** (around mid-month for the prior month).
- `<cutoff>` — ELO floor: `0`, `1500`, `1630`, `1760`. **Use `1760`** = high-ladder, best proxy for strong play.
- `<format>` — e.g. `gen9vgc2026regi`, `gen9championsvgc2026regma`. `bo3` variants exist (best-of-3 ladder).

### chaos JSON shape (verified)

```jsonc
{
  "info": {
    "metagame": "gen9vgc2026regi",
    "cutoff": 1760,
    "cutoff deviation": 0,
    "team type": null,
    "number of battles": 236315
  },
  "data": {
    "Incineroar": {                       // keyed by display name w/ forms & spaces
      "Raw count": 188638,                // unweighted appearances
      "Viability Ceiling": [12664,87,76,61],
      "usage": 0.3987,                    // FRACTION of teams (already a %)
      "Abilities": { "intimidate": 1629.4, "blaze": 2.2 },     // WEIGHTED COUNTS, not %
      "Items":     { "assaultvest": 585.5, "safetygoggles": 515.5, ... },
      "Spreads":   { "Careful:252/4/12/0/164/76": 159.9, ... }, // "Nature:hp/atk/def/spa/spd/spe"
      "Moves":     { "fakeout": 1629.6, "knockoff": 1564.9, ... },
      "Tera Types":{ "bug": 629.8, "water": 474.8, ... },       // {"nothing":…} in Champions
      "Teammates": { "Miraidon": 952.6, "Urshifu-Rapid-Strike": 686.6, ... },
      "Checks and Counters": [],          // ⚠ effectively empty for VGC — don't rely on it
      "Happiness": { ... }
    }
  }
}
```

### ⚠ Gotcha #1 — values are WEIGHTED COUNTS, not percentages

Everything inside `Abilities/Items/Spreads/Moves/Tera Types/Teammates` is a
weighted occurrence count. To get a percentage, normalise by the Pokémon's total
weight, which is **`sum(Abilities values)`** (every Pokémon has exactly one
ability counted, so abilities sum to the mon's weighted appearances).

```
weight   = Σ Abilities[*]                         // ≈ 1631.6 for Incineroar
item%    = Items[x]   / weight                    // single-select fields → ≤ 100%
spread%  = Spreads[x] / weight
tera%    = TeraTypes[x] / weight
move%    = Moves[x]   / weight                     // 4 slots → set sums to ~400%, a staple ≈ 100%
mate%    = Teammates[x] / weight                   // co-occurrence rate
```

`usage` (top level) is already a fraction — multiply by 100 for the headline %.

### ⚠ Gotcha #2 — name formatting

Keys are Smogon display names: `Urshifu-Rapid-Strike`, `Flutter Mane` (space),
`Calyrex-Shadow`, `Floette-Mega`. To feed `@smogon/calc` they work as-is; for the
app's kebab convention use `toCalcSpecies()` (lowercase, spaces/hyphens → `-`).
Move/item/ability keys are lowercase no-space (`fakeout`, `assaultvest`).

### ⚠ Gotcha #3 — file sizes / which file to fetch

| File | Size | Use when |
|---|---|---|
| `chaos/<fmt>-1760.json` | **2.3 MB (Reg I) – 7.4 MB (Champions)** | full programmatic access; fetch once, cache in IndexedDB |
| `moveset/<fmt>-1760.txt` | **~85 KB** | same per-mon detail, parse text — best size/detail tradeoff for bulk |
| `<fmt>-1760.txt` | **~6 KB** | just the usage ranking (tier list) |

Counter-intuitively the `-1760` chaos can be *larger* than `-0` (high-level play
uses more distinct precise spreads). Treat all chaos files as "big, cache hard."

### Recency / licensing
Monthly. Public, no key, no documented rate limit (be polite — fetch a format
once per session and cache). Smogon stats are freely used across the ecosystem;
courtesy attribution ("Smogon usage stats").

---

## 2. Pikalytics `/ai` — clean percentages + win rate + team cores (free, attribution)

Built for agents: returns **Markdown** (not JSON) with already-normalised
percentages, defensive matchups, and team cores.

### Endpoints
```
GET /ai                                   ← hub / navigation
GET /ai/pokedex/<format>                  ← format overview: usage leaders, 2- & 3-mon cores, featured team
GET /ai/pokedex/<format>/<Pokemon>        ← per-mon: usage, win rate, moves%, items%, abilities%, matchups, (spreads/teammates)
GET /ai/tournaments/<source>/<slug>       ← tournament team data
```
- `Content-Type: text/markdown`, ~7.5 KB per Pokémon page.
- Percentages are pre-computed (e.g. Garchomp `Earthquake 90.794%`, `Choice Scarf 30.159%`) — no normalisation needed.
- Format codes match Smogon's (`gen9championsvgc2026regma`).

### ⚠ Gotchas
- **Win Rate is often `N/A`** (it was for Champions Garchomp). Don't assume winrate is present for every format/mon.
- **Markdown, not JSON** — needs parsing (regex/markdown table parse), and shape can drift. Good for display/explanations, fragile as a structured feed.
- Attribution requested ("According to Pikalytics…").

**Best role:** human-readable explanations, team-core suggestions, and a
secondary winrate source — not the primary structured pipeline.

---

## 3. Limitless VGC API — real tournament teams, placements, records (free; key only for higher limits)

The source for **actual high-level human teams** and **true win rates** (from match records), not ladder aggregates.

### Endpoints (`https://play.limitlesstcg.com/api`)
```
GET /tournaments?game=VGC&limit=N         → [{ game, name, date, format, id, players, organizerId }]
GET /tournaments/{id}/details
GET /tournaments/{id}/standings           → [{ name, country, placing, player, record, decklist, deck, drop }]
GET /tournaments/{id}/pairings            → [{ round, phase, player1, player2, winner, ... }]
```

### Verified `standings[].decklist` — full teams, no key needed
```jsonc
{
  "name": "mirrorhouse", "country": "BR", "placing": 1,
  "record": { "wins": …, "losses": …, "ties": … },     // → real win rate
  "decklist": [
    { "id": "sylveon", "name": "Sylveon", "item": "Quick Claw",
      "ability": "Pixilate", "nature": "Modest", "tera": null,
      "attacks": ["Hyper Voice","Psyshock","Calm Mind","Protect"] }
    // … 6 mons
  ]
}
```

### ⚠ Gotchas
- **No EV spreads** — open team sheets publish item/ability/moves/nature/Tera but not EVs. Pair with Smogon/Pikalytics for spreads.
- `format` is short (`"M-B"`, `"M-A"`, `"23S2"`) — map to our format ids ourselves.
- Live & current (a tournament dated *today* appeared). Great for "real teams" and trends; per-tournament fetch (cache by tournament id; results are immutable once finished).
- Docs mention a `/decks` endpoint needing a key — **not needed** for VGC team lists, which already ride on `/standings`.

---

## 4. The pkmn mirror — sets YES, VGC stats NO

`https://data.pkmn.cc/` (301-redirects to `pkmn.github.io/smogon/data/…`).

- **`/sets/<format>.json`** — ✅ what we already use for Gen 9 sets. Keep using it.
- **`/stats/<format>.json`** — ⚠ **singles only** (`gen9ou` → 200; every VGC format → 404, incl. `gen9vgc2026regi`, `gen9championsvgc2026regma`, even older `gen9vgc2024regg`). Its shape differs too (`{ battles, pokemon, metagame }`).
- `@pkmn/smogon`'s `stats()` rides this mirror, so **it won't help for VGC**. For VGC usage, go to `smogon.com/stats` directly (Section 1).

---

## 5. Format legality / banlists

No single clean "legal list" API. Three options, best-first for our needs:

1. **Derive from usage data (free, zero deps):** every species key in a format's
   chaos/usage file is legal in that format. Covers ~99% of practical needs
   (quiz pools, "is this in the meta"). Misses legal-but-unused mons.
2. **`@pkmn/sim` / `@pkmn/dex`** (Showdown engine): encodes each format's ruleset
   + banlist programmatically (restricted lists, clauses). Authoritative but a new
   dependency and more involved.
3. **Official regulation docs** (Victory Road / Game8): human reference for the
   exact restricted/banned lists (Reg I: 16 mythicals banned, ~22 restricted
   legendaries capped at 2). Good for a hardcoded constant if we want certainty.

**Recommendation:** derive from usage now; add `@pkmn/sim` only if we need exact
legality (e.g. a "is this legal" quiz) later.

---

## 6. Source → capability matrix

| Need | Smogon chaos | Pikalytics `/ai` | Limitless | pkmn `/sets` |
|---|:--:|:--:|:--:|:--:|
| Usage % | ✅ (normalise) | ✅ (clean) | via counting | — |
| **EV spreads** | ✅ **(best)** | ✅ | ❌ (no EVs) | ✅ (curated sets) |
| Moves / items / abilities % | ✅ | ✅ | per-team | ✅ (named sets) |
| Tera usage | ✅ (Reg I) | ✅ | per-team | partial |
| Teammates / cores | ✅ | ✅ (cores) | derivable | — |
| **Win rate** | ❌ | ⚠ (often N/A) | ✅ **(from records)** | — |
| **Real tournament teams** | ❌ | partial | ✅ **(best)** | — |
| Checks & counters | ❌ (empty in VGC) | ⚠ (matchups) | — | — |
| Legality | derive from keys | — | by format | — |
| JSON (not markdown) | ✅ | ❌ (markdown) | ✅ | ✅ |

**Recommended stack**
- **Spreads + usage + moves/items/Tera/teammates** → Smogon chaos `-1760` (primary, cached hard).
- **Win rates + real teams + placements** → Limitless VGC API.
- **Human explanations + team cores + secondary winrate** → Pikalytics `/ai`.
- **Curated named sets (what we already do)** → `@smogon/sets` + pkmn `/sets` mirror.
- **Legality** → derive from usage keys (add `@pkmn/sim` later if needed).

---

## 6b. Deep dive — additional sources (verified June 2026)

Beyond the tier-1 feeds above, these are worth knowing. Two are game-changers
(★): the Showdown Replay API (real games → decision-making training) and
`@pkmn/dex` (battle-accurate data we *already* have installed).

### ★ Pokémon Showdown Replay API — real games (free, CORS `*`)
The decision-making goldmine: millions of real ladder games, including our exact
formats, as parseable battle logs.
```
GET https://replay.pokemonshowdown.com/search.json?format=<id>[&user=<name>][&before=<uploadtime>]
    → [{ uploadtime, id, format, players[2], rating, private, password }]   (51/page; paginate via `before`)
GET https://replay.pokemonshowdown.com/<id>.json
    → { id, formatid, format, players, rating, uploadtime, views, log }
```
- Verified live for `gen9vgc2026regi` (format shows "[Gen 9] VGC 2026 Reg I").
- `log` is the PS battle protocol (text): `|gametype|doubles`, `|player|…`,
  `|rule|…`, then per-turn `|move|`, `|switch|`, `|-damage|`, `|turn|N`, etc. —
  parseable into turn-by-turn states for "what's the best play here?" puzzles.
- Each replay carries a `rating` → filter for high-ELO games client-side.
- `inputlog` exists only for random-team formats (not VGC); for VGC we reconstruct
  decisions from the `log`. Parsers exist (e.g. `@pkmn/sim` BattleStream, or
  community `showdown-parser`).
- Full endpoint reference: smogon/pokemon-showdown-client `WEB-API.md` (also covers
  ladder ratings). Bulk historical dataset: HuggingFace `jakegrigsby/metamon-parsed-replays`.

### ★ `@pkmn/dex` — battle-accurate data, already installed (offline, instant)
We already depend on `@pkmn/dex` (currently unused). It wraps Showdown's data, so
it replaces most PokéAPI fan-out for *battle-relevant* fields:
- `Dex.forGen(9).species.get("Garchomp")` → `num`, `types`, `baseStats` (all 6),
  `abilities` ({0,1,H}), `tier` ("UUBL"), `doublesTier` ("DUU"), `isNonstandard`,
  `baseSpecies`, `prevo`, `evos`, `requiredItem`, weight, etc.
- `.moves.get()` → basePower, type, category, accuracy, pp, priority, flags, desc.
- `.items.get()` / `.abilities.get()` → name + description.
- `.learnsets`, `.types` (type chart), `.natures` also available.
- **No fetch, no rate limits, no kebab fan-out.** Trade-off vs PokéAPI: no sprites,
  no flavor text / Pokédex entries, no encounter/location data, no past-gen type
  history beyond what Showdown encodes. So: use `@pkmn/dex` for battle math/stats,
  keep PokéAPI for sprites/dex/encounters.
- Legality signal: `tier`/`doublesTier` of `AG`/`Uber`/`DUber` ≈ restricted-class
  (Miraidon = `AG`/`DUber`) — a useful heuristic, but **not** VGC-reg legality.
- **All 9 gens, but mind the gating:** `Dex.forGen(n)` applies *gen-accurate
  values* (types e.g. Clefable Normal→Fairy in g6; move BP/acc e.g. Tackle 35→50→40;
  type chart e.g. Ghost→Steel resisted pre-g6; ability/item/move effects). BUT it
  does **not** restrict the roster — in `forGen(1)`, Garchomp/Intimidate still
  `exists` (species/move counts are identical across gens). Each entry carries a
  `.gen` (introduction gen: `Garchomp.gen=4`, `Tera Blast.gen=9`), so gate
  availability yourself via `.gen <= targetGen` (or the app's existing ID-range gating).

### Raw Showdown data files (if we ever want them without `@pkmn/dex`)
`https://play.pokemonshowdown.com/data/` (CORS `*`, updated ~monthly):
`pokedex.json` (1517 entries), `moves.json`, `learnsets.json` are **JSON**;
`abilities`, `items`, `formats-data`, `formats`, `typechart` ship as **`.js`** only.
`/data/sets/` has singles tiers (`gen9ou.json`) but **no Gen 9 VGC** (404) — same
gap as `@smogon/sets`; keep using `data.pkmn.cc/sets` for those.

### Tournament standings / team lists (alternatives to Limitless)
| Source | What | Access |
|---|---|---|
| **Limitless VGC** (§3) | standings + full decklists + records | clean JSON API (our pick) |
| **RK9.gg** | official regionals/IC/Worlds pairings, standings, teamsheets | HTML only → scrape (tools: `pokescraper`, `JulienGitHub/Standings`, `mikewVGC/vgc-standings`) |
| **pokedata.ovh** | community VGC standings | JS app; per-event JSON exists but endpoint undocumented (needs digging) |
| **LabMaus** (labmaus.net) | top-cut team usage + matchup data; powers VS Recorder | web app; API unverified |
| **VS Recorder** (vsrecorder.app) | replay analysis / team planning (sources LabMaus) | consumer app, not an API |

### Ruled out / dead ends
- **Trainer Hill** — Pokémon **TCG** only, not VGC.
- **Showdown `/data/sets/` for Gen 9 VGC** — 404 (use `data.pkmn.cc/sets`).
- **`@pkmn/sim`** — too stale for 2026 formats (see §8 decision 4).

### Updated recommended stack (with the new finds)
- **Battle data** (base stats, types, abilities, moves, items, learnsets, type chart)
  → **`@pkmn/dex`** (already installed) instead of PokéAPI fan-out.
- **Sprites / Pokédex flavor / encounters** → PokéAPI (unchanged).
- **Usage + spreads** → Smogon chaos (§1). **Win rates + real teams** → Limitless (§3).
- **Decision-making content** → Showdown Replay API (real games).
- **Curated named sets** → `@smogon/sets` + `data.pkmn.cc/sets`.

## 6c. Timeframe: monthly, consistently

We standardised on **one timeframe everywhere: the monthly Smogon feed.** Usage,
spreads, meta-weighting (type matchups), Meta Builds, and the Speed/KO upgrades
all read the same monthly `UsageDataset`. No mixed windows.

Freshness is handled by the proxy route, not a cron or DB: `/api/usage/[format]`
re-resolves the latest published month daily (ISR `revalidate`), caches the chaos
per-month, and serves every user from that shared server cache — so it's
"globally controlled by our backend, not fetched per-user" for $0 (§8).

A true *sliding sub-monthly* window would require aggregating Showdown replays
ourselves (the only daily-timestamped source; usage/leads but no EV spreads, and
viable only for high-activity formats like Champions). We considered it (§6b lists
replays as a source) but deferred it in favour of monthly consistency.

## 7. PokéAPI — how the app already consumes it

Base: `https://pokeapi.co/api/v2` (`src/lib/pokeapi/client.ts`). Server-side
`fetch` with Next ISR `revalidate: 86400` (24 h); custom `PokeAPIError`.

### Endpoints used
`/pokemon/{id}`, `/pokemon/{id}/encounters` (Gen 1–7 only), `/pokemon-species/{id}`,
`/evolution-chain/{id}`, `/ability/{id}`, `/move/{id}`, `/machine/{url}`,
`/type/{name}`, `/location-area/{id}`, `/location-area?limit=…`, `/pokedex/{id}`.

### Caching (two layers)
- **React Query** (`src/components/Providers.tsx`): `staleTime` 5 min default,
  `gcTime` 7 days, `retry: 2` with capped exponential backoff (PokéAPI
  rate-limits under load → 2 retries recover most transient failures).
- **IndexedDB persistence** (`src/lib/queryPersister.ts`): DB `thundderrdex-cache`,
  single key `tanstack-query`, 7-day expiry, cache-buster `"v2"` (bump on shape change).
- Per-hook overrides: lists/dex/type use `staleTime: ∞` (effectively static);
  learnset 30 m; smogon sets 1 h.

### Hooks → source map
| Hook | Source | Returns |
|---|---|---|
| `usePokemon` | PokéAPI `/pokemon` | full stats/types/sprites; abilities fetched async (fan-out per ability) |
| `usePokemonList` | PokéAPI `/pokemon?limit=1025` + local Mega/regional lists | `PokemonListItem[]` |
| `usePokedex` | PokéAPI `/pokedex/{id}` + `dexForms` | per-region slots w/ form resolution |
| `useLearnset` | PokéAPI `/pokemon.moves` + `/move` (fan-out) | grouped learnset |
| `useEvolution` | `/pokemon-species` + `/evolution-chain` | evolution tree |
| `useEncounters` | `/pokemon/{id}/encounters` (1–7) + **static `gen8/9-encounters.json`** | grouped encounters |
| `useLocationArea(List)` | `/location-area…` + static Gen 8/9 | encounters by version/method |
| `useCatchRateData` | `/pokemon` + `/pokemon-species` (parallel) | capture-rate bundle |
| `usePokemonOfType` | `/type/{name}` | `Set<nationalId>` |
| `useSmogonSets` | `@smogon/sets` pkg + `data.pkmn.cc/sets` (Gen 9) | `SmogonSet[]` |
| `useDamageCalc` | `@smogon/calc` (in-memory) | damage/KO result |

### Transformers & types
`src/lib/pokeapi/transformers.ts`: `formatPokemonName` (~30 special cases:
Mr. Mime, Nidoran♀/♂, Type: Null…), `transformStats/Types/PastTypes/Abilities/
Learnset/Move/LocationArea`. App types live in `src/types/{pokemon,moves,api}.ts`
(`Pokemon`, `Move`, `LearnsetEntry`, …).

### Static/local data (`src/data/`)
`gen8-encounters.json` (589 KB) + `gen9-encounters.json` (535 KB) (Serebii scrapes —
PokéAPI lacks Gen 8–9 encounters), `dexForms.ts`, `generations.ts`, `natures.ts`,
`pokedexes.ts`, `items.ts`, `tmLookup.ts`, `typeChart.ts`. Gen mechanics flags in
`src/lib/utils/generationConfig.ts` (Tera Gen 9, Dynamax Gen 8, Z-moves Gen 7, regional/Mega rosters).

### PokéAPI gotchas
- **kebab-case everywhere** (`focus-blast`); display layer title-cases; `@smogon/calc`
  wants Title Case w/ spaces. ~30 hardcoded special names.
- **Forms/variants**: Megas + regional variants are separate synthetic list items;
  `dexForms.ts` resolves which form a dex slot shows (Paldean Tauros has 3).
- **Generation gating**: ID ranges → gen; type/ability history per gen (Clefairy
  Normal→Fairy); no abilities Gen 1–2.
- **No rate-limit handling beyond React Query retries**; ISR + 7-day persist absorb most load.
- `@pkmn/data` & `@pkmn/dex` are installed but currently unused.

---

## 8. Proposed competitive-data architecture (not yet built)

A `src/lib/competitive/` module, mirroring how `setPool`/`useSmogonSets` work:

```
src/lib/competitive/
  formats.ts     // registry: id, Smogon id(s), Pikalytics code, Limitless filter, hasTera, label
  types.ts       // verified response types (chaos, limitless) + app-facing UsageEntry
  sources.ts     // pure URL builders + the weighted-count → % normaliser (no fetching)
  smogonStats.ts // fetch + parse + cache one format's chaos (later)
  limitless.ts   // fetch tournaments/standings (later)
  pikalytics.ts  // fetch/parse /ai markdown (later)
```

- **Caching / daily refresh (implemented):** the `/api/usage/[format]` route
  re-runs daily (`revalidate=86400`) and resolves the newest month from the
  Smogon stats *index* (small ~17 KB HTML, cached daily) via `parseLatestStatsMonth`.
  The heavy chaos file is cached **per-month** (`revalidate` ~30 days) since a
  published month is immutable, so the 2–7 MB download happens only when the month
  actually flips — not daily. If the newest month doesn't carry a format yet, the
  route falls back to `previousMonth`. Net daily cost: one tiny index fetch +
  the slim recompute; clients cache the result a day (`s-maxage=86400`) and persist
  it in IndexedDB. Optional further saving: swap chaos for the 85 KB `moveset/*.txt`.
- **Normalisation:** convert weighted counts to an app-facing `UsageEntry`
  (`usage`, `moves[]`, `items[]`, `spreads[]`, `tera[]`, `teammates[]` as `{name, pct}`)
  at parse time so the rest of the app never sees raw counts.
- **Format-awareness:** a `competitiveFormat` selector (separate from gen) gates
  legality, Tera questions, and which sources to hit.

### Locked decisions (Phase 1 — June 2026)
1. **Bulk feed → chaos JSON.** It's already JSON matching our types; size is handled
   by the proxy slimming it server-side. (Fallback to the 85 KB `moveset/*.txt`
   only if proxy reliability becomes an issue.)
2. **Fetch path → Next.js route handler proxy.** The app calls our own `/api/...`
   route, which fetches Smogon/Limitless, caches, and strips unused fields before
   returning. Avoids CORS, shrinks transfer, centralises caching. The browser never
   sees the raw multi-MB chaos file.
3. **Limitless → deferred to Phase 4.** Build the Smogon spine first; add real
   teams + win rates when a feature needs them.
4. **Legality → originally `@pkmn/sim`; CHECK FAILED → revised plan below.**
   - ❌ **Verified (June 2026):** the latest `@pkmn/sim@0.10.11` does **not** bundle
     our formats. Its newest VGC format is `gen9vgc2025regi`; it has **zero**
     Champions formats. The package lags the live ladder ~a year, so exact banlists
     via `@pkmn/sim` are not available for `gen9vgc2026regi` or
     `gen9championsvgc2026regma`. (`@pkmn/dex` has no format rulesets at all — only
     per-species `FormatsData` tier tags.) `@pkmn/sim` was uninstalled.
   - ✅ **Revised legality plan (works for both formats today):**
     1. **Legal species set → derive from usage keys.** Every Pokémon in a format's
        chaos `data` is legal/played — immediate and accurate for "is this in-format".
     2. **Authoritative bans → small hardcoded ruleset constant per regulation**
        (sourced from official docs / Victory Road): Reg I = 16 mythicals banned +
        ~22 restricted legendaries capped at 2; Champions Reg M-A = its species pool,
        no restricteds, Megas allowed, no Tera. These lists are short and change rarely.
     3. **Optional later:** if `@pkmn/sim` ships 2026 formats, or we pull Showdown's
        live format config, swap in exact rule resolution. Not blocking.
```
