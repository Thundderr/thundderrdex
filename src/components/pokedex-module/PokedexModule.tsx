"use client";

import { useModuleStore } from "@/stores/moduleStore";
import { PokedexModule as PokedexModuleType } from "@/types/module";
import { Pokedex } from "./Pokedex";
import { ModuleShell } from "@/components/layout/ModuleShell";

interface Props {
  module: PokedexModuleType;
  isOverlay?: boolean;
  isFullscreen?: boolean;
}

export function PokedexModule({ module, isOverlay = false, isFullscreen = false }: Props) {
  const toggleFullscreen = useModuleStore((s) => s.toggleFullscreen);
  const removeModule = useModuleStore((s) => s.removeModule);

  const body = <Pokedex moduleId={module.id} selectedDexId={module.selectedDexId} />;

  // Fullscreen is rendered by FullscreenOverlay with its own chrome (no drag
  // grip, sortable, or resize handle), so it doesn't go through ModuleShell.
  if (isFullscreen) {
    return (
      <div data-module-root className="flex h-full flex-col overflow-hidden bg-surface">
        <div className="flex shrink-0 items-center justify-between border-b border-line bg-surface-raised px-3 py-2">
          <div className="min-w-0 flex-1 truncate text-sm font-medium text-fg">Pokedex</div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); toggleFullscreen(module.id); }}
              aria-label="Exit fullscreen"
              title="Exit fullscreen"
              className="rounded p-1 text-fg-subtle hover:bg-surface-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0v4m0-4h4m6 6l5 5m0 0v-4m0 4h-4" />
              </svg>
            </button>
            <button
              onClick={() => removeModule(module.id)}
              aria-label="Close module"
              title="Close module"
              className="rounded p-1 text-fg-subtle hover:bg-red-600/20 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col p-4">{body}</div>
      </div>
    );
  }

  return (
    <ModuleShell
      module={module}
      isOverlay={isOverlay}
      title="Pokedex"
      fullscreenable
      className={`col-span-1 md:col-span-2 flex flex-col ${module.customHeight ? "" : "max-h-[calc(100vh-9.5rem)]"}`}
      bodyClassName="flex min-h-0 flex-1 flex-col p-4"
    >
      {body}
    </ModuleShell>
  );
}
