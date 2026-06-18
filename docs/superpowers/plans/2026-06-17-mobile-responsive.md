# Mobile Responsiveness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make ThundderrDex fully usable on phones (~360px) through tablets across every module and all layout chrome.

**Architecture:** Mobile-first responsive refactor in place with Tailwind breakpoints on existing components, plus two shared primitives — a below-`lg` sidebar drawer and a viewport-safe popover wrapper. Wide tabular content scrolls inside its own module card, never the page.

**Tech Stack:** Next.js 16 (App Router), React 18, Tailwind CSS 3, Zustand stores, dnd-kit.

## Global Constraints

- Target viewport floor: **360px** wide; must also work at tablet (~768px) and keep desktop unchanged.
- Tailwind breakpoints: `sm` 640px, `md` 768px, `lg` 1024px. Sidebar/desktop chrome boundary is `lg`.
- **Do not lock zoom** — viewport meta must not set `maximumScale`/`userScalable:false`.
- Follow existing store pattern (Zustand, files in `src/stores/`) and existing class/styling idioms (dark slate theme, `slate-*` palette).
- Desktop behavior (≥`lg`) must remain visually and functionally unchanged.
- No new features, no visual redesign — responsiveness only.

## Verification gate (applies to every task)

Because these are layout/CSS changes, each task's "test" is:
1. `npm run lint` — clean (no new warnings/errors in touched files).
2. App renders without console errors at the task's target screens.
3. Visual check at ~360px and ~768px (browser devtools responsive mode) of the specific flow the task touched: no horizontal page scroll, no clipped controls, all interactive elements reachable.
4. Desktop (≥1024px) of the same flow looks unchanged.

A final task runs `npm run build`.

## File structure

- New: `src/stores/uiStore.ts` — `sidebarOpen` boolean + toggles (drawer state).
- New: `src/components/layout/SidebarContent.tsx` — extracted sidebar body, rendered by both desktop `aside` and mobile drawer.
- New: `src/components/layout/SidebarDrawer.tsx` — below-`lg` overlay + slide-in panel wrapping `SidebarContent`.
- New: `src/lib/utils/popoverPosition.ts` — shared helper/classes for viewport-safe dropdown width + horizontal clamp.
- Modified: `src/app/layout.tsx`, `src/components/layout/{Header,Sidebar}.tsx`, plus per-module component files listed in each task.

---

### Task 1: Viewport meta + UI store

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/stores/uiStore.ts`

**Interfaces:**
- Produces: `useUIStore` with `{ sidebarOpen: boolean; openSidebar(): void; closeSidebar(): void; toggleSidebar(): void }`.

- [ ] **Step 1: Add explicit viewport export to `layout.tsx`**

After the `metadata` export add:

```tsx
import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};
```

(Change the existing `import type { Metadata }` line to also import `Viewport`.)

- [ ] **Step 2: Create `src/stores/uiStore.ts`**

```ts
import { create } from "zustand";

