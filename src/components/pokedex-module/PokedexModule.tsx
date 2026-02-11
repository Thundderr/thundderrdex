"use client";

import { useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useModuleStore } from "@/stores/moduleStore";
import { PokedexModule as PokedexModuleType } from "@/types/module";
import { Pokedex } from "./Pokedex";

interface Props {
  module: PokedexModuleType;
  isOverlay?: boolean;
}

export function PokedexModule({ module, isOverlay = false }: Props) {
  const { toggleMinimize, removeModule, selectedModuleId, selectModule, newlyCreatedModuleId, clearNewlyCreatedModule } = useModuleStore();
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

  useEffect(() => {
    if (newlyCreatedModuleId === module.id && !isOverlay) {
      clearNewlyCreatedModule();
      setTimeout(() => {
        moduleContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 50);
    }
  }, [newlyCreatedModuleId, module.id, isOverlay, clearNewlyCreatedModule]);

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
          Pokedex
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
        <div className="p-4">
          <Pokedex />
        </div>
      )}
    </div>
  );
}
