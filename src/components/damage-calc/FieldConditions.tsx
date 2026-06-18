"use client";

import { useState, useEffect } from "react";
import { useModuleStore } from "@/stores/moduleStore";
import { useGenerationStore } from "@/stores/generationStore";
import { DamageCalcFieldConfig, DamageCalcSideConfig } from "@/types/module";
import { getGenerationFeatures, WeatherType } from "@/lib/utils/generationConfig";

const FIELD_SECTIONS_STORAGE_KEY = "damageCalc_fieldSections";

interface Props {
  moduleId: string;
  field: DamageCalcFieldConfig;
  attackerLevel: number;
  defenderLevel: number;
  allExpanded?: boolean;
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

// Counter for stackable effects (spikes, helping hand)
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
    <div className="flex items-center gap-0.5">
      <span className="text-[9px] text-slate-500 mr-0.5">{label}</span>
      {Array.from({ length: max + 1 }, (_, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          className={`w-4 h-4 text-[9px] font-medium border transition-colors rounded ${
            value === i
              ? "bg-slate-600 text-white border-slate-500"
              : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
          }`}
        >
          {i}
        </button>
      ))}
    </div>
  );
}

// Load saved section states from localStorage
function loadSectionStates(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const saved = localStorage.getItem(FIELD_SECTIONS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

// Save section states to localStorage
function saveSectionState(sectionId: string, isOpen: boolean) {
  if (typeof window === "undefined") return;
  try {
    const current = loadSectionStates();
    current[sectionId] = isOpen;
    localStorage.setItem(FIELD_SECTIONS_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Ignore localStorage errors
  }
}

// Collapsible section component with localStorage persistence
function CollapsibleSection({
  title,
  sectionId,
  children,
  forceOpen,
}: {
  title: string;
  sectionId: string;
  children: React.ReactNode;
  forceOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load saved state on mount
  useEffect(() => {
    const saved = loadSectionStates();
    if (sectionId in saved) {
      setIsOpen(saved[sectionId]);
    }
    setIsHydrated(true);
  }, [sectionId]);

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    saveSectionState(sectionId, newState);
  };

  const effectiveOpen = forceOpen || isOpen;

  // When forced open, skip hydration wait
  if (forceOpen) {
    return (
      <div className="border-t border-slate-700">
        <div className="py-1.5 px-2 text-[10px] text-slate-400">
          <span className="uppercase tracking-wide font-medium">{title}</span>
        </div>
        <div className="px-2 pb-2">{children}</div>
      </div>
    );
  }

  // Don't render content until hydrated to avoid flash
  if (!isHydrated) {
    return (
      <div className="border-t border-slate-700">
        <button className="w-full flex items-center gap-2 py-1.5 px-2 text-[10px] text-slate-400">
          <span className="text-[8px]">▶</span>
          <span className="uppercase tracking-wide">{title}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-slate-700">
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-2 py-1.5 px-2 text-[10px] text-slate-400 hover:text-white transition-colors"
      >
        <span className="text-[8px]">{effectiveOpen ? "▼" : "▶"}</span>
        <span className="uppercase tracking-wide">{title}</span>
      </button>
      {effectiveOpen && <div className="px-2 pb-2">{children}</div>}
    </div>
  );
}

export function FieldConditions({ moduleId, field, attackerLevel, defenderLevel, allExpanded }: Props) {
  const { setDamageCalcField, setDamageCalcBothLevels } = useModuleStore();
  const { globalGeneration } = useGenerationStore();
  const genFeatures = getGenerationFeatures(globalGeneration);

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

  // Handle weather toggle
  const handleWeatherToggle = (weather: WeatherType) => {
    if (field.weather === weather) {
      updateField({ weather: "None" });
    } else {
      updateField({ weather });
    }
  };

  // Check if current weather is valid for this generation
  const isWeatherAvailable = (weather: WeatherType) => genFeatures.weatherTypes.includes(weather);

  return (
    <div className="bg-slate-800 rounded-lg p-2 space-y-1.5">
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
        <div className="w-px h-4 bg-slate-700 mx-1" />
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
      {genFeatures.hasWeather && (
        <div className="flex items-center justify-center gap-1 flex-wrap">
          <Toggle
            active={field.weather === "None"}
            onClick={() => updateField({ weather: "None" })}
          >
            None
          </Toggle>
          {isWeatherAvailable("Sun") && (
            <Toggle active={field.weather === "Sun"} onClick={() => handleWeatherToggle("Sun")}>
              Sun
            </Toggle>
          )}
          {isWeatherAvailable("Rain") && (
            <Toggle active={field.weather === "Rain"} onClick={() => handleWeatherToggle("Rain")}>
              Rain
            </Toggle>
          )}
          {isWeatherAvailable("Sand") && (
            <Toggle active={field.weather === "Sand"} onClick={() => handleWeatherToggle("Sand")}>
              Sand
            </Toggle>
          )}
          {isWeatherAvailable("Hail") && (
            <Toggle active={field.weather === "Hail"} onClick={() => handleWeatherToggle("Hail")}>
              Hail
            </Toggle>
          )}
          {isWeatherAvailable("Snow") && (
            <Toggle active={field.weather === "Snow"} onClick={() => handleWeatherToggle("Snow")}>
              Snow
            </Toggle>
          )}
        </div>
      )}

      {/* Primal Weather Row */}
      {(isWeatherAvailable("Harsh Sunshine") || isWeatherAvailable("Heavy Rain") || isWeatherAvailable("Strong Winds")) && (
        <div className="flex items-center justify-center gap-1 flex-wrap">
          {isWeatherAvailable("Harsh Sunshine") && (
            <Toggle active={field.weather === "Harsh Sunshine"} onClick={() => handleWeatherToggle("Harsh Sunshine")}>
              Harsh Sun
            </Toggle>
          )}
          {isWeatherAvailable("Heavy Rain") && (
            <Toggle active={field.weather === "Heavy Rain"} onClick={() => handleWeatherToggle("Heavy Rain")}>
              Heavy Rain
            </Toggle>
          )}
          {isWeatherAvailable("Strong Winds") && (
            <Toggle active={field.weather === "Strong Winds"} onClick={() => handleWeatherToggle("Strong Winds")}>
              Strong Winds
            </Toggle>
          )}
        </div>
      )}

      {/* Terrain Row */}
      {genFeatures.hasTerrains && (
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
      )}

      {/* Global Effects Row */}
      <div className="flex items-center justify-center gap-1 flex-wrap">
        {genFeatures.hasMagicRoom && (
          <Toggle active={field.isMagicRoom} onClick={() => updateField({ isMagicRoom: !field.isMagicRoom })}>
            Magic Room
          </Toggle>
        )}
        {genFeatures.hasWonderRoom && (
          <Toggle active={field.isWonderRoom} onClick={() => updateField({ isWonderRoom: !field.isWonderRoom })}>
            Wonder Room
          </Toggle>
        )}
        {genFeatures.hasGravity && (
          <Toggle active={field.isGravity} onClick={() => updateField({ isGravity: !field.isGravity })}>
            Gravity
          </Toggle>
        )}
        <Toggle active={field.isCritical} onClick={() => updateField({ isCritical: !field.isCritical })}>
          Crit
        </Toggle>
      </div>

      {/* Auras & Abilities Section */}
      {(genFeatures.hasAuras || genFeatures.hasRuinAbilities) && (
        <CollapsibleSection title="Auras & Abilities" sectionId="auras" forceOpen={allExpanded}>
          <div className="space-y-1.5">
            {/* Auras (Gen 6+) */}
            {genFeatures.hasAuras && (
              <div className="flex items-center justify-center gap-1 flex-wrap">
                <Toggle active={field.isFairyAura} onClick={() => updateField({ isFairyAura: !field.isFairyAura })}>
                  Fairy Aura
                </Toggle>
                <Toggle active={field.isDarkAura} onClick={() => updateField({ isDarkAura: !field.isDarkAura })}>
                  Dark Aura
                </Toggle>
                <Toggle active={field.isAuraBreak} onClick={() => updateField({ isAuraBreak: !field.isAuraBreak })}>
                  Aura Break
                </Toggle>
              </div>
            )}
            {/* Ruin Abilities (Gen 9) */}
            {genFeatures.hasRuinAbilities && (
              <div className="flex items-center justify-center gap-1 flex-wrap">
                <Toggle active={field.isBeadsOfRuin} onClick={() => updateField({ isBeadsOfRuin: !field.isBeadsOfRuin })}>
                  Beads of Ruin
                </Toggle>
                <Toggle active={field.isSwordOfRuin} onClick={() => updateField({ isSwordOfRuin: !field.isSwordOfRuin })}>
                  Sword of Ruin
                </Toggle>
                <Toggle active={field.isTabletsOfRuin} onClick={() => updateField({ isTabletsOfRuin: !field.isTabletsOfRuin })}>
                  Tablets of Ruin
                </Toggle>
                <Toggle active={field.isVesselOfRuin} onClick={() => updateField({ isVesselOfRuin: !field.isVesselOfRuin })}>
                  Vessel of Ruin
                </Toggle>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* Two Column Layout for Attacker/Defender Sides */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-700">
        {/* Column Headers */}
        <h4 className="text-[10px] text-slate-500 uppercase text-center">Attacker</h4>
        <h4 className="text-[10px] text-slate-500 uppercase text-center">Defender</h4>
      </div>

      {/* Hazards Section */}
      <CollapsibleSection title="Hazards" sectionId="hazards" forceOpen={allExpanded}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Attacker Hazards */}
          <div className="space-y-1.5">
            {genFeatures.hasStealthRock && (
              <div className="flex justify-center">
                <Toggle active={field.attackerSide.isSR} onClick={() => updateAttackerSide({ isSR: !field.attackerSide.isSR })}>
                  Stealth Rock
                </Toggle>
              </div>
            )}
            {genFeatures.hasSpikes && (
              <div className="flex justify-center">
                <Counter value={field.attackerSide.spikes} max={3} onChange={(v) => updateAttackerSide({ spikes: v })} label="Spikes" />
              </div>
            )}
            {genFeatures.hasGMaxHazards && (
              <div className="flex flex-wrap gap-1 justify-center">
                <Toggle active={field.attackerSide.steelsurge} onClick={() => updateAttackerSide({ steelsurge: !field.attackerSide.steelsurge })}>
                  Steelsurge
                </Toggle>
              </div>
            )}
          </div>
          {/* Defender Hazards */}
          <div className="space-y-1.5">
            {genFeatures.hasStealthRock && (
              <div className="flex justify-center">
                <Toggle active={field.defenderSide.isSR} onClick={() => updateDefenderSide({ isSR: !field.defenderSide.isSR })}>
                  Stealth Rock
                </Toggle>
              </div>
            )}
            {genFeatures.hasSpikes && (
              <div className="flex justify-center">
                <Counter value={field.defenderSide.spikes} max={3} onChange={(v) => updateDefenderSide({ spikes: v })} label="Spikes" />
              </div>
            )}
            {genFeatures.hasGMaxHazards && (
              <div className="flex flex-wrap gap-1 justify-center">
                <Toggle active={field.defenderSide.steelsurge} onClick={() => updateDefenderSide({ steelsurge: !field.defenderSide.steelsurge })}>
                  Steelsurge
                </Toggle>
              </div>
            )}
          </div>
        </div>
      </CollapsibleSection>

      {/* Screens Section */}
      <CollapsibleSection title="Screens" sectionId="screens" forceOpen={allExpanded}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Attacker Screens */}
          <div className="flex flex-wrap gap-1 justify-center">
            <Toggle active={field.attackerSide.isReflect} onClick={() => updateAttackerSide({ isReflect: !field.attackerSide.isReflect })}>
              Reflect
            </Toggle>
            <Toggle active={field.attackerSide.isLightScreen} onClick={() => updateAttackerSide({ isLightScreen: !field.attackerSide.isLightScreen })}>
              Light Screen
            </Toggle>
            {genFeatures.hasAuroraVeil && (
              <Toggle active={field.attackerSide.isAuroraVeil} onClick={() => updateAttackerSide({ isAuroraVeil: !field.attackerSide.isAuroraVeil })}>
                Aurora Veil
              </Toggle>
            )}
          </div>
          {/* Defender Screens */}
          <div className="flex flex-wrap gap-1 justify-center">
            <Toggle active={field.defenderSide.isReflect} onClick={() => updateDefenderSide({ isReflect: !field.defenderSide.isReflect })}>
              Reflect
            </Toggle>
            <Toggle active={field.defenderSide.isLightScreen} onClick={() => updateDefenderSide({ isLightScreen: !field.defenderSide.isLightScreen })}>
              Light Screen
            </Toggle>
            {genFeatures.hasAuroraVeil && (
              <Toggle active={field.defenderSide.isAuroraVeil} onClick={() => updateDefenderSide({ isAuroraVeil: !field.defenderSide.isAuroraVeil })}>
                Aurora Veil
              </Toggle>
            )}
          </div>
        </div>
      </CollapsibleSection>

      {/* Status & Protection Section */}
      <CollapsibleSection title="Status & Protection" sectionId="status" forceOpen={allExpanded}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Attacker Status */}
          <div className="flex flex-wrap gap-1 justify-center">
            <Toggle active={field.attackerSide.isProtected} onClick={() => updateAttackerSide({ isProtected: !field.attackerSide.isProtected })}>
              Protected
            </Toggle>
            {genFeatures.hasLeechSeed && (
              <Toggle active={field.attackerSide.isSeeded} onClick={() => updateAttackerSide({ isSeeded: !field.attackerSide.isSeeded })}>
                Leech Seed
              </Toggle>
            )}
            {genFeatures.hasForesight && (
              <Toggle active={field.attackerSide.isForesight} onClick={() => updateAttackerSide({ isForesight: !field.attackerSide.isForesight })}>
                Foresight
              </Toggle>
            )}
          </div>
          {/* Defender Status */}
          <div className="flex flex-wrap gap-1 justify-center">
            <Toggle active={field.defenderSide.isProtected} onClick={() => updateDefenderSide({ isProtected: !field.defenderSide.isProtected })}>
              Protected
            </Toggle>
            {genFeatures.hasLeechSeed && (
              <Toggle active={field.defenderSide.isSeeded} onClick={() => updateDefenderSide({ isSeeded: !field.defenderSide.isSeeded })}>
                Leech Seed
              </Toggle>
            )}
            {genFeatures.hasForesight && (
              <Toggle active={field.defenderSide.isForesight} onClick={() => updateDefenderSide({ isForesight: !field.defenderSide.isForesight })}>
                Foresight
              </Toggle>
            )}
          </div>
        </div>
      </CollapsibleSection>

      {/* Support Section */}
      <CollapsibleSection title="Support" sectionId="support" forceOpen={allExpanded}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Attacker Support */}
          <div className="space-y-1.5">
            {genFeatures.hasTailwind && (
              <div className="flex flex-wrap gap-1 justify-center">
                <Toggle active={field.attackerSide.isTailwind} onClick={() => updateAttackerSide({ isTailwind: !field.attackerSide.isTailwind })}>
                  Tailwind
                </Toggle>
                <Toggle active={field.attackerSide.isFlowerGift} onClick={() => updateAttackerSide({ isFlowerGift: !field.attackerSide.isFlowerGift })}>
                  Flower Gift
                </Toggle>
              </div>
            )}
            {field.gameType === "Doubles" && (
              <div className="flex flex-wrap gap-1 justify-center">
                <Toggle active={field.attackerSide.isHelpingHand} onClick={() => updateAttackerSide({ isHelpingHand: !field.attackerSide.isHelpingHand })}>
                  Helping Hand
                </Toggle>
                <Toggle active={field.attackerSide.isPowerSpot} onClick={() => updateAttackerSide({ isPowerSpot: !field.attackerSide.isPowerSpot })}>
                  Power Spot
                </Toggle>
                <Toggle active={field.attackerSide.isBattery} onClick={() => updateAttackerSide({ isBattery: !field.attackerSide.isBattery })}>
                  Battery
                </Toggle>
                <Toggle active={field.attackerSide.isFriendGuard} onClick={() => updateAttackerSide({ isFriendGuard: !field.attackerSide.isFriendGuard })}>
                  Friend Guard
                </Toggle>
              </div>
            )}
          </div>
          {/* Defender Support */}
          <div className="space-y-1.5">
            {genFeatures.hasTailwind && (
              <div className="flex flex-wrap gap-1 justify-center">
                <Toggle active={field.defenderSide.isTailwind} onClick={() => updateDefenderSide({ isTailwind: !field.defenderSide.isTailwind })}>
                  Tailwind
                </Toggle>
                <Toggle active={field.defenderSide.isFlowerGift} onClick={() => updateDefenderSide({ isFlowerGift: !field.defenderSide.isFlowerGift })}>
                  Flower Gift
                </Toggle>
              </div>
            )}
            {field.gameType === "Doubles" && (
              <div className="flex flex-wrap gap-1 justify-center">
                <Toggle active={field.defenderSide.isHelpingHand} onClick={() => updateDefenderSide({ isHelpingHand: !field.defenderSide.isHelpingHand })}>
                  Helping Hand
                </Toggle>
                <Toggle active={field.defenderSide.isPowerSpot} onClick={() => updateDefenderSide({ isPowerSpot: !field.defenderSide.isPowerSpot })}>
                  Power Spot
                </Toggle>
                <Toggle active={field.defenderSide.isBattery} onClick={() => updateDefenderSide({ isBattery: !field.defenderSide.isBattery })}>
                  Battery
                </Toggle>
                <Toggle active={field.defenderSide.isFriendGuard} onClick={() => updateDefenderSide({ isFriendGuard: !field.defenderSide.isFriendGuard })}>
                  Friend Guard
                </Toggle>
              </div>
            )}
          </div>
        </div>
      </CollapsibleSection>

      {/* Switching Section */}
      <CollapsibleSection title="Switching" sectionId="switching" forceOpen={allExpanded}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Attacker Switching */}
          <div className="flex flex-wrap gap-1 justify-center">
            <Toggle
              active={field.attackerSide.isSwitching === "out"}
              onClick={() => updateAttackerSide({ isSwitching: field.attackerSide.isSwitching === "out" ? null : "out" })}
            >
              Switching Out
            </Toggle>
            <Toggle
              active={field.attackerSide.isSwitching === "in"}
              onClick={() => updateAttackerSide({ isSwitching: field.attackerSide.isSwitching === "in" ? null : "in" })}
            >
              Switching In
            </Toggle>
          </div>
          {/* Defender Switching */}
          <div className="flex flex-wrap gap-1 justify-center">
            <Toggle
              active={field.defenderSide.isSwitching === "out"}
              onClick={() => updateDefenderSide({ isSwitching: field.defenderSide.isSwitching === "out" ? null : "out" })}
            >
              Switching Out
            </Toggle>
            <Toggle
              active={field.defenderSide.isSwitching === "in"}
              onClick={() => updateDefenderSide({ isSwitching: field.defenderSide.isSwitching === "in" ? null : "in" })}
            >
              Switching In
            </Toggle>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}
