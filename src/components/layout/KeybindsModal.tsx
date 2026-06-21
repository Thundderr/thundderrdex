"use client";

import { Modal } from "@/components/ui";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const GLOBAL_SHORTCUTS = [
  { key: "Shift + T", description: "New tab" },
  { key: "Shift + X", description: "Close current tab" },
  { key: "Shift + P", description: "New Pokemon module" },
  { key: "Shift + C", description: "New Type Chart module" },
  { key: "Shift + N", description: "New Nature Chart module" },
  { key: "Shift + B", description: "New Team Coverage module" },
  { key: "Shift + E", description: "New Damage Calc module" },
  { key: "Shift + O", description: "New Location module" },
  { key: "Shift + I", description: "Show keyboard shortcuts" },
  { key: "[", description: "Previous tab" },
  { key: "]", description: "Next tab" },
  { key: "←", description: "Previous module" },
  { key: "→", description: "Next module" },
];

const MODULE_SHORTCUTS = [
  { key: "Shift + W", description: "Close selected module" },
  { key: "Shift + S", description: "Stats tab" },
  { key: "Shift + A", description: "Abilities tab" },
  { key: "Shift + D", description: "Defenses tab" },
  { key: "Shift + M", description: "Moves tab" },
  { key: "Shift + L", description: "Locations tab" },
];

function ShortcutRow({ shortcut }: { shortcut: { key: string; description: string } }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-fg-muted">{shortcut.description}</span>
      <kbd className="rounded border border-line bg-surface-hover px-2 py-1 font-mono text-xs text-fg-muted">
        {shortcut.key}
      </kbd>
    </div>
  );
}

export function KeybindsModal({ isOpen, onClose }: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy="keybinds-title" size="md" className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 id="keybinds-title" className="text-lg font-semibold text-fg">
          Keyboard Shortcuts
        </h2>
        <button
          onClick={onClose}
          aria-label="Close"
          className="rounded p-1 text-fg-subtle hover:bg-surface-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-fg-subtle">Global</h3>
          <div className="space-y-1">
            {GLOBAL_SHORTCUTS.map((s) => (
              <ShortcutRow key={s.key} shortcut={s} />
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-fg-subtle">Selected Module</h3>
          <div className="space-y-1">
            {MODULE_SHORTCUTS.map((s) => (
              <ShortcutRow key={s.key} shortcut={s} />
            ))}
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-fg-subtle">
        Click a module to select it. The selected module has a coloured outline.
      </p>
    </Modal>
  );
}
