"use client";

import { useRef, useEffect, ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useModuleStore } from "@/stores/moduleStore";
import { AnyModule } from "@/types/module";
import { ModuleResizeHandle, moduleSizeStyle, moduleSizeClasses } from "@/components/layout/ModuleResizeHandle";

interface Props {
  module: AnyModule;
  isOverlay?: boolean;
  /** Header title area (rendered after the drag grip). */
  title: ReactNode;
  /** Extra controls placed just before the standard minimize/fullscreen/close cluster. */
  headerControls?: ReactNode;
  /** Show the fullscreen toggle. Only enable where a fullscreen rendering exists. */
  fullscreenable?: boolean;
  /** Extra classes for the root element (col-span, max-height, flex, etc.). */
  className?: string;
  /** Classes for the body wrapper. */
  bodyClassName?: string;
  children: ReactNode;
}

function IconButton({
  onClick,
  label,
  danger,
  children,
}: {
  onClick: (e: React.MouseEvent) => void;
  label: string;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`rounded p-1 text-fg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        danger ? "hover:bg-red-600/20 hover:text-red-400" : "hover:bg-surface-hover hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Shared chrome for every dashboard module: drag-sortable root, selection ring,
 * auto-scroll-on-create, the grip header, a consistent control cluster
 * (minimize / optional fullscreen / close), and the resize handle. Replaces the
 * root + header markup that was copy-pasted across eight module files (which is
 * why fullscreen and minimize had drifted to being supported in only some).
 */
export function ModuleShell({
  module,
  isOverlay = false,
  title,
  headerControls,
  fullscreenable = false,
  className = "",
  bodyClassName = "",
  children,
}: Props) {
  const { removeModule, selectedModuleId, selectModule, newlyCreatedModuleId, clearNewlyCreatedModule, toggleMinimize, toggleFullscreen } =
    useModuleStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const isSelected = selectedModuleId === module.id;
  const isMinimized = module.isMinimized;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: module.id,
    disabled: isOverlay,
  });

  const style = isOverlay
    ? { opacity: 0.95 }
    : { transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0 : 1 };

  useEffect(() => {
    if (newlyCreatedModuleId === module.id && !isOverlay) {
      clearNewlyCreatedModule();
      setTimeout(() => {
        containerRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 50);
    }
  }, [newlyCreatedModuleId, module.id, isOverlay, clearNewlyCreatedModule]);

  const setRefs = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
  };

  // When minimized, collapse to just the header: drop the custom height so the
  // root auto-sizes, and skip the body + resize handle.
  const sizeStyle = isMinimized ? {} : moduleSizeStyle(module);
  const sizeClasses = isMinimized ? "relative" : moduleSizeClasses(module);

  return (
    <div
      ref={setRefs}
      style={{ ...style, ...sizeStyle }}
      data-module-root
      onClick={() => selectModule(module.id)}
      className={`bg-surface rounded-lg border shadow-lg overflow-hidden ${sizeClasses} ${
        isDragging ? "ring-2 ring-accent border-line" : isSelected ? "ring-2 ring-accent border-accent" : "border-line"
      } ${className}`}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-2 bg-surface-raised border-b border-line">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing rounded p-1 text-fg-subtle hover:bg-surface-hover hover:text-fg"
          aria-label="Drag to reorder"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </div>

        <div className="min-w-0 flex-1 truncate text-sm font-medium text-fg">{title}</div>

        <div className="flex flex-shrink-0 items-center gap-1">
          {headerControls}
          <IconButton
            label={isMinimized ? "Expand module" : "Minimize module"}
            onClick={(e) => {
              e.stopPropagation();
              toggleMinimize(module.id);
            }}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={isMinimized ? "M19 9l-7 7-7-7" : "M5 15l7-7 7 7"}
              />
            </svg>
          </IconButton>
          {fullscreenable && (
            <IconButton
              label="Fullscreen"
              onClick={(e) => {
                e.stopPropagation();
                toggleFullscreen(module.id);
              }}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4" />
              </svg>
            </IconButton>
          )}
          <IconButton
            label="Close module"
            danger
            onClick={(e) => {
              e.stopPropagation();
              removeModule(module.id);
            }}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </IconButton>
        </div>
      </div>

      {!isMinimized && <div className={bodyClassName}>{children}</div>}

      {!isOverlay && !isMinimized && <ModuleResizeHandle moduleId={module.id} />}
    </div>
  );
}
