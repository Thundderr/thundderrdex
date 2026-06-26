"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { useModuleStore } from "@/stores/moduleStore";
import { PokemonModule } from "@/components/pokemon-module/PokemonModule";
import { TypeChartModule } from "@/components/pokemon-module/TypeChartModule";
import { NatureChartModule } from "@/components/pokemon-module/NatureChartModule";
import { TeamBuilderModule } from "@/components/pokemon-module/TeamBuilderModule";
import { DamageCalcModule } from "@/components/damage-calc/DamageCalcModule";
import { LocationModule } from "@/components/location-module/LocationModule";
import { PokedexModule } from "@/components/pokedex-module/PokedexModule";
import { CatchRateModule } from "@/components/catch-rate-module/CatchRateModule";
import { TrainingModule } from "@/components/training-module/TrainingModule";
import { AnyModule } from "@/types/module";
import { DamageCalcModule as DamageCalcModuleType, PokedexModule as PokedexModuleType } from "@/types/module";
import { TeamBattlePanel } from "@/components/damage-calc/TeamBattlePanel";
import { FullscreenDamageCalc } from "@/components/damage-calc/FullscreenDamageCalc";
import { ErrorBoundary } from "@/components/ui";
import { EmptyDashboard } from "@/components/layout/EmptyDashboard";
import { DashboardHint } from "@/components/layout/DashboardHint";

/** Single dispatch from module type to component, shared by the grid and the drag overlay. */
function renderModule(module: AnyModule, isOverlay = false) {
  switch (module.moduleType) {
    case "type-chart":
      return <TypeChartModule module={module} isOverlay={isOverlay} />;
    case "nature-chart":
      return <NatureChartModule module={module} isOverlay={isOverlay} />;
    case "team-builder":
      return <TeamBuilderModule module={module} isOverlay={isOverlay} />;
    case "damage-calc":
      return <DamageCalcModule module={module} isOverlay={isOverlay} />;
    case "location":
      return <LocationModule module={module} isOverlay={isOverlay} />;
    case "pokedex":
      return <PokedexModule module={module} isOverlay={isOverlay} />;
    case "catch-rate":
      return <CatchRateModule module={module} isOverlay={isOverlay} />;
    case "training":
      return <TrainingModule module={module} isOverlay={isOverlay} />;
    default:
      return <PokemonModule module={module} isOverlay={isOverlay} />;
  }
}

// Hidden placeholder to keep dnd-kit sortable position tracking intact
// while a module is rendered in the fullscreen overlay
function HiddenSortablePlaceholder({ id }: { id: string }) {
  const { setNodeRef } = useSortable({ id, disabled: true });
  return <div ref={setNodeRef} className="hidden" />;
}

// Fullscreen overlay that renders a module at full viewport size
function FullscreenOverlay({ module }: { module: AnyModule }) {
  const { toggleFullscreen, initTeamBattle } = useModuleStore();
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        toggleFullscreen(module.id);
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [module.id, toggleFullscreen]);

  // Initialize team battle data for damage calc modules
  useEffect(() => {
    if (module.moduleType === "damage-calc") {
      initTeamBattle(module.id);
    }
  }, [module.id, module.moduleType, initTeamBattle]);

  // Track container dimensions for responsive scaling
  const [containerDims, setContainerDims] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const update = () => {
      setContainerDims({ width: el.clientWidth, height: el.clientHeight });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const dmgModule = module.moduleType === "damage-calc" ? module as DamageCalcModuleType : null;
  const hasTeams = dmgModule?.attackerTeam && dmgModule?.defenderTeam;
  const isSwapped = dmgModule?.isSwapped ?? false;

  // Below this width the three columns stack vertically (the page scrolls)
  // instead of sitting side by side. Replaces the old approach of CSS-scaling a
  // fixed 2280px design down to fit — which shrank the already-tiny stat inputs
  // to ~6px — and the hard 1200px gate that silently dropped teams entirely.
  const stacked = containerDims.width > 0 && containerDims.width < 1280;

  return (
    <div ref={overlayRef} className="absolute inset-0 z-10 bg-surface overflow-hidden">
      {module.moduleType === "damage-calc" && dmgModule && (
        hasTeams ? (
          // Team battle: [team] · [calc] · [team] — a flex row on wide screens,
          // stacked and scrollable on narrow ones. No transform scaling, so text
          // and inputs keep their real (readable) size at every width.
          <div className={`h-full w-full ${stacked ? "flex flex-col overflow-y-auto" : "flex"}`}>
            <div className={stacked ? "border-b border-line" : "flex-1 min-w-0 overflow-y-auto border-r border-line"}>
              <TeamBattlePanel moduleId={module.id} side="attacker" team={dmgModule.attackerTeam!} isAttackerSide={!isSwapped} />
            </div>
            <div className={stacked ? "border-b border-line" : "w-[600px] flex-shrink-0 overflow-y-auto"}>
              <FullscreenDamageCalc module={dmgModule} />
            </div>
            <div className={stacked ? "" : "flex-1 min-w-0 overflow-y-auto border-l border-line"}>
              <TeamBattlePanel moduleId={module.id} side="defender" team={dmgModule.defenderTeam!} isAttackerSide={isSwapped} />
            </div>
          </div>
        ) : (
          // Shown only briefly before team data initializes.
          <div className="h-full max-w-[990px] mx-auto">
            <DamageCalcModule module={dmgModule} isFullscreen />
          </div>
        )
      )}
      {module.moduleType === "pokedex" && (
        <PokedexModule module={module as PokedexModuleType} isFullscreen />
      )}
    </div>
  );
}

