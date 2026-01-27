"use client";

import { useModuleStore } from "@/stores/moduleStore";
import { DamageCalcFieldConfig, DamageCalcSideConfig } from "@/types/module";

interface Props {
  moduleId: string;
  field: DamageCalcFieldConfig;
  attackerLevel: number;
  defenderLevel: number;
}

// Compact toggle button
function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 text-[10px] font-medium rounded border transition-colors ${
        active
          ? "bg-slate-600 text-white border-slate-500"
          : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

// Counter for spikes
function Counter({
  value,
  max,
  onChange,
  label,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max + 1 }, (_, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          className={`w-5 h-5 text-[10px] font-medium border transition-colors rounded ${
            value === i
              ? "bg-slate-600 text-white border-slate-500"
              : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
          }`}
        >
          {i}
        </button>
      ))}
      <span className="text-[10px] text-slate-500 ml-0.5">{label}</span>
    </div>
  );
}

export function FieldConditions({ moduleId, field, attackerLevel, defenderLevel }: Props) {
  const { setDamageCalcField, setDamageCalcBothLevels } = useModuleStore();

  // Check if both levels are the same for highlighting presets
  const bothSameLevel = attackerLevel === defenderLevel;

  const updateField = (updates: Partial<DamageCalcFieldConfig>) => {
    setDamageCalcField(moduleId, updates);
  };

  const updateAttackerSide = (updates: Partial<DamageCalcSideConfig>) => {
    updateField({ attackerSide: { ...field.attackerSide, ...updates } });
  };

  const updateDefenderSide = (updates: Partial<DamageCalcSideConfig>) => {
    updateField({ defenderSide: { ...field.defenderSide, ...updates } });
  };

  return (
    <div className="bg-slate-800 rounded-lg p-3 space-y-2">
      {/* Level Presets Row */}
      <div className="flex items-center justify-center gap-1">
        <span className="text-[10px] text-slate-500 mr-1">Level</span>
        <Toggle
          active={bothSameLevel && attackerLevel === 100}
          onClick={() => setDamageCalcBothLevels(moduleId, 100)}
        >
          100
        </Toggle>
        <Toggle
          active={bothSameLevel && attackerLevel === 50}
          onClick={() => setDamageCalcBothLevels(moduleId, 50)}
        >
          50
        </Toggle>
        <Toggle
          active={bothSameLevel && attackerLevel === 5}
          onClick={() => setDamageCalcBothLevels(moduleId, 5)}
        >
          5
        </Toggle>
      </div>

      {/* Format Row */}
      <div className="flex items-center justify-center gap-1">
        <Toggle
          active={field.gameType === "Singles"}
          onClick={() => updateField({ gameType: "Singles" })}
        >
          Singles
        </Toggle>
        <Toggle
          active={field.gameType === "Doubles"}
          onClick={() => updateField({ gameType: "Doubles" })}
        >
          Doubles
        </Toggle>
      </div>

      {/* Weather Row */}
      <div className="flex items-center justify-center gap-1 flex-wrap">
        <Toggle
          active={field.weather === "None"}
          onClick={() => updateField({ weather: "None" })}
        >
          None
        </Toggle>
        <Toggle
          active={field.weather === "Sun"}
          onClick={() => updateField({ weather: "Sun" })}
        >
          Sun
        </Toggle>
        <Toggle
          active={field.weather === "Rain"}
          onClick={() => updateField({ weather: "Rain" })}
        >
          Rain
        </Toggle>
        <Toggle
          active={field.weather === "Sand"}
          onClick={() => updateField({ weather: "Sand" })}
        >
          Sand
        </Toggle>
        <Toggle
          active={field.weather === "Snow"}
          onClick={() => updateField({ weather: "Snow" })}
        >
          Snow
        </Toggle>
      </div>

      {/* Terrain Row */}
      <div className="flex items-center justify-center gap-1 flex-wrap">
        <Toggle
          active={field.terrain === "Electric"}
          onClick={() => updateField({ terrain: field.terrain === "Electric" ? "None" : "Electric" })}
        >
          Electric
        </Toggle>
        <Toggle
          active={field.terrain === "Grassy"}
          onClick={() => updateField({ terrain: field.terrain === "Grassy" ? "None" : "Grassy" })}
        >
          Grassy
        </Toggle>
        <Toggle
          active={field.terrain === "Misty"}
          onClick={() => updateField({ terrain: field.terrain === "Misty" ? "None" : "Misty" })}
        >
          Misty
        </Toggle>
        <Toggle
          active={field.terrain === "Psychic"}
          onClick={() => updateField({ terrain: field.terrain === "Psychic" ? "None" : "Psychic" })}
        >
          Psychic
        </Toggle>
      </div>

      {/* Global Effects Row */}
      <div className="flex items-center justify-center gap-1">
        <Toggle
          active={field.isMagicRoom}
          onClick={() => updateField({ isMagicRoom: !field.isMagicRoom })}
        >
          Magic Room
        </Toggle>
        <Toggle
          active={field.isWonderRoom}
          onClick={() => updateField({ isWonderRoom: !field.isWonderRoom })}
        >
          Wonder Room
        </Toggle>
        <Toggle
          active={field.isGravity}
          onClick={() => updateField({ isGravity: !field.isGravity })}
        >
          Gravity
        </Toggle>
        <Toggle
          active={field.isCritical}
          onClick={() => updateField({ isCritical: !field.isCritical })}
        >
          Crit
        </Toggle>
      </div>

      {/* Two Column Layout for Attacker/Defender Sides */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700">
        {/* Attacker Side */}
        <div className="space-y-1">
          <h4 className="text-[10px] text-slate-500 uppercase text-center mb-1">Attacker</h4>
          <div className="flex flex-wrap gap-1 justify-center">
            <Toggle
              active={field.attackerSide.isReflect}
              onClick={() => updateAttackerSide({ isReflect: !field.attackerSide.isReflect })}
            >
              Reflect
            </Toggle>
            <Toggle
              active={field.attackerSide.isLightScreen}
              onClick={() => updateAttackerSide({ isLightScreen: !field.attackerSide.isLightScreen })}
            >
              Light Screen
            </Toggle>
          </div>
          <div className="flex flex-wrap gap-1 justify-center">
            <Toggle
              active={field.attackerSide.isTailwind}
              onClick={() => updateAttackerSide({ isTailwind: !field.attackerSide.isTailwind })}
            >
              Tailwind
            </Toggle>
            <Toggle
              active={field.attackerSide.isFlowerGift}
              onClick={() => updateAttackerSide({ isFlowerGift: !field.attackerSide.isFlowerGift })}
            >
              Flower Gift
            </Toggle>
          </div>
          {field.gameType === "Doubles" && (
            <>
              <div className="flex justify-center">
                <Counter
                  value={field.attackerSide.helpingHandCount}
                  max={2}
                  onChange={(v) => updateAttackerSide({ helpingHandCount: v })}
                  label="Helping Hand"
                />
              </div>
              <div className="flex flex-wrap gap-1 justify-center">
                <Toggle
                  active={field.attackerSide.isPowerSpot}
                  onClick={() => updateAttackerSide({ isPowerSpot: !field.attackerSide.isPowerSpot })}
                >
                  Power Spot
                </Toggle>
                <Toggle
                  active={field.attackerSide.isBattery}
                  onClick={() => updateAttackerSide({ isBattery: !field.attackerSide.isBattery })}
                >
                  Battery
                </Toggle>
              </div>
              <div className="flex flex-wrap gap-1 justify-center">
                <Toggle
                  active={field.attackerSide.isFriendGuard}
                  onClick={() => updateAttackerSide({ isFriendGuard: !field.attackerSide.isFriendGuard })}
                >
                  Friend Guard
                </Toggle>
              </div>
            </>
          )}
        </div>

        {/* Defender Side */}
        <div className="space-y-1">
          <h4 className="text-[10px] text-slate-500 uppercase text-center mb-1">Defender</h4>
          <div className="flex flex-wrap gap-1 justify-center">
            <Toggle
              active={field.defenderSide.isReflect}
              onClick={() => updateDefenderSide({ isReflect: !field.defenderSide.isReflect })}
            >
              Reflect
            </Toggle>
            <Toggle
              active={field.defenderSide.isLightScreen}
              onClick={() => updateDefenderSide({ isLightScreen: !field.defenderSide.isLightScreen })}
            >
              Light Screen
            </Toggle>
          </div>
          <div className="flex flex-wrap gap-1 justify-center">
            <Toggle
              active={field.defenderSide.isAuroraVeil}
              onClick={() => updateDefenderSide({ isAuroraVeil: !field.defenderSide.isAuroraVeil })}
            >
              Aurora Veil
            </Toggle>
            <Toggle
              active={field.defenderSide.isTailwind}
              onClick={() => updateDefenderSide({ isTailwind: !field.defenderSide.isTailwind })}
            >
              Tailwind
            </Toggle>
          </div>
          <div className="flex flex-wrap gap-1 justify-center">
            <Toggle
              active={field.defenderSide.isFlowerGift}
              onClick={() => updateDefenderSide({ isFlowerGift: !field.defenderSide.isFlowerGift })}
            >
              Flower Gift
            </Toggle>
          </div>
          {field.gameType === "Doubles" && (
            <>
              <div className="flex justify-center">
                <Counter
                  value={field.defenderSide.helpingHandCount}
                  max={2}
                  onChange={(v) => updateDefenderSide({ helpingHandCount: v })}
                  label="Helping Hand"
                />
              </div>
              <div className="flex flex-wrap gap-1 justify-center">
                <Toggle
                  active={field.defenderSide.isPowerSpot}
                  onClick={() => updateDefenderSide({ isPowerSpot: !field.defenderSide.isPowerSpot })}
                >
                  Power Spot
                </Toggle>
                <Toggle
                  active={field.defenderSide.isBattery}
                  onClick={() => updateDefenderSide({ isBattery: !field.defenderSide.isBattery })}
                >
                  Battery
                </Toggle>
              </div>
              <div className="flex flex-wrap gap-1 justify-center">
                <Toggle
                  active={field.defenderSide.isFriendGuard}
                  onClick={() => updateDefenderSide({ isFriendGuard: !field.defenderSide.isFriendGuard })}
                >
                  Friend Guard
                </Toggle>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
