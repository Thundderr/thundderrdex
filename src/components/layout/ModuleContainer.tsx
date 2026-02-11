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
} from "@dnd-kit/sortable";
import { useModuleStore } from "@/stores/moduleStore";
import { PokemonModule } from "@/components/pokemon-module/PokemonModule";
import { TypeChartModule } from "@/components/pokemon-module/TypeChartModule";
import { NatureChartModule } from "@/components/pokemon-module/NatureChartModule";
import { TeamBuilderModule } from "@/components/pokemon-module/TeamBuilderModule";
import { DamageCalcModule } from "@/components/damage-calc/DamageCalcModule";
import { LocationModule } from "@/components/location-module/LocationModule";
import { PokedexModule } from "@/components/pokedex-module/PokedexModule";

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
  );
}
