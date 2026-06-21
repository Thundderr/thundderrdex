"use client";

import { useState } from "react";
import { useModuleStore } from "@/stores/moduleStore";
import { TeamBattleSlot } from "@/types/module";
import { Modal } from "@/components/ui";

interface Props {
  slots: (TeamBattleSlot | null)[];
  onClose: () => void;
}

export function SaveTeamModal({ slots, onClose }: Props) {
  const { saveTeam, savedTeams } = useModuleStore();
  const [name, setName] = useState("");

  const trimmed = name.trim();
  const isDuplicate = trimmed.length > 0 && savedTeams.some(t => t.name.toLowerCase() === trimmed.toLowerCase());

  const handleSave = () => {
    if (!trimmed || isDuplicate) return;
    saveTeam(trimmed, slots);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
  };

  return (
    <Modal isOpen onClose={onClose} labelledBy="save-team-title" size="sm" className="p-4">
      <h3 id="save-team-title" className="mb-3 text-sm font-semibold text-fg">Save Team</h3>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Team name..."
        className="w-full rounded border border-line bg-surface px-3 py-2 text-sm text-fg placeholder-fg-subtle focus:border-accent focus:outline-none"
        autoFocus
        maxLength={50}
      />
      {isDuplicate && (
        <p className="mt-1.5 text-2xs text-red-400">A team with this name already exists.</p>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded bg-surface-hover px-3 py-1.5 text-xs text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!trimmed || isDuplicate}
          className="rounded bg-accent px-3 py-1.5 text-xs text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Save
        </button>
      </div>
    </Modal>
  );
}
