"use client";

import { useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useModuleStore } from "@/stores/moduleStore";
import { PokemonModule } from "@/types/module";
import { NatureChart } from "@/components/nature-chart/NatureChart";

interface Props {
  module: PokemonModule;
  isOverlay?: boolean;
}

export function NatureChartModule({ module, isOverlay = false }: Props) {
  const { removeModule, selectedModuleId, selectModule, newlyCreatedModuleId, clearNewlyCreatedModule } = useModuleStore();
  const moduleContainerRef = useRef<HTMLDivElement>(null);
  const isSelected = selectedModuleId === module.id;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id, disabled: isOverlay });

  const style = isOverlay
    ? { opacity: 0.95 }
    : {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1,
      };

  // Auto-scroll for newly created modules
  useEffect(() => {
    if (newlyCreatedModuleId === module.id && !isOverlay) {
      clearNewlyCreatedModule();
      setTimeout(() => {
        moduleContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 50);
    }
  }, [newlyCreatedModuleId, module.id, isOverlay, clearNewlyCreatedModule]);

  // Combine refs for both dnd-kit and scroll functionality
  const setRefs = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    (moduleContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
  };

  return (
    <div
      ref={setRefs}
      style={style}
      onClick={() => selectModule(module.id)}
      className={`col-span-1 md:col-span-2 bg-slate-900 rounded-lg border shadow-lg overflow-hidden ${
        isDragging ? "ring-2 ring-blue-500 border-slate-700" : ""
      } ${
        isSelected && !isDragging ? "ring-2 ring-blue-500 border-blue-500" : "border-slate-700"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-700 rounded"
        >
          <svg
            className="w-4 h-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8h16M4 16h16"
            />
          </svg>
        </div>

        <div className="flex-1 mx-2 text-sm font-medium text-white truncate">
          Nature Chart
        </div>

        <button
          onClick={() => removeModule(module.id)}
          className="p-1 hover:bg-red-600/20 rounded text-slate-400 hover:text-red-400"
          title="Remove module"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <NatureChart />
      </div>
    </div>
  );
}
