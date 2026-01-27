"use client";

import { useState, useRef, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useModuleStore } from "@/stores/moduleStore";
import { WorkspaceTab } from "@/types/module";
import { ConfirmModal } from "./ConfirmModal";

interface SortableTabProps {
  tab: WorkspaceTab;
  isActive: boolean;
  isEditing: boolean;
  editValue: string;
  tabsCount: number;
  inputRef: React.RefObject<HTMLInputElement>;
  onSelect: () => void;
  onStartEditing: () => void;
  onFinishEditing: () => void;
  onEditChange: (value: string) => void;
  onEditKeyDown: (e: React.KeyboardEvent) => void;
  onRemove: () => void;
}

function SortableTab({
  tab,
  isActive,
  isEditing,
  editValue,
  tabsCount,
  inputRef,
  onSelect,
  onStartEditing,
  onFinishEditing,
  onEditChange,
  onEditKeyDown,
  onRemove,
}: SortableTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-1 px-3 py-1.5 rounded-t-lg text-sm font-medium transition-colors cursor-pointer ${
        isActive
          ? "bg-slate-900 text-white border-t border-x border-slate-700"
          : "bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
      } ${isDragging ? "z-50" : ""}`}
      onClick={onSelect}
      {...attributes}
      {...listeners}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          onBlur={onFinishEditing}
          onKeyDown={(e) => {
            // Stop propagation for all keys except Enter/Escape to prevent dnd-kit from capturing them
            if (e.key !== "Enter" && e.key !== "Escape") {
              e.stopPropagation();
            }
            onEditKeyDown(e);
          }}
          className="bg-transparent border-none outline-none w-20 text-white text-sm"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          onDoubleClick={(e) => {
            e.stopPropagation();
            onStartEditing();
          }}
          className="truncate max-w-[120px] select-none"
          title={tab.name}
        >
          {tab.name}
        </span>
      )}

      {tabsCount > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className={`p-0.5 rounded hover:bg-red-600/30 transition-colors ${
            isActive
              ? "text-slate-400 hover:text-red-400"
              : "text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100"
          }`}
          title="Close tab"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

export function TabBar() {
  const {
    tabs,
    activeTabId,
    addWorkspaceTab,
    requestRemoveTab,
    confirmRemoveTab,
    cancelRemoveTab,
    pendingTabRemoval,
    renameWorkspaceTab,
    setActiveWorkspaceTab,
    reorderTabs,
  } = useModuleStore();

  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pendingTab = pendingTabRemoval ? tabs.find((t) => t.id === pendingTabRemoval) : null;

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

  // Track mount state to avoid hydration mismatch with dnd-kit
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTabId]);

  const startEditing = (tabId: string, currentName: string) => {
    setEditingTabId(tabId);
    setEditValue(currentName);
  };

  const finishEditing = () => {
    if (editingTabId && editValue.trim()) {
      renameWorkspaceTab(editingTabId, editValue.trim());
    }
    setEditingTabId(null);
    setEditValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      finishEditing();
    } else if (e.key === "Escape") {
      setEditingTabId(null);
      setEditValue("");
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderTabs(active.id as string, over.id as string);
    }
  };

  // Static tab component for SSR (no drag-and-drop)
  const renderStaticTab = (tab: WorkspaceTab) => (
    <div
      key={tab.id}
      className={`group flex items-center gap-1 px-3 py-1.5 rounded-t-lg text-sm font-medium transition-colors cursor-pointer ${
        activeTabId === tab.id
          ? "bg-slate-900 text-white border-t border-x border-slate-700"
          : "bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
      }`}
      onClick={() => setActiveWorkspaceTab(tab.id)}
    >
      <span className="truncate max-w-[120px] select-none" title={tab.name}>
        {tab.name}
      </span>
      {tabs.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            requestRemoveTab(tab.id);
          }}
          className={`p-0.5 rounded hover:bg-red-600/30 transition-colors ${
            activeTabId === tab.id
              ? "text-slate-400 hover:text-red-400"
              : "text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100"
          }`}
          title="Close tab"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );

  return (
    <div className="flex items-center gap-1 px-4 py-2 bg-slate-800/50 border-b border-slate-700 overflow-x-auto">
      {isMounted ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={tabs.map((t) => t.id)}
            strategy={horizontalListSortingStrategy}
          >
            {tabs.map((tab) => (
              <SortableTab
                key={tab.id}
                tab={tab}
                isActive={activeTabId === tab.id}
                isEditing={editingTabId === tab.id}
                editValue={editValue}
                tabsCount={tabs.length}
                inputRef={inputRef}
                onSelect={() => setActiveWorkspaceTab(tab.id)}
                onStartEditing={() => startEditing(tab.id, tab.name)}
                onFinishEditing={finishEditing}
                onEditChange={setEditValue}
                onEditKeyDown={handleKeyDown}
                onRemove={() => requestRemoveTab(tab.id)}
              />
            ))}
          </SortableContext>
        </DndContext>
      ) : (
        // Render static tabs during SSR to avoid hydration mismatch
        tabs.map(renderStaticTab)
      )}

      {/* Add Tab Button */}
      <button
        onClick={addWorkspaceTab}
        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors flex-shrink-0"
        title="Add new tab"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Confirmation Modal for Tab Removal */}
      <ConfirmModal
        isOpen={pendingTabRemoval !== null}
        title="Close Tab?"
        message={`Are you sure you want to close "${pendingTab?.name || "this tab"}"? This will permanently delete all recent searches associated with this tab.`}
        confirmLabel="Close Tab"
        cancelLabel="Cancel"
        onConfirm={confirmRemoveTab}
        onCancel={cancelRemoveTab}
        variant="danger"
      />
    </div>
  );
}
