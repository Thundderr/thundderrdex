"use client";

import { useState, useEffect } from "react";
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
import { PokemonModule as PokemonModuleType } from "@/types/module";

export function ModuleContainer() {
  const { modules, reorderModules } = useModuleStore();
  const [isMounted, setIsMounted] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 grid-flow-row-dense">
          {modules.map((module) => {
            if (module.moduleType === "type-chart") {
              return <TypeChartModule key={module.id} module={module} />;
            }
            return <PokemonModule key={module.id} module={module} />;
          })}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activeModule ? (
          activeModule.moduleType === "type-chart" ? (
            <TypeChartModule module={activeModule} isOverlay />
          ) : (
            <PokemonModule module={activeModule} isOverlay />
          )
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