interface UIStore {
  sidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: false,
  openSidebar: () => set({ sidebarOpen: true }),
  closeSidebar: () => set({ sidebarOpen: false }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
```

- [ ] **Step 3: Verify** — `npm run lint`; app boots with no console error. Commit.

```bash
git add src/app/layout.tsx src/stores/uiStore.ts
git commit -m "feat: add viewport meta and UI store for sidebar drawer"
```

---

### Task 2: Extract SidebarContent + build SidebarDrawer + Header hamburger

**Files:**
- Create: `src/components/layout/SidebarContent.tsx`
- Create: `src/components/layout/SidebarDrawer.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `useUIStore` (Task 1).
- Produces: `<SidebarContent />` (the body), `<SidebarDrawer />` (overlay), both default-exported as named exports.

- [ ] **Step 1: Extract the sidebar body into `SidebarContent.tsx`.** Move the entire JSX currently returned by `Sidebar` (everything inside the `<aside>...</aside>` in `src/components/layout/Sidebar.tsx`, lines ~135–424) and all its hooks/handlers into a new `SidebarContent` component. `SidebarContent` returns the inner content **without** the `<aside>` wrapper element and its sizing classes — just a `<div className="flex flex-col h-full overflow-hidden">` root containing the existing Gen info / Modules / Recent / Saved Teams / footer blocks and the two modals. Keep the `hasDamageCalc` early-return logic but lift it to a prop: `SidebarContent` accepts `{ onNavigate?: () => void }` (called after a Pokémon restore / team load so the drawer can close on mobile).

- [ ] **Step 2: Wire `onNavigate`.** In `SidebarContent`, call `onNavigate?.()` inside the `restoreFromRecent`, `bringModuleToFront`, and `loadTeamIntoSide` click handlers (after the existing action).

- [ ] **Step 3: Rewrite `Sidebar.tsx` to be the desktop wrapper only:**

```tsx
"use client";
import { SidebarContent } from "./SidebarContent";

export function Sidebar() {
  return (
    <aside className="w-48 bg-slate-900 border-r border-slate-800 hidden lg:flex flex-col overflow-hidden">
      <SidebarContent />
    </aside>
  );
}
```

(Note: the `p-4` that was on the `<aside>` moves into `SidebarContent`'s root as `p-4` so both desktop and drawer keep padding. Preserve the existing `hasDamageCalc` → `return null` behavior by having `SidebarContent` render null when a damage-calc module is present, same as today — the desktop `aside` then renders an empty `SidebarContent`. To avoid an empty bordered rail, keep that null check returning null from `SidebarContent` and have `Sidebar` render `<aside>` unconditionally; an empty aside is acceptable and matches prior "sidebar hidden" intent. Simplest: keep the existing null-return inside `SidebarContent`.)

- [ ] **Step 4: Create `SidebarDrawer.tsx`** — below-`lg` overlay:

```tsx
"use client";
import { useUIStore } from "@/stores/uiStore";
import { SidebarContent } from "./SidebarContent";

export function SidebarDrawer() {
  const { sidebarOpen, closeSidebar } = useUIStore();
  return (
    <div className={`lg:hidden fixed inset-0 z-50 ${sidebarOpen ? "" : "pointer-events-none"}`} aria-hidden={!sidebarOpen}>
      {/* Backdrop */}
      <div
        onClick={closeSidebar}
        className={`absolute inset-0 bg-black/60 transition-opacity ${sidebarOpen ? "opacity-100" : "opacity-0"}`}
      />
      {/* Panel */}
      <div
        className={`absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 shadow-xl transition-transform duration-200 flex flex-col ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-3 border-b border-slate-800 flex-shrink-0">
          <span className="text-sm font-semibold text-white">Menu</span>
          <button onClick={closeSidebar} className="p-2 text-slate-400 hover:text-white rounded" aria-label="Close menu">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <SidebarContent onNavigate={closeSidebar} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Render `<SidebarDrawer />` in `page.tsx`** — add it just inside the `KeyboardShortcutsProvider`, after the main layout `div` (sibling of the top-level flex container) so it overlays everything.

- [ ] **Step 6: Add the hamburger button to the mobile Header.** In `src/components/layout/Header.tsx`, inside the mobile block (`md:hidden`, ~line 86), add a hamburger as the first item of the top row that calls `useUIStore().toggleSidebar`. Also add an equivalent below-`lg` (not just below-`md`) trigger: since the sidebar is `lg:flex`, the drawer must be reachable on tablet too. Add a hamburger visible `lg:hidden` in the **desktop** header row as well (the `hidden md:flex` row) so 768–1023px gets it. Concretely:
  - In the `hidden md:flex` row, insert before the `<Link>`: a `<button className="lg:hidden ...">` hamburger.
  - In the `md:hidden` row top section, insert a hamburger button before the `GenerationSelector` container.

Hamburger markup:

```tsx
<button
  onClick={() => useUIStore.getState().toggleSidebar()}
  className="p-2 text-slate-300 hover:text-white rounded flex-shrink-0 lg:hidden"
  aria-label="Open menu"
>
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
</button>
```

(Import `useUIStore` at the top; prefer a hook call `const toggleSidebar = useUIStore((s) => s.toggleSidebar)` over `getState()`.)

- [ ] **Step 7: Verify** — At 360px and 768px: hamburger appears, opens drawer; Recent/Saved Teams/Clear Cache reachable; tapping a recent search closes the drawer and restores. At ≥1024px: no hamburger, desktop sidebar unchanged. `npm run lint`. Commit.

```bash
git add src/components/layout/ src/app/page.tsx
git commit -m "feat: sidebar drawer for mobile/tablet with header hamburger"
```

---

### Task 3: Viewport-safe popover helper + apply to GenerationSelector & AccountMenu

**Files:**
- Create: `src/lib/utils/popoverPosition.ts`
- Modify: `src/components/layout/GenerationSelector.tsx`
- Modify: `src/components/auth/AccountMenu.tsx`

**Interfaces:**
- Produces: `clampLeftToViewport(left: number, width: number, margin?: number): number` and exported class string `POPOVER_MAXW = "max-w-[calc(100vw-1rem)]"`.

- [ ] **Step 1: Create the helper:**

```ts
/** Shared sizing/positioning helpers so dropdowns never overflow narrow viewports. */
export const POPOVER_MAXW = "max-w-[calc(100vw-1rem)]";

/** Clamp a portal/fixed dropdown's left so a `width`-px panel stays fully on-screen. */
export function clampLeftToViewport(left: number, width: number, margin = 8): number {
  if (typeof window === "undefined") return left;
  const max = window.innerWidth - width - margin;
  return Math.max(margin, Math.min(left, max));
}
```

- [ ] **Step 2: GenerationSelector portal dropdown** — in `src/components/layout/GenerationSelector.tsx` where the menu position (`menuPos.left`, ~line 173) is computed for the `createPortal` fixed menu, run the left through `clampLeftToViewport(menuPos.left, MENU_WIDTH)` (use the menu's actual rendered width; if fixed, use that constant). Ensure the menu element has `POPOVER_MAXW` too.

- [ ] **Step 3: AccountMenu** — `src/components/auth/AccountMenu.tsx` line 48: the `w-60 absolute right-0` menu is right-anchored so it's safe horizontally, but add `max-w-[calc(100vw-1rem)]` so a 240px panel can't overflow on a <256px viewport.

- [ ] **Step 4: Verify** — open generation dropdown and account menu at 360px from various positions: stays on-screen. `npm run lint`. Commit.

```bash
git add src/lib/utils/popoverPosition.ts src/components/layout/GenerationSelector.tsx src/components/auth/AccountMenu.tsx
git commit -m "feat: viewport-safe popover positioning for header dropdowns"
```

---

### Task 4: Charts — TypeChart & NatureChart

**Files:**
- Modify: `src/components/type-chart/TypeChart.tsx`
- Modify: `src/components/nature-chart/NatureChart.tsx`

- [ ] **Step 1: TypeChart** — scroll is already contained in `overflow-x-auto` (good). Two small mobile tweaks in `src/components/type-chart/TypeChart.tsx`:
  - Reduce the matrix floor on small screens: change `min-w-[700px]` (line 13) to `min-w-[640px] sm:min-w-[700px]`.
  - The legend (`flex flex-wrap gap-4 mt-6 text-sm`, line 78) already wraps — leave it. No page-overflow because the table lives inside `overflow-x-auto` within the module card.

- [ ] **Step 2: NatureChart** — in `src/components/nature-chart/NatureChart.tsx`:
  - The table wrapper already has `overflow-x-auto` (line 33) — keep it (contained scroll is acceptable for the matrix).
  - Change the explanation grid `grid grid-cols-3 gap-4` (line ~113) to `grid grid-cols-1 sm:grid-cols-3 gap-4`.

- [ ] **Step 3: Verify** — Type Chart and Nature Chart modules at 360px: chart scrolls horizontally *inside its card*, page itself does not scroll horizontally; nature explanation stacks to one column. `npm run lint`. Commit.

```bash
git add src/components/type-chart/TypeChart.tsx src/components/nature-chart/NatureChart.tsx
git commit -m "fix: contain chart scroll and stack nature explanation on mobile"
```

---

### Task 5: Pokémon module — tables, stats, evolution, locations

**Files:**
- Modify: `src/components/pokemon-module/LearnsetTable.tsx`
- Modify: `src/components/pokemon-module/StatsDisplay.tsx`
- Modify: `src/components/pokemon-module/PokemonModule.tsx`
- Modify: `src/components/pokemon-module/LocationsPanel.tsx`

- [ ] **Step 1: LearnsetTable** — `src/components/pokemon-module/LearnsetTable.tsx`. The table is in `overflow-x-auto` (line 209) so scroll is contained. To reduce the need to scroll on phones, hide the two lowest-priority columns below `sm`: add `hidden sm:table-cell` to the **Acc** and **PP** `<th>` (SortHeader, ~lines 214–224) and the matching `<td>` cells in the row renderer. Keep Lv/TM, Move, Type, Cat, Pwr always visible.

- [ ] **Step 2: StatsDisplay move dropdown** — `src/components/pokemon-module/StatsDisplay.tsx` line ~608: the move dropdown uses `width: "calc(200% + 6px)"` inline + `min-w-[320px]`. Replace with viewport-safe sizing: drop the `calc(200% + 6px)` inline width, set the class to `w-[320px] max-w-[calc(100vw-1rem)]`, and add `left-0` so it anchors to the trigger's left and can't overflow the right edge on mobile. (Import `POPOVER_MAXW` is optional; inline `max-w-[calc(100vw-1rem)]` is fine.)

- [ ] **Step 3: StatsDisplay stat grid** — line ~319/343 the header + rows use `grid-cols-[56px_36px_1fr_44px_36px_40px]`. This fits ~352px tightly. Leave the column template (it fits at 360px) but ensure the wrapper doesn't overflow: confirm the stat block's container is `w-full min-w-0`. If any overflow appears at 360px in verification, change the template to `grid-cols-[48px_32px_1fr_40px_32px_36px] sm:grid-cols-[56px_36px_1fr_44px_36px_40px]`.

- [ ] **Step 4: Evolution chains** — `src/components/pokemon-module/PokemonModule.tsx`:
  - `CircularEvolution` (`grid grid-cols-3`, ~line 128): wrap the grid in a container and let it scroll if needed — add `overflow-x-auto` to its parent and `min-w-0` so it never pushes the module wider than the viewport.
  - `BranchingEvolution` (~line 215, fixed `childWidth=90` flex row): wrap the row in `overflow-x-auto` so many branches scroll within the card instead of overflowing the page.
  - Moves grid (`grid grid-cols-2`, ~line 580): change to `grid grid-cols-1 sm:grid-cols-2`.
  - Import/export modal (`w-[400px] max-w-[90vw]`, ~line 1299): change to `w-full max-w-[min(400px,90vw)]` and add `max-h-[90vh] overflow-y-auto` to the panel.

- [ ] **Step 5: LocationsPanel** — `src/components/pokemon-module/LocationsPanel.tsx` line ~288: the version/locations flex row with `min-w-[100px]`. Change the row to stack on mobile: `flex flex-col sm:flex-row` and drop the `min-w-[100px]` to `sm:min-w-[100px]`.

- [ ] **Step 6: Verify** — Search a Pokémon (e.g. with a branching evolution like Eevee, and a long learnset like Mew) at 360px: learnset shows core columns and scrolls inside the card; stats fit; move dropdown stays on-screen; evolution scrolls within the card; locations stack. `npm run lint`. Commit.

```bash
git add src/components/pokemon-module/
git commit -m "fix: mobile layout for learnset, stats, evolution, locations"
```

---

### Task 6: Damage calculator (single-calc path)

**Files:**
- Modify: `src/components/damage-calc/PokemonConfigPanel.tsx`
- Modify: `src/components/damage-calc/MoveSelector.tsx`
- Modify: `src/components/damage-calc/FieldConditions.tsx`
- Modify: `src/components/damage-calc/DamageResults.tsx`

- [ ] **Step 1: MoveSelector popover** — `src/components/damage-calc/MoveSelector.tsx` line 184: `w-full min-w-[320px]` → `w-[320px] max-w-[calc(100vw-1rem)] left-0`. The header column widths (lines 187–194) total ~200px and fit within 320px — leave them.

- [ ] **Step 2: PokemonConfigPanel popovers** — `src/components/damage-calc/PokemonConfigPanel.tsx`:
  - Move search dropdown (line ~1658): `w-full min-w-[320px]` → `w-[320px] max-w-[calc(100vw-1rem)] left-0`.
  - Item search popover (line ~1488): it's `w-full` already; add `max-w-[calc(100vw-1rem)] left-0` and keep `max-h-48`.
  - Import/export modal (line ~1801, `w-[400px] max-w-[90vw]`): → `w-full max-w-[min(400px,90vw)]` and add `max-h-[90vh] overflow-y-auto`.

- [ ] **Step 3: PokemonConfigPanel stat grid** — line ~1300 `grid-cols-[60px_36px_36px_44px_44px_36px]` (256px). Make it shrink on the smallest screens: `grid-cols-[48px_32px_32px_40px_40px_32px] sm:grid-cols-[60px_36px_36px_44px_44px_36px]`. Ensure the panel root is `min-w-0`.

- [ ] **Step 4: FieldConditions** — `src/components/damage-calc/FieldConditions.tsx`: the attacker/defender two-column sections that use `grid grid-cols-2 gap-2` (lines ~388, ~396 hazards, ~446 screens, ~479 status) → `grid grid-cols-1 sm:grid-cols-2 gap-2`. The weather/level button rows already use `flex-wrap` — leave them.

- [ ] **Step 5: DamageResults tooltip** — `src/components/damage-calc/DamageResults.tsx` InfoButton (lines ~65–84): the `fixed` tooltip computes `left` from the button rect. Clamp it with `clampLeftToViewport(left, TOOLTIP_WIDTH)` from `src/lib/utils/popoverPosition.ts` (use the tooltip's `max-w` value as width, e.g. 256 for `max-w-xs`). Add `max-w-[calc(100vw-1rem)]` to the tooltip.

- [ ] **Step 6: Verify** — Add a Damage Calculator at 360px (in-grid, single column). Configure a Pokémon: stat grid fits, move/item popovers stay on-screen, field conditions stack, results + tooltip on-screen. Confirm the desktop team-battle 3-panel still appears at ≥1200px (unchanged). `npm run lint`. Commit.

```bash
git add src/components/damage-calc/PokemonConfigPanel.tsx src/components/damage-calc/MoveSelector.tsx src/components/damage-calc/FieldConditions.tsx src/components/damage-calc/DamageResults.tsx
git commit -m "fix: mobile layout for damage calc config, popovers, field conditions"
```

---

### Task 7: Other modules — Catch Rate, Pokédex, Location, Team Builder

**Files:**
- Modify: `src/components/catch-rate-module/CatchRateCalculator.tsx`
- Modify: `src/components/pokedex-module/Pokedex.tsx`
- Modify: `src/components/location-module/LocationModule.tsx`
- Modify: `src/components/pokemon-module/TeamBuilderModule.tsx`

- [ ] **Step 1: CatchRateCalculator** — `src/components/catch-rate-module/CatchRateCalculator.tsx`: the three `grid grid-cols-2 gap-2` sections (lines ~125, ~166, ~278) → `grid grid-cols-1 sm:grid-cols-2 gap-2`. Toggle rows already use `flex-wrap` — leave.

- [ ] **Step 2: Pokédex filter bar + grid** — `src/components/pokedex-module/Pokedex.tsx`:
  - Filter bar (lines ~224–269): change the row container to `flex flex-col sm:flex-row gap-2` so name filter + type selector + toggle stack on phones.
  - Dex selector `max-w-[40%]` (line ~188): change to `max-w-full sm:max-w-[40%]` so it isn't squeezed on mobile.
  - Grid `repeat(auto-fill,minmax(90px,1fr))` (lines ~292/388): change to `repeat(auto-fill,minmax(72px,1fr))` and add a `sm:` variant restoring 90px: use a class like `[grid-template-columns:repeat(auto-fill,minmax(72px,1fr))] sm:[grid-template-columns:repeat(auto-fill,minmax(90px,1fr))]`.

- [ ] **Step 3: LocationModule** — `src/components/location-module/LocationModule.tsx`:
  - Search dropdown (line ~424) `absolute z-50 w-full max-h-[300px]`: add `max-w-[calc(100vw-1rem)]` and keep `w-full`.
  - Content min-height (line ~403) `min-h-[400px] max-h-[600px]`: change to `min-h-[260px] sm:min-h-[400px] max-h-[600px]` so it doesn't dominate a short phone viewport.

- [ ] **Step 4: TeamBuilderModule totals** — `src/components/pokemon-module/TeamBuilderModule.tsx` line ~417: the totals sidebar `w-36` in a flex row. Change its parent flex to `flex-col sm:flex-row` and the totals box to `w-full sm:w-36` so totals stack below the coverage grid on mobile.

- [ ] **Step 5: Verify** — At 360px: Catch Rate inputs stack; Pokédex filters stack and grid shows ~4 columns cleanly; Location search + list fit; Team Builder totals sit below the grid. `npm run lint`. Commit.

```bash
git add src/components/catch-rate-module/CatchRateCalculator.tsx src/components/pokedex-module/Pokedex.tsx src/components/location-module/LocationModule.tsx src/components/pokemon-module/TeamBuilderModule.tsx
git commit -m "fix: mobile layout for catch rate, pokedex, location, team builder"
```

---

### Task 8: Modal sweep + tap targets + final build

**Files:**
- Modify: `src/components/auth/AuthModal.tsx`, `src/components/auth/ResetPasswordModal.tsx`
- Modify: `src/components/layout/KeybindsModal.tsx`, `src/components/layout/ConfirmModal.tsx`
- Modify: `src/components/damage-calc/SaveTeamModal.tsx`, `src/components/damage-calc/LoadTeamDropdown.tsx`

- [ ] **Step 1: Modal height safety** — for each modal panel above, ensure the panel has `w-full max-w-* mx-4` (most already do) AND add `max-h-[90vh] overflow-y-auto` so tall modals scroll on short phones. Specifically verify/add to: `AuthModal` (line ~129), `ResetPasswordModal` (line ~53), `KeybindsModal` (line ~68), `ConfirmModal` (line ~63). `SaveTeamModal` (line ~33) and `LoadTeamDropdown` (line ~61) already cap height — confirm only.

- [ ] **Step 2: Tap targets** — bump primary action buttons to a comfortable touch height. For the Header module-add buttons mobile row (`Header.tsx` mobile block, `py-1`), change to `py-1.5`. For the drawer's primary buttons (Clear Cache) ensure `py-2`. Do **not** enlarge dense calc data-entry inputs (acceptable at current density). This is a light pass — only adjust clearly-too-small primary buttons found during verification.

- [ ] **Step 3: Full verification pass** — walk every flow at 360px and 768px per the verification gate; confirm desktop unchanged at ≥1024px. Fix any straggler overflow found.

- [ ] **Step 4: Build** — `npm run build` must succeed.

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/ src/components/layout/KeybindsModal.tsx src/components/layout/ConfirmModal.tsx src/components/damage-calc/SaveTeamModal.tsx src/components/damage-calc/LoadTeamDropdown.tsx src/components/layout/Header.tsx
git commit -m "fix: modal height safety and mobile tap targets"
```

---

## Self-review notes

- **Spec coverage:** Global chrome (Tasks 1–3), charts (4), Pokémon module (5), damage calc single-path + routing note (6 — routing already falls back at <1200px; explicit guard deemed unnecessary since the existing `showTeamPanels = … contentWidth >= 1200` gate already prevents it, so no code needed beyond verifying it in Task 6 Step 6), other modules (7), modals + tap targets (8). All spec areas mapped.
- **Popover primitive** defined in Task 3, consumed in Tasks 3/5/6 (`clampLeftToViewport`, `POPOVER_MAXW`, `max-w-[calc(100vw-1rem)]`).
- **Sidebar extraction** preserves desktop behavior incl. the `hasDamageCalc`/`fullscreen` null logic (Task 2 Step 1/3).
- No locked zoom (Task 1). Breakpoint boundary `lg` for the drawer (Tasks 1–2).
