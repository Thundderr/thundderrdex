"use client";

import { useMemo } from "react";
import { useModuleStore } from "@/stores/moduleStore";
import { useGenerationStore } from "@/stores/generationStore";
import { DamageCalcModule as DamageCalcModuleType } from "@/types/module";
import { FieldConditions } from "./FieldConditions";
import { DamageResults } from "./DamageResults";
import { useDamageCalc } from "@/hooks/useDamageCalc";
import { useLearnset } from "@/hooks/useLearnset";
import { usePokemon } from "@/hooks/usePokemon";
import {
  getZMoveName,
  getMaxMoveName,
  getGenerationFeatures,
  getZMovePower,
  getMaxMovePower,
  getMaxMoveEffect,
  canGigantamax,
  getGMaxMove,
} from "@/lib/utils/generationConfig";
import { TypeBadge } from "@/components/type-chart/TypeBadge";
import { PokemonTypeName } from "@/types/pokemon";

interface Props {
  module: DamageCalcModuleType;
}

function DamageClassIcon({ damageClass }: { damageClass: string }) {
  const config = {
    physical: { color: "bg-orange-600", label: "P" },
    special: { color: "bg-blue-600", label: "S" },
    status: { color: "bg-slate-600", label: "-" },
  }[damageClass] ?? { color: "bg-slate-600", label: "?" };

  return (
    <span
      className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-white flex-shrink-0 ${config.color}`}
      title={damageClass}
    >
      {config.label}
    </span>
  );
}

export function FullscreenDamageCalc({ module }: Props) {
  const { swapDamageCalcPokemon, swapTeamBattleSides, setDamageCalcMove, toggleFullscreen, removeModule } = useModuleStore();
  const hasTeams = module.attackerTeam && module.defenderTeam;
  const isSwapped = module.isSwapped ?? false;
  const { globalGeneration } = useGenerationStore();
  const genFeatures = getGenerationFeatures(globalGeneration);

  const { data: attackerPokemon } = usePokemon(module.attacker.pokemonName);
  const { data: defenderPokemon } = usePokemon(module.defender.pokemonName);
  const { data: attackerLearnset } = useLearnset(module.attacker.pokemonName);

  const damageResult = useDamageCalc(
    module.attacker,
    module.defender,
    module.selectedMove,
    module.field
  );

  const attackerMoveData = useMemo(() => {
    if (!attackerLearnset) return [];
    return (module.attacker.moves || []).map((moveName) => {
      if (!moveName) return null;
      const entry = attackerLearnset.find((e) => e.move.name === moveName);
      return entry?.move || null;
    });
  }, [attackerLearnset, module.attacker.moves]);

  const selectedMoveData = useMemo(() => {
    if (!module.selectedMove || !attackerLearnset) return null;
    const entry = attackerLearnset.find((e) => e.move.name === module.selectedMove);
    return entry?.move || null;
  }, [module.selectedMove, attackerLearnset]);

  const attackerCanGmax = module.attacker.pokemonName ? canGigantamax(module.attacker.pokemonName) : false;
  const gmaxMove = module.attacker.pokemonName ? getGMaxMove(module.attacker.pokemonName) : null;

  const FIXED_GMAX_POWER_POKEMON = ["rillaboom", "cinderace", "inteleon"];
  const hasFixedGmaxPower = module.attacker.pokemonName ?
    FIXED_GMAX_POWER_POKEMON.some(p => module.attacker.pokemonName?.toLowerCase().includes(p)) : false;

  const getTransformedMoveInfo = (moveData: { displayName: string; type: string; power: number | null; damageClass: string } | null) => {
    if (!moveData) return null;

    if (module.attacker.useZMove && genFeatures.hasZMoves) {
      const zPower = getZMovePower(moveData.power);
      return {
        name: getZMoveName(moveData.type),
        power: zPower,
        effect: zPower ? null : "Z-Status: Boosts stats or has special effect",
        type: moveData.type,
        isStatus: moveData.power === null || moveData.power === 0,
      };
    }

    if (module.attacker.isDynamaxed && genFeatures.hasDynamax) {
      const isStatus = moveData.power === null || moveData.power === 0;

      if (module.attacker.useGigantamax && attackerCanGmax && gmaxMove && moveData.type === gmaxMove.type && !isStatus) {
        const gmaxPower = hasFixedGmaxPower ? 160 : getMaxMovePower(moveData.power, moveData.type);
        return {
          name: gmaxMove.move,
          power: gmaxPower,
          effect: gmaxMove.effect,
          type: moveData.type,
          isStatus: false,
          isGmax: true,
        };
      }

      if (isStatus) {
        return { name: "Max Guard", power: null, effect: "Protects user from most attacks", type: "Normal", isStatus: true };
      }

      return {
        name: getMaxMoveName(moveData.type),
        power: getMaxMovePower(moveData.power, moveData.type),
        effect: getMaxMoveEffect(moveData.type),
        type: moveData.type,
        isStatus: false,
      };
    }

    return {
      name: moveData.displayName,
      power: moveData.power,
      effect: null,
      type: moveData.type,
      isStatus: moveData.power === null || moveData.power === 0,
    };
  };

  const transformedMoveInfo = getTransformedMoveInfo(selectedMoveData);

  const isGimmickActive = (module.attacker.useZMove && genFeatures.hasZMoves) ||
    (module.attacker.isDynamaxed && genFeatures.hasDynamax);

  const isGmaxMove = isGimmickActive && module.attacker.isDynamaxed && module.attacker.useGigantamax &&
    attackerCanGmax && gmaxMove && selectedMoveData?.type === gmaxMove.type && selectedMoveData?.power;

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Header */}
      <div className="flex items-center px-3 py-2 bg-slate-800 border-b border-slate-700 gap-2 flex-shrink-0">
        <div className="flex-1 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-white font-medium">Damage Calculator</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); toggleFullscreen(module.id); }}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
            title="Exit fullscreen"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0v4m0-4h4m6 6l5 5m0 0v-4m0 4h-4" />
            </svg>
          </button>
          <button
            onClick={() => removeModule(module.id)}
            className="p-1.5 hover:bg-red-600/20 rounded text-slate-400 hover:text-red-400"
            title="Remove module"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="h-full flex flex-col gap-4">
          {/* Attacker vs Defender indicator — My Team always left, Enemy always right */}
          {(() => {
            // When swapped, module.attacker = enemy team, module.defender = my team
            const myTeamPokemon = isSwapped ? defenderPokemon : attackerPokemon;
            const enemyTeamPokemon = isSwapped ? attackerPokemon : defenderPokemon;
            const myTeamIsAtk = !isSwapped;
            const myLabel = myTeamIsAtk ? "ATK" : "DEF";
            const enemyLabel = myTeamIsAtk ? "DEF" : "ATK";
            const myColors = myTeamIsAtk
              ? "bg-red-600/20 border-red-600/30"
              : "bg-blue-600/20 border-blue-600/30";
            const enemyColors = myTeamIsAtk
              ? "bg-blue-600/20 border-blue-600/30"
              : "bg-red-600/20 border-red-600/30";
            const myLabelColor = myTeamIsAtk ? "text-red-400" : "text-blue-400";
            const enemyLabelColor = myTeamIsAtk ? "text-blue-400" : "text-red-400";

            return (
              <div className="flex items-center justify-center gap-3">
                {/* My Team (left) */}
                <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded border ${myColors}`}>
                  {myTeamPokemon?.sprites.front_default && (
                    <img src={myTeamPokemon.sprites.front_default} alt="" width={32} height={32} className="pixelated" style={{ imageRendering: "pixelated" }} />
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className={`text-2xs font-bold ${myLabelColor}`}>{myLabel}</span>
                    <span className="text-xs text-white font-medium truncate max-w-[100px]">
                      {myTeamPokemon?.displayName || "—"}
                    </span>
                  </div>
                </div>

                {/* Swap button */}
                <button
                  onClick={() => hasTeams ? swapTeamBattleSides(module.id) : swapDamageCalcPokemon(module.id)}
                  className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-400 hover:text-white transition-colors"
                  title={hasTeams ? "Swap ATK/DEF sides" : "Swap attacker and defender"}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </button>

                {/* Enemy Team (right) */}
                <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded border ${enemyColors}`}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-white font-medium truncate max-w-[100px]">
                      {enemyTeamPokemon?.displayName || "—"}
                    </span>
                    <span className={`text-2xs font-bold ${enemyLabelColor}`}>{enemyLabel}</span>
                  </div>
                  {enemyTeamPokemon?.sprites.front_default && (
                    <img src={enemyTeamPokemon.sprites.front_default} alt="" width={32} height={32} className="pixelated" style={{ imageRendering: "pixelated" }} />
                  )}
                </div>
              </div>
            );
          })()}

          {/* Damage Results */}
          <DamageResults result={damageResult} />

          {/* Move Quick Select */}
          {module.attacker.moves?.some((m) => m) && (
            <div className="grid grid-cols-2 gap-1.5">
              {module.attacker.moves.map((moveName, idx) => {
                const moveData = attackerMoveData[idx];
                if (!moveName || !moveData) return null;
                const isSelected = module.selectedMove === moveName;
                const transformedInfo = getTransformedMoveInfo(moveData);
                const displayName = transformedInfo?.name || moveData.displayName;
                const isThisMoveGmax = isGimmickActive && module.attacker.isDynamaxed && module.attacker.useGigantamax &&
                  attackerCanGmax && gmaxMove && moveData.type === gmaxMove.type && moveData.power;
                return (
                  <button
                    key={idx}
                    onClick={() => setDamageCalcMove(module.id, moveName)}
                    className={`px-3 py-2.5 text-xs font-medium rounded truncate transition-colors ${
                      isSelected
                        ? isGimmickActive
                          ? module.attacker.useZMove
                            ? "bg-yellow-600 text-white ring-2 ring-yellow-400"
                            : isThisMoveGmax
                              ? "bg-purple-600 text-white ring-2 ring-purple-400"
                              : "bg-red-600 text-white ring-2 ring-red-400"
                          : "bg-blue-600 text-white ring-2 ring-blue-400"
                        : isGimmickActive
                          ? module.attacker.useZMove
                            ? "bg-yellow-900/30 text-yellow-300 hover:bg-yellow-800/40 border border-yellow-700/40"
                            : isThisMoveGmax
                              ? "bg-purple-900/30 text-purple-300 hover:bg-purple-800/40 border border-purple-700/40"
                              : "bg-red-900/30 text-red-300 hover:bg-red-800/40 border border-red-700/40"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                    title={isGimmickActive ? `${moveData.displayName} → ${displayName}` : moveData.displayName}
                  >
                    {displayName}
                  </button>
                );
              })}
            </div>
          )}

          {/* Selected Move Display */}
          {selectedMoveData && transformedMoveInfo ? (
            <div className={`bg-slate-800 rounded-lg p-3 border ${
              isGimmickActive
                ? module.attacker.useZMove
                  ? "border-yellow-600/50"
                  : isGmaxMove
                    ? "border-purple-600/50"
                    : "border-red-600/50"
                : "border-slate-700"
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <TypeBadge type={transformedMoveInfo.type as PokemonTypeName} size="sm" fixedWidth />
                <DamageClassIcon damageClass={selectedMoveData.damageClass} />
                <span className={`flex-1 text-base font-semibold truncate ${
                  isGimmickActive
                    ? module.attacker.useZMove
                      ? "text-yellow-400"
                      : isGmaxMove
                        ? "text-purple-400"
                        : "text-red-400"
                    : "text-white"
                }`}>
                  {transformedMoveInfo.name}
                </span>
                {isGmaxMove && (
                  <span className="text-2xs px-1.5 py-0.5 bg-purple-600/40 text-purple-300 rounded font-medium">G-MAX</span>
                )}
                {isGimmickActive && !isGmaxMove && module.attacker.isDynamaxed && (
                  <span className="text-2xs px-1.5 py-0.5 bg-red-600/40 text-red-300 rounded font-medium">MAX</span>
                )}
                {module.attacker.useZMove && genFeatures.hasZMoves && (
                  <span className="text-2xs px-1.5 py-0.5 bg-yellow-600/40 text-yellow-300 rounded font-medium">Z</span>
                )}
              </div>

              <div className="flex items-baseline gap-4 mb-2">
                <div className="flex items-baseline gap-1">
                  <span className={`text-3xl font-bold ${
                    isGimmickActive
                      ? module.attacker.useZMove ? "text-yellow-400" : isGmaxMove ? "text-purple-400" : "text-red-400"
                      : "text-white"
                  }`}>
                    {transformedMoveInfo.power ?? "—"}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase">BP</span>
                </div>
                {!isGimmickActive && (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg text-white font-medium">{selectedMoveData.accuracy ?? "—"}</span>
                      <span className="text-[10px] text-slate-500 uppercase">Acc</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm text-slate-400">{selectedMoveData.pp}</span>
                      <span className="text-[10px] text-slate-500 uppercase">PP</span>
                    </div>
                  </>
                )}
              </div>

              {isGimmickActive && transformedMoveInfo.effect ? (
                <div className={`text-[10px] leading-tight p-1.5 rounded line-clamp-2 ${
                  module.attacker.useZMove
                    ? "bg-yellow-900/20 text-yellow-300/90"
                    : isGmaxMove
                      ? "bg-purple-900/20 text-purple-300/90"
                      : "bg-red-900/20 text-red-300/90"
                }`} title={transformedMoveInfo.effect}>
                  {transformedMoveInfo.effect}
                </div>
              ) : selectedMoveData.description && !isGimmickActive ? (
                <div className="text-[10px] text-slate-400 leading-tight line-clamp-2" title={selectedMoveData.description}>
                  {selectedMoveData.description}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="bg-slate-800 rounded-lg p-4 border border-dashed border-slate-600 text-center">
              <p className="text-xs text-slate-500">Select a move from the attacker&apos;s moveset</p>
            </div>
          )}

          {/* Field Conditions — gets remaining vertical space */}
          <div className="flex-1 min-h-0">
            <FieldConditions
              moduleId={module.id}
              field={module.field}
              attackerLevel={module.attacker.level}
              defenderLevel={module.defender.level}
              allExpanded
            />
          </div>
        </div>
      </div>
    </div>
  );
}
