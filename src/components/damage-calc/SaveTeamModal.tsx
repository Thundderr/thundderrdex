"use client";

import { useState } from "react";
import { useModuleStore } from "@/stores/moduleStore";
import { TeamBattleSlot } from "@/types/module";

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
    if (e.key === "Escape") onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-slate-800 rounded-lg p-4 max-w-sm mx-4 shadow-xl border border-slate-700 w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-white mb-3">Save Team</h3>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Team name..."
          className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          autoFocus
          maxLength={50}
        />
        {isDuplicate && (
          <p className="text-[11px] text-red-400 mt-1.5">A team with this name already exists.</p>
        )}
        <div className="flex gap-2 mt-3 justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!trimmed || isDuplicate}
            className="px-3 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