export function ModuleContainer() {
  const { tabs, activeTabId, reorderModules } = useModuleStore();
  const [isMounted, setIsMounted] = useState(false);
  const [, setResizeKey] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);

  // Get modules from active tab
  const modules = useMemo(() => {
    const activeTab = tabs.find((t) => t.id === activeTabId);
    return activeTab?.modules || [];
  }, [tabs, activeTabId]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Find fullscreen module (if any)
  const fullscreenModule = useMemo(
    () => modules.find((m) => m.isFullscreen),
    [modules]
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Force re-render on resize and screen changes
  const forceUpdate = useCallback(() => setResizeKey((k) => k + 1), []);

  useEffect(() => {
    // Window resize
    window.addEventListener("resize", forceUpdate);

    // ResizeObserver for container size changes
    const resizeObserver = new ResizeObserver(forceUpdate);
    if (gridRef.current) {
      resizeObserver.observe(gridRef.current);
    }

    // Monitor device pixel ratio changes (detects monitor switch)
    const mediaQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    mediaQuery.addEventListener("change", forceUpdate);

    return () => {
      window.removeEventListener("resize", forceUpdate);
      resizeObserver.disconnect();
      mediaQuery.removeEventListener("change", forceUpdate);
    };
  }, [forceUpdate]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (over && active.id !== over.id) {
      reorderModules(active.id as string, over.id as string);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  // Find the active module for the overlay
  const activeModule = activeId ? modules.find((m) => m.id === activeId) : null;

  // Avoid hydration mismatch - only render after client mount
  if (!isMounted) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (modules.length === 0) {
    return <EmptyDashboard />;
  }

  return (
    <>
      <DashboardHint />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={modules.map((m) => m.id)}
          strategy={rectSortingStrategy}
        >
          <div ref={gridRef} className="grid gap-4 grid-flow-row-dense grid-cols-1 md:[grid-template-columns:repeat(auto-fill,minmax(330px,1fr))]">
            {modules.map((module) => {
              // Fullscreen module gets a hidden placeholder to preserve dnd-kit ordering
              if (module.isFullscreen) {
                return <HiddenSortablePlaceholder key={module.id} id={module.id} />;
              }
              // Each module is isolated so one crash can't take down the others or
              // the whole app. ErrorBoundary renders children inline when healthy,
              // so the module keeps its own grid/col-span root.
              return (
                <ErrorBoundary key={module.id} fallback={(error, reset) => (
                  <div role="alert" className="col-span-1 md:col-span-2 flex flex-col items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-surface p-4 text-center">
                    <p className="text-sm font-medium text-fg-muted">This module hit an error.</p>
                    <p className="max-w-xs text-2xs text-fg-subtle">{error.message}</p>
                    <button onClick={reset} className="rounded bg-surface-raised px-2.5 py-1 text-xs text-fg-muted hover:bg-surface-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Try again</button>
                  </div>
                )}>
                  {renderModule(module)}
                </ErrorBoundary>
              );
            })}
          </div>
        </SortableContext>
        <DragOverlay dropAnimation={null}>
          {activeModule ? renderModule(activeModule, true) : null}
        </DragOverlay>
      </DndContext>

      {/* Fullscreen overlay - rendered outside DndContext */}
      {fullscreenModule && <FullscreenOverlay module={fullscreenModule} />}
    </>
  );
}
