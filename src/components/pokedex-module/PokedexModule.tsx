"use client";

import { useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useModuleStore } from "@/stores/moduleStore";
import { PokedexModule as PokedexModuleType } from "@/types/module";
import { Pokedex } from "./Pokedex";
import { ModuleResizeHandle, moduleSizeStyle, moduleSizeClasses } from "@/components/layout/ModuleResizeHandle";

interface Props {
  module: PokedexModuleType;
  isOverlay?: boolean;
  isFullscreen?: boolean;
}

export function PokedexModule({ module, isOverlay = false, isFullscreen = false }: Props) {
  const { removeModule, selectedModuleId, selectModule, newlyCreatedModuleId, clearNewlyCreatedModule, toggleFullscreen } = useModuleStore();
  const moduleContainerRef = useRef<HTMLDivElement>(null);
  const isSelected = selectedModuleId === module.id;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id, disabled: isOverlay || isFullscreen });

  const style = isOverlay
    ? { opacity: 0.95 }
    : isFullscreen
      ? {}
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
      style={isFullscreen ? style : { ...style, ...moduleSizeStyle(module) }}
      data-module-root
      onClick={() => selectModule(module.id)}
      className={`${isFullscreen ? "h-full" : `col-span-1 md:col-span-2 rounded-lg ${moduleSizeClasses(module)} ${module.customHeight ? "" : "max-h-[calc(100vh-9.5rem)]"}`} flex flex-col bg-slate-900 border shadow-lg overflow-hidden ${
        isDragging ? "ring-2 ring-blue-500 border-slate-700" : ""
      } ${
        isSelected && !isDragging && !isFullscreen ? "ring-2 ring-blue-500 border-blue-500" : "border-slate-700"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700 shrink-0">
        {/* Drag Handle - hidden in fullscreen */}
        {!isFullscreen && (
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
        )}

        <div className="flex-1 mx-2 text-sm font-medium text-white truncate">
          Pokedex
        </div>

        <div className="flex items-center gap-1">
          {/* Fullscreen Toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); toggleFullscreen(module.id); }}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isFullscreen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0v4m0-4h4m6 6l5 5m0 0v-4m0 4h-4" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              )}
            </svg>
          </button>

          {/* Close Button */}
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

      {/* Content — flex-1 + min-h-0 lets the inner grid scroll instead of
          growing the module to fit every Pokemon */}
      <div className="p-4 flex-1 min-h-0 flex flex-col">
        <Pokedex moduleId={module.id} selectedDexId={module.selectedDexId} />
      </div>

      {!isOverlay && !isFullscreen && <ModuleResizeHandle moduleId={module.id} />}
    </div>
  );
}
