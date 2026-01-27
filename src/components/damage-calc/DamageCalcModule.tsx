"use client";

import { useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useModuleStore } from "@/stores/moduleStore";
import { DamageCalcModule as DamageCalcModuleType } from "@/types/module";
import { PokemonConfigPanel } from "./PokemonConfigPanel";
import { MoveSelector } from "./MoveSelector";
import { FieldConditions } from "./FieldConditions";
import { DamageResults } from "./DamageResults";
import { useDamageCalc } from "@/hooks/useDamageCalc";

interface Props {
  module: DamageCalcModuleType;
  isOverlay?: boolean;
}

export function DamageCalcModule({ module, isOverlay = false }: Props) {
  const { removeModule, selectedModuleId, selectModule, swapDamageCalcPokemon } = useModuleStore();
  const isSelected = selectedModuleId === module.id;
  const moduleContainerRef = useRef<HTMLDivElement>(null);

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
      className={`col-span-1 md:col-span-2 xl:col-span-3 bg-slate-900 rounded-lg border shadow-lg overflow-hidden ${
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
      <div className="p-4 min-h-[600px]">
        {/* Main Grid: Attacker | Controls | Defender */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Attacker Panel */}
          <div>
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

          {/* Center Controls */}
          <div className="space-y-3">
            {/* Swap Button */}
            <div className="flex justify-center">
              <button
                onClick={() => swapDamageCalcPokemon(module.id)}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm text-slate-300 flex items-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

            {/* Damage Results */}
            <DamageResults result={damageResult} />

            {/* Move Selector */}
            <div>
              <h3 className="text-[10px] font-medium text-slate-500 uppercase mb-1">Selected Move</h3>
              <MoveSelector
                moduleId={module.id}
                attackerName={module.attacker.pokemonName}
                selectedMove={module.selectedMove}
              />
            </div>
          </div>

          {/* Defender Panel */}
          <div>
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
