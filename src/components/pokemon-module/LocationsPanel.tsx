"use client";

import { useMemo } from "react";
import { useEncounters } from "@/hooks/useEncounters";
import { useModuleStore } from "@/stores/moduleStore";
import { LocationEncounter } from "@/types/pokemon";

interface Props {
  pokemonName: string;
}

// Game version colors based on actual game box art/branding
const VERSION_COLORS: Record<string, { bg: string; text: string }> = {
  // Gen 1
  red: { bg: "bg-red-600", text: "text-white" },
  blue: { bg: "bg-blue-600", text: "text-white" },
  yellow: { bg: "bg-yellow-400", text: "text-black" },
  // Gen 2
  gold: { bg: "bg-yellow-500", text: "text-black" },
  silver: { bg: "bg-gray-400", text: "text-black" },
  crystal: { bg: "bg-cyan-400", text: "text-black" },
  // Gen 3
  ruby: { bg: "bg-red-700", text: "text-white" },
  sapphire: { bg: "bg-blue-700", text: "text-white" },
  emerald: { bg: "bg-emerald-500", text: "text-white" },
  firered: { bg: "bg-orange-500", text: "text-white" },
  leafgreen: { bg: "bg-green-500", text: "text-white" },
  // Gen 4
  diamond: { bg: "bg-blue-300", text: "text-black" },
  pearl: { bg: "bg-pink-300", text: "text-black" },
  platinum: { bg: "bg-gray-300", text: "text-black" },
  heartgold: { bg: "bg-yellow-500", text: "text-black" },
  soulsilver: { bg: "bg-gray-400", text: "text-black" },
  // Gen 5
  black: { bg: "bg-gray-900", text: "text-white" },
  white: { bg: "bg-gray-100", text: "text-black" },
  "black-2": { bg: "bg-gray-900", text: "text-white" },
  "white-2": { bg: "bg-gray-100", text: "text-black" },
  // Gen 6
  x: { bg: "bg-blue-600", text: "text-white" },
  y: { bg: "bg-red-600", text: "text-white" },
  "omega-ruby": { bg: "bg-red-700", text: "text-white" },
  "alpha-sapphire": { bg: "bg-blue-700", text: "text-white" },
  // Gen 7
  sun: { bg: "bg-orange-500", text: "text-white" },
  moon: { bg: "bg-purple-500", text: "text-white" },
  "ultra-sun": { bg: "bg-orange-600", text: "text-white" },
  "ultra-moon": { bg: "bg-purple-600", text: "text-white" },
  "lets-go-pikachu": { bg: "bg-yellow-400", text: "text-black" },
  "lets-go-eevee": { bg: "bg-amber-600", text: "text-white" },
  // Gen 8
  sword: { bg: "bg-cyan-500", text: "text-white" },
  shield: { bg: "bg-pink-500", text: "text-white" },
  "brilliant-diamond": { bg: "bg-blue-300", text: "text-black" },
  "shining-pearl": { bg: "bg-pink-300", text: "text-black" },
  "legends-arceus": { bg: "bg-blue-800", text: "text-white" },
  // Gen 9
  scarlet: { bg: "bg-red-600", text: "text-white" },
  violet: { bg: "bg-violet-600", text: "text-white" },
};

// Display names for versions
const VERSION_DISPLAY_NAMES: Record<string, string> = {
  red: "Red",
  blue: "Blue",
  yellow: "Yellow",
  gold: "Gold",
  silver: "Silver",
  crystal: "Crystal",
  ruby: "Ruby",
  sapphire: "Sapphire",
  emerald: "Emerald",
  firered: "FireRed",
  leafgreen: "LeafGreen",
  diamond: "Diamond",
  pearl: "Pearl",
  platinum: "Platinum",
  heartgold: "HeartGold",
  soulsilver: "SoulSilver",
  black: "Black",
  white: "White",
  "black-2": "Black 2",
  "white-2": "White 2",
  x: "X",
  y: "Y",
  "omega-ruby": "Omega Ruby",
  "alpha-sapphire": "Alpha Sapphire",
  sun: "Sun",
  moon: "Moon",
  "ultra-sun": "Ultra Sun",
  "ultra-moon": "Ultra Moon",
  "lets-go-pikachu": "Let's Go Pikachu",
  "lets-go-eevee": "Let's Go Eevee",
  sword: "Sword",
  shield: "Shield",
  "brilliant-diamond": "Brilliant Diamond",
  "shining-pearl": "Shining Pearl",
  "legends-arceus": "Legends: Arceus",
  scarlet: "Scarlet",
  violet: "Violet",
};

