# Tier 1 + Tier 2 Usability & Design Overhaul — Design

Date: 2026-06-21
Branch: `tier1-tier2-overhaul`

## Context

ThundderrDex is a modular Pokémon competitive toolkit (Next.js 16, React 18,
Tailwind, Zustand, React Query, Supabase sync). A full usability/design review
surfaced four systemic gaps: poor discoverability, conflated loading/empty/error
states (no error boundary), desktop-first/touch fragility, and no design system
(empty Tailwind config, duplicated color maps, 8× duplicated module shells,
hand-rolled modals).

This overhaul executes the review's Tier 1 + Tier 2 in dependency order. Decisions
from the user: **light visual refresh** (tokens + primitives + modest contrast/
spacing polish, keep slate identity), **lightweight persistent onboarding** (no
forced tour), **power through all 8 phases on a branch, build between each,
re-evaluate at the end.**

Not a Boop product repo (personal tool) → plain commits per phase, no Graphite/BDD.

## Phases

### Phase 1 — Design tokens + shared primitives (foundation)
- `tailwind.config.ts` + `globals.css`: semantic tokens — `surface`,
  `surface-raised`, `surface-sunken`, `border`, `text-primary/secondary/muted`
  (muted recalibrated to ≥4.5:1, retiring slate-500/600 for body text), `accent`
  + per-module accents, radius/spacing scale, `text-2xs` floor.
- Single `MODULE_ACCENTS` map replaces disagreeing maps in `Header.tsx` /
  `SidebarContent.tsx`.
- `src/components/ui/`: `Button`, `Badge`, `Card`, `SearchInput` (encapsulates the
  copy-pasted dropdown: mousedown-close instead of blur-timeout, arrow-key nav,
  touch/pointer highlight), and the `Modal` shell (delivered Phase 4).
- Sweep worst sub-10px text to a readable floor.

### Phase 2 — QueryState wrapper + error boundary
- `src/components/ui/QueryState.tsx`: `{ isLoading, isError, isEmpty, error,
  onRetry, loadingLabel, emptyLabel, children }` → consistent loading / empty /
  error+retry. Distinguishes the three (fixes "Loading… forever").
- `app/error.tsx`, `app/global-error.tsx`, reusable `ErrorBoundary` around
  `ModuleContainer`.
- Query `retry: 2` w/ backoff; apply `QueryState` to every consumer starting with
  Pokédex grid, then detail tabs, catch-rate, search dropdowns.

### Phase 3 — ModuleShell
- `src/components/layout/ModuleShell.tsx` absorbs the duplicated root: dnd-sortable,
  `data-module-root`, size style/classes, selection ring, auto-scroll-on-create,
  grip header (title + accent), unified controls (fullscreen for all opted-in
  modules, minimize finally surfaced, close), visible (not hover-only) larger
  resize handle. All 8 modules refactored to `<ModuleShell …>`.

### Phase 4 — Modal/drawer a11y shell
- `src/components/ui/Modal.tsx`: `role="dialog"`, `aria-modal`, focus trap, focus
  restore, Escape, scroll-lock, backdrop button. Same for `SidebarDrawer`.
- Migrate ~9 overlays; replace hand-rolled confirms + `alert()` with `ConfirmModal`.

### Phase 5 — Onboarding + affordances + recent searches
- Rich empty state in `ModuleContainer`; one-time dismissible hint strip persisted
  in `uiStore`; expand KeybindsModal to list all shortcuts from one source;
  surface per-tab `recentSearches` (already stored, unused) in `SearchInput`.

### Phase 6 — Responsive 6v6
- Replace `≥1200px` gate + `transform: scale(2280px)` with real responsive layout
  (stack/wrap below breakpoints, reflow not downscale). Teams reachable at every
  width.

### Phase 7 — Visible sync status
- Labeled, actionable indicator: offline≠idle, `aria-label`, tooltip, inline text;
  honest schema-lock/conflict messaging surfaced where the user edits.

### Phase 8 — De-hover critical info/controls
- Tap-accessible `DamageResults` KO tooltip, autocomplete highlight on
  `onPointerEnter`+tap, always-visible/focus-visible close/delete buttons.

## Verification
`npm run build` + `npm test` after each phase. Refactors preserve behavior except
the named fixes. Fresh review pass re-evaluates at the end.
