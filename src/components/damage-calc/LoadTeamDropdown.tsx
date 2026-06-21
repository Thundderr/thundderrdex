"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { useModuleStore } from "@/stores/moduleStore";
import { usePokemonList } from "@/hooks/usePokemonList";
import { formatPokemonName } from "@/lib/pokeapi/transformers";

interface Props {
  moduleId: string;
  side: "attacker" | "defender";
  onClose: () => void;
}

export function LoadTeamDropdown({ moduleId, side, onClose }: Props) {
  const { savedTeams, loadTeamIntoSide, deleteTeam } = useModuleStore();
  const { data: pokemonList } = usePokemonList();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pokemonSpriteMap = pokemonList
    ? new Map(pokemonList.map((p) => [p.name, p.spriteUrl]))
    : new Map<string, string>();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  if (savedTeams.length === 0) {
    return (
      <div
        ref={dropdownRef}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <div
          className="bg-slate-800 rounded-lg p-4 shadow-xl border border-slate-700 max-w-xs mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs text-slate-400">No saved teams yet. Save a team first!</p>
          <button
            onClick={onClose}
            className="mt-3 px-3 py-1.5 text-xs text-slate-300 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        ref={dropdownRef}
        className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 max-w-md w-full mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-700 flex-shrink-0">
          <h3 className="text-sm font-semibold text-white">
            Load Team → {side === "attacker" ? "My Team" : "Enemy Team"}
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {savedTeams.map((team) => {
            const pokemonInTeam = team.slots.filter(s => s !== null);
            return (
              <div
                key={team.id}
                className="flex items-center gap-2 p-2 rounded hover:bg-slate-700/50 group"
              >
                <button
                  onClick={() => {
                    loadTeamIntoSide(moduleId, side, team);
                    onClose();
                  }}
                  className="flex-1 flex items-center gap-2 text-left min-w-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{team.name}</p>
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {team.slots.map((slot, i) => {
                        if (!slot) return null;
                        const sprite = pokemonSpriteMap.get(slot.config.pokemonName || "");
                        return sprite ? (
                          <Image
                            key={i}
                            src={sprite}
                            alt=""
                            width={20}
                            height={20}
                            className="pixelated"
                            unoptimized
                          />
                        ) : (
                          <span key={i} className="w-5 h-5 bg-slate-600 rounded-full flex-shrink-0" />
                        );
                      })}
                      <span className="text-2xs text-slate-500 ml-1">{pokemonInTeam.length}/6</span>
                    </div>
                  </div>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTeam(team.id);
                  }}
                  className="p-1 hover:bg-red-600/20 rounded text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  title="Delete team"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>

        <div className="px-4 py-2 border-t border-slate-700 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full px-3 py-1.5 text-xs text-slate-300 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
