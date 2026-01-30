"use client";

import { useRef, useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useModuleStore } from "@/stores/moduleStore";
import { useGenerationStore } from "@/stores/generationStore";
import { DamageCalcModule as DamageCalcModuleType } from "@/types/module";
import { PokemonConfigPanel } from "./PokemonConfigPanel";
import { FieldConditions } from "./FieldConditions";
import { DamageResults } from "./DamageResults";
import { useDamageCalc } from "@/hooks/useDamageCalc";
import { useLearnset } from "@/hooks/useLearnset";
import { formatPokemonName } from "@/lib/pokeapi/transformers";
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
  isOverlay?: boolean;
}

// Damage class icon component
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

export function DamageCalcModule({ module, isOverlay = false }: Props) {
  const { removeModule, selectedModuleId, selectModule, swapDamageCalcPokemon, setDamageCalcMove } = useModuleStore();
  const { globalGeneration } = useGenerationStore();
  const genFeatures = getGenerationFeatures(globalGeneration);
  const isSelected = selectedModuleId === module.id;
  const moduleContainerRef = useRef<HTMLDivElement>(null);

  // Fetch attacker's learnset for move display names
  const { data: attackerLearnset } = useLearnset(module.attacker.pokemonName);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id, disabled: isOverlay });

  const style = isOverlay
    ? { opacity: 0.95 }
    : {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1,
      };

  // Calculate damage
  const damageResult = useDamageCalc(
    module.attacker,
    module.defender,
    module.selectedMove,
    module.field
  );

  // Get display names for attacker's moves
  const attackerMoveData = useMemo(() => {
    if (!attackerLearnset) return [];
    return (module.attacker.moves || []).map((moveName) => {
      if (!moveName) return null;
      const entry = attackerLearnset.find((e) => e.move.name === moveName);
      return entry?.move || null;
    });
  }, [attackerLearnset, module.attacker.moves]);

  // Get selected move data
  const selectedMoveData = useMemo(() => {
    if (!module.selectedMove || !attackerLearnset) return null;
    const entry = attackerLearnset.find((e) => e.move.name === module.selectedMove);
    return entry?.move || null;
  }, [module.selectedMove, attackerLearnset]);

  // Check if the attacker can Gigantamax
  const attackerCanGmax = module.attacker.pokemonName ? canGigantamax(module.attacker.pokemonName) : false;
  const gmaxMove = module.attacker.pokemonName ? getGMaxMove(module.attacker.pokemonName) : null;

  // Starter G-Max moves that always have 160 BP
  const FIXED_GMAX_POWER_POKEMON = ["rillaboom", "cinderace", "inteleon"];
  const hasFixedGmaxPower = module.attacker.pokemonName ?
    FIXED_GMAX_POWER_POKEMON.some(p => module.attacker.pokemonName?.toLowerCase().includes(p)) : false;

  // Get the transformed move info based on gimmick
  const getTransformedMoveInfo = (moveData: { displayName: string; type: string; power: number | null; damageClass: string } | null) => {
    if (!moveData) return null;

    // Z-Move transformation
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

    // Max Move / G-Max Move transformation
    if (module.attacker.isDynamaxed && genFeatures.hasDynamax) {
      const isStatus = moveData.power === null || moveData.power === 0;

      // Check if using Gigantamax and this move type matches the G-Max move type
      if (module.attacker.useGigantamax && attackerCanGmax && gmaxMove && moveData.type === gmaxMove.type && !isStatus) {
        // Starter G-Max moves always have 160 BP
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

      // Regular Max Move
      if (isStatus) {
        return {
          name: "Max Guard",
          power: null,
          effect: "Protects user from most attacks",
          type: "Normal",
          isStatus: true,
        };
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

  // Get transformed move info for display
  const transformedMoveInfo = getTransformedMoveInfo(selectedMoveData);

  // Check if gimmick is active
  const isGimmickActive = (module.attacker.useZMove && genFeatures.hasZMoves) ||
    (module.attacker.isDynamaxed && genFeatures.hasDynamax);

  // Check if G-Max move is being used
  const isGmaxMove = isGimmickActive && module.attacker.isDynamaxed && module.attacker.useGigantamax &&
    attackerCanGmax && gmaxMove && selectedMoveData?.type === gmaxMove.type && selectedMoveData?.power;

  // Combine refs
  const setRefs = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    (moduleContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
  };

  return (
    <div
      ref={setRefs}
      style={style}
      onClick={() => selectModule(module.id)}
      className={`col-span-2 bg-slate-900 rounded-lg border shadow-lg overflow-hidden ${
        isDragging ? "ring-2 ring-blue-500 border-slate-700" : ""
      } ${
        isSelected && !isDragging ? "ring-2 ring-blue-500 border-blue-500" : "border-slate-700"
      }`}
    >
      {/* Header */}
      <div className="flex items-center px-3 py-2 bg-slate-800 border-b border-slate-700 gap-2">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-700 rounded flex-shrink-0"
        >
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </div>

        {/* Title */}
        <div className="flex-1 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-white font-medium">Damage Calculator</span>
        </div>

        {/* Close Button */}
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

      {/* Content */}
      <div className="p-3">
        {/* Main Grid: Attacker | Controls | Defender */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {/* Attacker Panel */}
          <div className="flex flex-col">
            <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Attacker
            </h3>
            <PokemonConfigPanel
              moduleId={module.id}
              config={module.attacker}
              isAttacker={true}
            />
          </div>

          {/* Center Controls - Compact with constrained height */}
          <div className="space-y-2 overflow-hidden">
            {/* Swap Button - Smaller */}
            <div className="flex justify-center">
              <button
                onClick={() => swapDamageCalcPokemon(module.id)}
                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300 flex items-center gap-1.5 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Swap
              </button>
            </div>

            {/* Field Conditions (with level presets) */}
            <FieldConditions
              moduleId={module.id}
              field={module.field}
              attackerLevel={module.attacker.level}
              defenderLevel={module.defender.level}
            />

            {/* Move Quick Select - 2x2 grid */}
            {module.attacker.moves?.some((m) => m) && (
              <div className="grid grid-cols-2 gap-1">
                {module.attacker.moves.map((moveName, idx) => {
                  const moveData = attackerMoveData[idx];
                  if (!moveName || !moveData) return null;
                  const isSelected = module.selectedMove === moveName;
                  // Get transformed name for this move
                  const transformedInfo = getTransformedMoveInfo(moveData);
                  const displayName = transformedInfo?.name || moveData.displayName;
                  // Check if this specific move would be G-Max
                  const isThisMoveGmax = isGimmickActive && module.attacker.isDynamaxed && module.attacker.useGigantamax &&
                    attackerCanGmax && gmaxMove && moveData.type === gmaxMove.type && moveData.power;
                  return (
                    <button
                      key={idx}
                      onClick={() => setDamageCalcMove(module.id, moveName)}
                      className={`px-2 py-1.5 text-[10px] rounded truncate transition-colors ${
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

            {/* Selected Move Display - Static view based on attacker's selection */}
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
                {/* Move Name Header */}
                <div className="flex items-center gap-2 mb-2">
                  <TypeBadge type={transformedMoveInfo.type as PokemonTypeName} size="sm" fixedWidth />
                  <DamageClassIcon damageClass={selectedMoveData.damageClass} />
                  <span className={`flex-1 text-sm font-semibold truncate ${
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
                    <span className="text-[9px] px-1.5 py-0.5 bg-purple-600/40 text-purple-300 rounded font-medium">
                      G-MAX
                    </span>
                  )}
                  {isGimmickActive && !isGmaxMove && module.attacker.isDynamaxed && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-red-600/40 text-red-300 rounded font-medium">
                      MAX
                    </span>
                  )}
                  {module.attacker.useZMove && genFeatures.hasZMoves && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-yellow-600/40 text-yellow-300 rounded font-medium">
                      Z
                    </span>
                  )}
                </div>


                {/* Power Display - Large and prominent */}
                <div className="flex items-baseline gap-4 mb-2">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-2xl font-bold ${
                      isGimmickActive
                        ? module.attacker.useZMove
                          ? "text-yellow-400"
                          : isGmaxMove
                            ? "text-purple-400"
                            : "text-red-400"
                        : "text-white"
                    }`}>
                      {transformedMoveInfo.power ?? "—"}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase">BP</span>
                  </div>
                  {!isGimmickActive && (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg text-white font-medium">
                          {selectedMoveData.accuracy ?? "—"}
                        </span>
                        <span className="text-[10px] text-slate-500 uppercase">Acc</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm text-slate-400">
                          {selectedMoveData.pp}
                        </span>
                        <span className="text-[10px] text-slate-500 uppercase">PP</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Effect/Description - limited to 2 lines */}
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
                <p className="text-xs text-slate-500">Select a move from the attacker's moveset</p>
              </div>
            )}

            {/* Damage Results */}
            <DamageResults result={damageResult} />
          </div>

          {/* Defender Panel */}
          <div className="flex flex-col">
            <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Defender
            </h3>
            <PokemonConfigPanel
              moduleId={module.id}
              config={module.defender}
              isAttacker={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