// Remove region prefix from location names
function cleanLocationName(name: string): string {
  // Remove common region prefixes
  const regionPrefixes = [
    "kanto-", "johto-", "hoenn-", "sinnoh-", "unova-",
    "kalos-", "alola-", "galar-", "paldea-", "hisui-"
  ];

  let cleaned = name.toLowerCase();
  for (const prefix of regionPrefixes) {
    if (cleaned.startsWith(prefix)) {
      cleaned = cleaned.slice(prefix.length);
      break;
    }
  }

  // Remove "-area" suffix
  cleaned = cleaned.replace(/-area$/, "");

  // Convert to title case
  return cleaned
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Location data with both display name and original API name
interface LocationInfo {
  displayName: string;
  areaName: string; // Original API name for opening location module
}

// Version group data
interface VersionGroup {
  versions: string[];
  locations: LocationInfo[];
}

// Final grouped structure by generation
interface GenerationData {
  generation: number;
  versionGroups: VersionGroup[];
}

function processEncounters(encounters: LocationEncounter[]): GenerationData[] {
  // Build a map of version -> map of display name -> original name
  const versionLocationMap: Map<string, Map<string, string>> = new Map();
  const versionGenerations: Map<string, number> = new Map();

  for (const location of encounters) {
    const cleanedName = cleanLocationName(location.locationName);
    const originalName = location.locationName;

    for (const vd of location.versionDetails) {
      if (vd.generation === 0) continue;

      versionGenerations.set(vd.version, vd.generation);

      if (!versionLocationMap.has(vd.version)) {
        versionLocationMap.set(vd.version, new Map());
      }

      // Store both the display name and original name
      versionLocationMap.get(vd.version)!.set(cleanedName, originalName);
    }
  }

  // Group versions by generation
  const generationVersions: Map<number, string[]> = new Map();
  for (const [version, gen] of versionGenerations) {
    if (!generationVersions.has(gen)) {
      generationVersions.set(gen, []);
    }
    generationVersions.get(gen)!.push(version);
  }

  // For each generation, group versions with identical location sets
  const result: GenerationData[] = [];

  for (const [generation, versions] of generationVersions) {
    const versionFingerprints: Map<string, string[]> = new Map();

    for (const version of versions) {
      const locationMap = versionLocationMap.get(version)!;
      const fingerprint = Array.from(locationMap.keys()).sort().join("|");

      if (!versionFingerprints.has(fingerprint)) {
        versionFingerprints.set(fingerprint, []);
      }
      versionFingerprints.get(fingerprint)!.push(version);
    }

    // Build version groups
    const versionGroups: VersionGroup[] = [];

    for (const [, groupVersions] of versionFingerprints) {
      const locationMap = versionLocationMap.get(groupVersions[0])!;
      const locations: LocationInfo[] = Array.from(locationMap.entries())
        .map(([displayName, areaName]) => ({ displayName, areaName }))
        .sort((a, b) => a.displayName.localeCompare(b.displayName));

      versionGroups.push({
        versions: groupVersions.sort(),
        locations,
      });
    }

    // Sort version groups by first version
    versionGroups.sort((a, b) => a.versions[0].localeCompare(b.versions[0]));

    result.push({
      generation,
      versionGroups,
    });
  }

  result.sort((a, b) => a.generation - b.generation);

  return result;
}

function VersionLabel({ version }: { version: string }) {
  const colors = VERSION_COLORS[version] || { bg: "bg-slate-600", text: "text-white" };
  const displayName = VERSION_DISPLAY_NAMES[version] || version;

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
      {displayName}
    </span>
  );
}

export function LocationsPanel({ pokemonName }: Props) {
  const { data: encounters, isLoading, error } = useEncounters(pokemonName);
  const { addLocationModule } = useModuleStore();

  const generationData = useMemo(() => {
    if (!encounters) return [];
    return processEncounters(encounters);
  }, [encounters]);

  const handleLocationClick = (areaName: string) => {
    addLocationModule(areaName);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-4 text-center">
        <p className="text-red-400 text-sm">Failed to load encounter data</p>
      </div>
    );
  }

  if (!encounters || encounters.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 text-center">
        <p className="text-slate-400 text-sm">Not available in the wild</p>
        <p className="text-slate-500 text-xs mt-2">
          This Pokemon can only be obtained through evolution, breeding, trading, or special events.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {generationData.map((genData) => (
        <div key={genData.generation} className="space-y-1.5">
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Generation {genData.generation}
          </h3>
          {genData.versionGroups.map((group, idx) => (
            <div
              key={idx}
              className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/50"
            >
              <div className="flex items-start gap-3">
                <div className="flex flex-wrap gap-1 min-w-[100px]">
                  {group.versions.map((version) => (
                    <VersionLabel key={version} version={version} />
                  ))}
                </div>
                <div className="flex-1 text-xs">
                  {group.locations.map((loc, locIdx) => (
                    <span key={loc.areaName}>
                      <button
                        onClick={() => handleLocationClick(loc.areaName)}
                        className="text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                        title={`View all Pokemon in ${loc.displayName}`}
                      >
                        {loc.displayName}
                      </button>
                      {locIdx < group.locations.length - 1 && (
                        <span className="text-slate-500">, </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
