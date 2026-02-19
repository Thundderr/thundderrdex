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
import { AnyModule } from "@/types/module";
import { DamageCalcModule as DamageCalcModuleType, PokedexModule as PokedexModuleType } from "@/types/module";
import { TeamBattlePanel } from "@/components/damage-calc/TeamBattlePanel";
import { FullscreenDamageCalc } from "@/components/damage-calc/FullscreenDamageCalc";

// Hidden placeholder to keep dnd-kit sortable position tracking intact
// while a module is rendered in the fullscreen overlay
function HiddenSortablePlaceholder({ id }: { id: string }) {
  const { setNodeRef } = useSortable({ id, disabled: true });
  return <div ref={setNodeRef} className="hidden" />;
}

// Fullscreen overlay that renders a module at full viewport size
function FullscreenOverlay({ module }: { module: AnyModule }) {
  const { toggleFullscreen, initTeamBattle } = useModuleStore();
  const [contentWidth, setContentWidth] = useState(0);
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
      setContentWidth(el.clientWidth);
      setContainerDims({ width: el.clientWidth, height: el.clientHeight });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const dmgModule = module.moduleType === "damage-calc" ? module as DamageCalcModuleType : null;
  const hasTeams = dmgModule?.attackerTeam && dmgModule?.defenderTeam;
  const showTeamPanels = hasTeams && contentWidth >= 1200;
  const isSwapped = dmgModule?.isSwapped ?? false;

  // Design dimensions: left panel (840) + center (600) + right panel (840) = 2280px
  const DESIGN_WIDTH = 2280;
  const scale = showTeamPanels && containerDims.width > 0
    ? Math.min(1, containerDims.width / DESIGN_WIDTH)
    : 1;

  return (
    <div ref={overlayRef} className="absolute inset-0 z-10 bg-slate-900 overflow-hidden">
      {module.moduleType === "damage-calc" && dmgModule && (
        showTeamPanels ? (
          // Team battle layout: [6 Pokemon] | [Damage Calc] | [6 Pokemon]
          // Scaled to fit screen while maintaining proportions
          <div
            style={{
              width: `${DESIGN_WIDTH}px`,
              height: `${containerDims.height / scale}px`,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
            className="flex"
          >
            <div className="w-[840px] flex-shrink-0 border-r border-slate-700">
              <TeamBattlePanel moduleId={module.id} side="attacker" team={dmgModule.attackerTeam!} isAttackerSide={!isSwapped} />
            </div>
            <div className="w-[600px] flex-shrink-0 overflow-y-auto">
              <FullscreenDamageCalc module={dmgModule} />
            </div>
            <div className="w-[840px] flex-shrink-0 border-l border-slate-700">
              <TeamBattlePanel moduleId={module.id} side="defender" team={dmgModule.defenderTeam!} isAttackerSide={isSwapped} />
            </div>
          </div>
        ) : (
          // Standard fullscreen layout (narrow screen or teams not initialized)
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
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-400">
        <p className="text-lg mb-4">No modules yet</p>
        <p className="text-sm">Click &quot;+ Pokemon&quot; or &quot;+ Type Chart&quot; to get started</p>
      </div>
    );
  }

  return (
    <>
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
              if (module.moduleType === "type-chart") {
                return <TypeChartModule key={module.id} module={module} />;
              }
              if (module.moduleType === "nature-chart") {
                return <NatureChartModule key={module.id} module={module} />;
              }
              if (module.moduleType === "team-builder") {
                return <TeamBuilderModule key={module.id} module={module} />;
              }
              if (module.moduleType === "damage-calc") {
                return <DamageCalcModule key={module.id} module={module} />;
              }
              if (module.moduleType === "location") {
                return <LocationModule key={module.id} module={module} />;
              }
              if (module.moduleType === "pokedex") {
                return <PokedexModule key={module.id} module={module} />;
              }
              return <PokemonModule key={module.id} module={module} />;
            })}
          </div>
        </SortableContext>
        <DragOverlay dropAnimation={null}>
          {activeModule ? (
            activeModule.moduleType === "type-chart" ? (
              <TypeChartModule module={activeModule} isOverlay />
            ) : activeModule.moduleType === "nature-chart" ? (
              <NatureChartModule module={activeModule} isOverlay />
            ) : activeModule.moduleType === "team-builder" ? (
              <TeamBuilderModule module={activeModule} isOverlay />
            ) : activeModule.moduleType === "damage-calc" ? (
              <DamageCalcModule module={activeModule} isOverlay />
            ) : activeModule.moduleType === "location" ? (
              <LocationModule module={activeModule} isOverlay />
            ) : activeModule.moduleType === "pokedex" ? (
              <PokedexModule module={activeModule} isOverlay />
            ) : (
              <PokemonModule module={activeModule} isOverlay />
            )
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Fullscreen overlay - rendered outside DndContext */}
      {fullscreenModule && <FullscreenOverlay module={fullscreenModule} />}
    </>
  );
}
