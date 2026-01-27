import { useEffect, useCallback } from "react";
import { useModuleStore } from "@/stores/moduleStore";
import { ModuleTab } from "@/types/module";

interface KeyboardShortcutsOptions {
  onOpenKeybinds?: () => void;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  const { onOpenKeybinds } = options;
  const {
    tabs,
    activeTabId,
    selectedModuleId,
    addWorkspaceTab,
    requestRemoveTab,
    addModule,
    addTypeChartModule,
    addTeamBuilderModule,
    removeModule,
    setActiveTab,
    selectModule,
    goToPreviousTab,
    goToNextTab,
  } = useModuleStore();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      // Get active tab to check module type
      const activeTab = tabs.find((t) => t.id === activeTabId);
      const selectedModule = activeTab?.modules.find((m) => m.id === selectedModuleId);
      const isPokemonModule = selectedModule?.moduleType === "pokemon";
      const modules = activeTab?.modules || [];

      const key = e.key.toLowerCase();

      // Letter shortcuts require Shift
      if (/^[a-z]$/.test(key)) {
        if (!e.shiftKey) return;

        switch (key) {
          // Global shortcuts (Shift + letter)
          case "t":
            e.preventDefault();
            addWorkspaceTab();
            break;
          case "p":
            e.preventDefault();
            addModule();
            break;
          case "c":
            e.preventDefault();
            addTypeChartModule();
            break;
          case "b":
            e.preventDefault();
            addTeamBuilderModule();
            break;
          case "x":
            e.preventDefault();
            if (tabs.length > 1) {
              requestRemoveTab(activeTabId);
            }
            break;
          case "i":
            e.preventDefault();
            onOpenKeybinds?.();
            break;

          // Selected module shortcuts (Shift + letter)
          case "w":
            if (selectedModuleId) {
              e.preventDefault();
              removeModule(selectedModuleId);
            }
            break;
          case "s":
            if (selectedModuleId && isPokemonModule) {
              e.preventDefault();
              setActiveTab(selectedModuleId, "stats" as ModuleTab);
            }
            break;
          case "a":
            if (selectedModuleId && isPokemonModule) {
              e.preventDefault();
              setActiveTab(selectedModuleId, "abilities" as ModuleTab);
            }
            break;
          case "d":
            if (selectedModuleId && isPokemonModule) {
              e.preventDefault();
              setActiveTab(selectedModuleId, "types" as ModuleTab); // "types" is the internal name for Defenses
            }
            break;
          case "m":
            if (selectedModuleId && isPokemonModule) {
              e.preventDefault();
              setActiveTab(selectedModuleId, "moves" as ModuleTab);
            }
            break;
          case "l":
            if (selectedModuleId && isPokemonModule) {
              e.preventDefault();
              setActiveTab(selectedModuleId, "locations" as ModuleTab);
            }
            break;
        }
        return;
      }

      // Non-letter shortcuts (no Shift required)
      switch (e.key) {
        // Arrow keys navigate between modules
        case "ArrowLeft":
          if (modules.length > 0 && selectedModuleId) {
            e.preventDefault();
            const currentIndex = modules.findIndex((m) => m.id === selectedModuleId);
            if (currentIndex > 0) {
              selectModule(modules[currentIndex - 1].id);
            }
          }
          break;
        case "ArrowRight":
          if (modules.length > 0 && selectedModuleId) {
            e.preventDefault();
            const currentIndex = modules.findIndex((m) => m.id === selectedModuleId);
            if (currentIndex < modules.length - 1) {
              selectModule(modules[currentIndex + 1].id);
            }
          }
          break;
        // Brackets switch tabs
        case "[":
          e.preventDefault();
          goToPreviousTab();
          break;
        case "]":
          e.preventDefault();
          goToNextTab();
          break;
      }
    },
    [
      tabs,
      activeTabId,
      selectedModuleId,
      addWorkspaceTab,
      requestRemoveTab,
      addModule,
      addTypeChartModule,
      addTeamBuilderModule,
      removeModule,
      setActiveTab,
      selectModule,
      goToPreviousTab,
      goToNextTab,
      onOpenKeybinds,
    ]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
