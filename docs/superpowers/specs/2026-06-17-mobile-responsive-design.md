# Mobile Responsiveness — Design

**Date:** 2026-06-17
**Branch:** `mobile-responsive`
**Goal:** Make ThundderrDex fully usable on phones (~360px wide) through tablets, across every module and all layout chrome.

## Context

ThundderrDex is a Next.js 16 + Tailwind app: a module-based workspace (Header, Sidebar, TabBar, draggable/resizable module grid). Module types: Pokémon, Type Chart, Nature Chart, Team Builder (coverage), Damage Calculator, Location, Pokédex, Catch Rate. ~13.4k lines across components; the damage calculator is the heaviest (~4.3k lines).

Some responsive work already exists (Header has a mobile two-row layout; the module grid collapses to one column below `md`; `.module-cols` width-snapping is scoped to `md+`). The gaps are: the Sidebar is hidden entirely below `lg` (cutting off Recent searches, Saved Teams, generation info, Clear Cache), wide tables force page-level horizontal scroll, and many popovers/grids use fixed pixel widths that overflow ~360px.

## Decisions (agreed)

- **Sidebar on mobile/tablet** → slide-in **hamburger drawer**, available on everything **below `lg` (1024px)**.
- **Damage calculator** → polish the **single-calculator** path for mobile; the desktop team-battle 3-panel view stays desktop-only (≥1200px).
- **Scope** → comprehensive: every module + chrome, phones (~360px) through tablets.
- **Zoom stays accessible** — viewport meta will not lock max-scale.

## Approach

Mobile-first responsive refactor **in place** using Tailwind breakpoints on the existing components, plus a few shared primitives. No separate mobile route or duplicate components (rejected: doubles maintenance and drifts).

Two shared primitives are introduced:

1. **Sidebar drawer** — the sidebar body is extracted to a shared component rendered both as the desktop `aside` (`hidden lg:flex`) and as a below-`lg` overlay drawer (backdrop + slide-in panel, close on backdrop tap / button / route of an action). Open/close state lives in a small client-side store (`uiStore`) so the Header hamburger and the drawer share it.
2. **Viewport-safe popover** — a shared wrapper/utility that caps dropdown width to `min(320px, 100vw − 1rem)` and clamps horizontal position so popovers never render off-screen. Applied to move/item/status pickers, the move selector, and the portal'd generation dropdown.

Wide, inherently-tabular content (type chart, nature chart, learnset) **scrolls horizontally inside its own module card**, never the page.

## Design by area

### 1. Global / chrome
- `layout.tsx`: add explicit `export const viewport = { width: "device-width", initialScale: 1 }` (no `maximumScale` lock).
- **Sidebar drawer**: extract `Sidebar` body → shared component; desktop `aside` keeps `hidden lg:flex`; add below-`lg` drawer overlay. Add a hamburger button to the mobile Header row. `uiStore` (zustand, matching existing store pattern) holds `sidebarOpen`. The existing "hide sidebar when a damage-calc module is present" rule is desktop-only space management; the mobile drawer remains available.
- **Viewport-safe popover primitive** (shared class/component) used by the dropdowns below.

### 2. Charts (Type Chart, Nature Chart)
- Type chart: keep the matrix but contain horizontal scroll within the module card (sticky row/col headers already present); reduce cell padding on mobile; the `min-w-[700px]` becomes a contained scroll region, not a page-width blocker.
- Nature chart: same contained-scroll treatment; explanation `grid-cols-3` → `grid-cols-1 sm:grid-cols-3`.

### 3. Pokémon module
- **LearnsetTable**: contained horizontal scroll; hide low-priority columns (Acc, PP) below `sm` via `hidden sm:table-cell`.
- **StatsDisplay**: responsive stat-grid template; move dropdown width capped to viewport; IV/EV inputs remain tappable.
- **Evolution chains** (`CircularEvolution` `grid-cols-3`, `BranchingEvolution` fixed-width children): allow wrap / contained horizontal scroll on mobile so a 5-branch line doesn't overflow.
- **LocationsPanel**: stack version label / locations rows on mobile.
- **PokemonModule**: import/export modal uses `w-full max-w-[min(400px,90vw)]`; moves grid `grid-cols-2` → responsive.

### 4. Damage calculator (single-calc path)
- **PokemonConfigPanel**: responsive stat grid; move/item/status popovers use the viewport-safe primitive (the `min-w-[320px]` ones are the worst offenders); HP-input row wraps cleanly; import/export modal sized like above.
- **MoveSelector**: viewport-safe popover; column layout fits ≤320px.
- **FieldConditions**: dense attacker/defender `grid-cols-2` → `grid-cols-1 sm:grid-cols-2`.
- **DamageResults**: InfoButton tooltip clamped on-screen.
- **DamageCalcModule / FullscreenDamageCalc**: make the team-battle vs single-calc routing explicit so the 3-panel layout never renders below 1200px (it already falls back; this makes it intentional).

### 5. Other modules
- **CatchRateCalculator**: the three `grid-cols-2` sections → `grid-cols-1 sm:grid-cols-2`; toggle rows wrap cleanly.
- **Pokédex**: filter bar `flex-col sm:flex-row`; grid `minmax` smaller on mobile (e.g. 80px) → 90px at `sm+`; generation quick-select unchanged.
- **LocationModule**: header fits narrow screens; search dropdown viewport-safe; relax `min-h-[400px]`.
- **TeamBuilderModule**: totals sidebar (`w-36`) stacks under the coverage grid on mobile.

### 6. Modals & menus
- Audit every modal for `w-full max-w-* mx-4 max-h-[90vh] overflow-y-auto` (AuthModal, ResetPasswordModal, KeybindsModal, ConfirmModal, SaveTeamModal, LoadTeamDropdown, import/export). Most are close; fixed-`w-[400px]` ones get `w-full max-w-`.
- **AccountMenu** (`w-60`, anchored right) and **GenerationSelector** portal dropdown: clamp to viewport.

### 7. Tap targets
- Bump primary buttons/controls toward ~40px min height. Dense power-user calc inputs stay compact (~32–36px) — acceptable for data-entry density without bloating the layout.

## Out of scope
- Mobile team-battle 3-panel damage calc (stays desktop-only).
- Reworking drag-to-reorder / resize interactions for touch beyond what already works (single-column below `md`; height-resize via touch already functions).
- Visual redesign / new features — this is a responsiveness pass only.

## Verification
- Run the app; check key flows at ~360px (phone) and ~768px (tablet): Header + drawer, Pokédex browse/filter, Pokémon search → stats/learnset/locations, Type Chart, Nature Chart, Catch Rate, Team Builder, Damage Calc (single), all modals.
- `npm run lint` and `npm run build` clean.

## Risks
- The damage-calc config panel and charts are dense; the goal is *usable* on mobile (contained scroll, no page overflow, reachable controls), not pixel-perfect parity with desktop density.
- Extracting the sidebar body must preserve existing behavior (Recent restore, Saved Teams load/delete, Clear Cache) on desktop unchanged.
