"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useModuleStore } from "@/stores/moduleStore";
import { PokemonModule } from "@/types/module";
import { TypeChart } from "@/components/type-chart/TypeChart";

interface Props {
  module: PokemonModule;
  isOverlay?: boolean;
}

export function TypeChartModule({ module, isOverlay = false }: Props) {
  const { toggleMinimize, removeModule } = useModuleStore();

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`md:col-span-2 xl:col-span-2 bg-slate-900 rounded-lg border border-slate-700 shadow-lg overflow-hidden ${
        isDragging ? "ring-2 ring-blue-500" : ""
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
          Type Chart
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => toggleMinimize(module.id)}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
            title={module.isMinimized ? "Expand" : "Minimize"}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {module.isMinimized ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 12H4"
                />
              )}
            </svg>
          </button>
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
      </div>

      {/* Content */}
      {!module.isMinimized && (
        <div className="p-4 min-h-[600px]">
          <TypeChart />
        </div>
      )}
    </div>
  );
}
