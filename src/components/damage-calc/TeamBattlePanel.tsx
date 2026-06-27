"use client";

import { useState } from "react";
import { useModuleStore } from "@/stores/moduleStore";
import { TeamBattleTeam } from "@/types/module";
import { TeamBattleSlotCard } from "./TeamBattleSlotCard";
import { SaveTeamModal } from "./SaveTeamModal";
import { LoadTeamDropdown } from "./LoadTeamDropdown";

interface Props {
  moduleId: string;
  side: "attacker" | "defender";
  team: TeamBattleTeam;
  isAttackerSide: boolean;
}

export function TeamBattlePanel({ moduleId, side, team, isAttackerSide }: Props) {
  const { selectTeamBattleSlot, overwriteTeam, savedTeams } = useModuleStore();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadDropdown, setShowLoadDropdown] = useState(false);

  const handleSelect = (slotIndex: number) => {
    selectTeamBattleSlot(moduleId, side, slotIndex);
  };

  const hasAnyPokemon = team.slots.some(s => s !== null);
  const loadedTeam = team.loadedFromTeamId ? savedTeams.find(t => t.id === team.loadedFromTeamId) : null;

  return (
    <div className="@container h-full flex flex-col bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-slate-800 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          {side === "attacker" ? (
            <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          )}
          <span className="text-xs font-medium text-white">
            {side === "attacker" ? "My Team" : "Enemy Team"}
          </span>
          <span className="text-[10px] text-slate-500">
            {team.slots.filter(s => s !== null).length}/6
          </span>
          <span className={`text-2xs font-bold px-1.5 py-0.5 rounded ${
            isAttackerSide ? "bg-red-600/30 text-red-300" : "bg-blue-600/30 text-blue-300"
          }`}>
            {isAttackerSide ? "ATK" : "DEF"}
          </span>
        </div>

        {/* Save/Overwrite/Load buttons */}
        <div className="flex gap-1">
          <button
            onClick={() => setShowSaveModal(true)}
            disabled={!hasAnyPokemon}
            className="px-2 py-0.5 text-[10px] bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 rounded transition-colors"
          >
            Save
          </button>
          {loadedTeam && (
            <button
              onClick={() => overwriteTeam(loadedTeam.id, team.slots)}
              disabled={!hasAnyPokemon}
              className="px-2 py-0.5 text-[10px] bg-amber-700/60 hover:bg-amber-600/60 disabled:opacity-40 disabled:cursor-not-allowed text-amber-200 rounded transition-colors"
              title={`Overwrite "${loadedTeam.name}"`}
            >
              Overwrite
            </button>
          )}
          <button
            onClick={() => setShowLoadDropdown(!showLoadDropdown)}
            className="px-2 py-0.5 text-[10px] bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
          >
            Load
          </button>
        </div>
      </div>

      {/* Slot cards — distributed evenly, no scrolling */}
      <div className="flex-1 flex flex-col gap-1 p-1.5 min-h-0">
        {team.slots.map((slot, index) => (
          <div key={index} className="flex-1 min-h-0">
            <TeamBattleSlotCard
              moduleId={moduleId}
              side={side}
              slotIndex={index}
              slot={slot}
              isActive={team.activeSlotIndex === index}
              isAttackerSide={isAttackerSide}
              onSelect={() => handleSelect(index)}
            />
          </div>
        ))}
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <SaveTeamModal
          slots={team.slots}
          onClose={() => setShowSaveModal(false)}
        />
      )}

      {/* Load Dropdown */}
      {showLoadDropdown && (
        <LoadTeamDropdown
          moduleId={moduleId}
          side={side}
          onClose={() => setShowLoadDropdown(false)}
        />
      )}
    </div>
  );
}
