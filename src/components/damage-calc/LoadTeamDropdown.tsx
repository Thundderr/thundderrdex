"use client";

import Image from "next/image";
import { useModuleStore } from "@/stores/moduleStore";
import { usePokemonList } from "@/hooks/usePokemonList";
import { formatPokemonName } from "@/lib/pokeapi/transformers";
import { Modal } from "@/components/ui";

interface Props {
  moduleId: string;
  side: "attacker" | "defender";
  onClose: () => void;
}

export function LoadTeamDropdown({ moduleId, side, onClose }: Props) {
  const { savedTeams, loadTeamIntoSide, deleteTeam } = useModuleStore();
  const { data: pokemonList } = usePokemonList();

  const pokemonSpriteMap = pokemonList
    ? new Map(pokemonList.map((p) => [p.name, p.spriteUrl]))
    : new Map<string, string>();

  if (savedTeams.length === 0) {
    return (
      <Modal isOpen onClose={onClose} label="Load team" size="sm" className="p-4">
        <p className="text-xs text-fg-subtle">No saved teams yet. Save a team first!</p>
        <button
          onClick={onClose}
          className="mt-3 px-3 py-1.5 text-xs text-fg-muted bg-surface-hover hover:bg-line rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Close
        </button>
      </Modal>
    );
  }

  return (
    <Modal isOpen onClose={onClose} labelledBy="load-team-title" size="md" className="flex flex-col">
        <div className="px-4 py-3 border-b border-line flex-shrink-0">
          <h3 id="load-team-title" className="text-sm font-semibold text-fg">
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
                  className="p-1 hover:bg-red-600/20 rounded text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 touch-always-visible transition-opacity flex-shrink-0"
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

        <div className="px-4 py-2 border-t border-line flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full px-3 py-1.5 text-xs text-fg-muted bg-surface-hover hover:bg-line rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Cancel
          </button>
        </div>
    </Modal>
  );
}
