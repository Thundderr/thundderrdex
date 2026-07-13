"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import Image from "next/image";
import { useModuleStore } from "@/stores/moduleStore";
import { useGenerationStore } from "@/stores/generationStore";
import { ChampionsNotApplicableBanner } from "@/components/champions/ChampionsNotApplicableBanner";
import { LocationModule as LocationModuleType } from "@/types/module";
import { useLocationArea, LocationAreaData, VersionEncounters, MethodEncounters } from "@/hooks/useLocationArea";
import { useLocationAreaList, LocationAreaListItem } from "@/hooks/useLocationAreaList";
import { ModuleShell } from "@/components/layout/ModuleShell";

interface Props {
  module: LocationModuleType;
  isOverlay?: boolean;
}

// Version badge colors
const VERSION_COLORS: Record<string, { bg: string; text: string }> = {
  red: { bg: "bg-red-600", text: "text-white" },
  blue: { bg: "bg-blue-600", text: "text-white" },
  yellow: { bg: "bg-yellow-400", text: "text-black" },
  gold: { bg: "bg-yellow-500", text: "text-black" },
  silver: { bg: "bg-gray-400", text: "text-black" },
  crystal: { bg: "bg-cyan-400", text: "text-black" },
  ruby: { bg: "bg-red-700", text: "text-white" },
  sapphire: { bg: "bg-blue-700", text: "text-white" },
  emerald: { bg: "bg-emerald-500", text: "text-white" },
  firered: { bg: "bg-orange-500", text: "text-white" },
  leafgreen: { bg: "bg-green-500", text: "text-white" },
  diamond: { bg: "bg-blue-300", text: "text-black" },
  pearl: { bg: "bg-pink-300", text: "text-black" },
  platinum: { bg: "bg-gray-300", text: "text-black" },
  heartgold: { bg: "bg-yellow-500", text: "text-black" },
  soulsilver: { bg: "bg-gray-400", text: "text-black" },
  black: { bg: "bg-gray-900", text: "text-white" },
  white: { bg: "bg-gray-100", text: "text-black" },
  "black-2": { bg: "bg-gray-900", text: "text-white" },
  "white-2": { bg: "bg-gray-100", text: "text-black" },
  x: { bg: "bg-blue-600", text: "text-white" },
  y: { bg: "bg-red-600", text: "text-white" },
  "omega-ruby": { bg: "bg-red-700", text: "text-white" },
  "alpha-sapphire": { bg: "bg-blue-700", text: "text-white" },
  sun: { bg: "bg-orange-500", text: "text-white" },
  moon: { bg: "bg-purple-500", text: "text-white" },
  "ultra-sun": { bg: "bg-orange-600", text: "text-white" },
  "ultra-moon": { bg: "bg-purple-600", text: "text-white" },
  "lets-go-pikachu": { bg: "bg-yellow-400", text: "text-black" },
  "lets-go-eevee": { bg: "bg-amber-600", text: "text-white" },
  sword: { bg: "bg-cyan-500", text: "text-white" },
  shield: { bg: "bg-pink-500", text: "text-white" },
  "brilliant-diamond": { bg: "bg-blue-300", text: "text-black" },
  "shining-pearl": { bg: "bg-pink-300", text: "text-black" },
  "legends-arceus": { bg: "bg-blue-800", text: "text-white" },
  scarlet: { bg: "bg-red-600", text: "text-white" },
  violet: { bg: "bg-violet-600", text: "text-white" },
};

function VersionBadge({ version, display }: { version: string; display: string }) {
  const colors = VERSION_COLORS[version] || { bg: "bg-slate-600", text: "text-white" };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
      {display}
    </span>
  );
}

function PokemonEncounterRow({ pokemon, onPokemonClick }: {
  pokemon: {
    pokemonName: string;
    pokemonDisplayName: string;
    pokemonId: number;
    spriteUrl: string;
    minLevel: number;
    maxLevel: number;
    chance: number;
    conditions: string[];
  };
  onPokemonClick: (name: string, e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={(e) => onPokemonClick(pokemon.pokemonName, e)}
      className="flex items-center gap-2 p-1.5 hover:bg-slate-700/50 rounded transition-colors w-full text-left"
    >
      <Image
        src={pokemon.spriteUrl}
        alt={pokemon.pokemonDisplayName}
        width={32}
        height={32}
        className="pixelated"
        unoptimized
      />
      <div className="flex-1 min-w-0">
        <span className="text-sm text-white truncate block">{pokemon.pokemonDisplayName}</span>
        {pokemon.conditions.length > 0 && (
          <span className="text-[10px] text-slate-400 truncate block">
            {pokemon.conditions.join(", ")}
          </span>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-xs text-slate-300 font-mono">
          Lv. {pokemon.minLevel === pokemon.maxLevel ? pokemon.minLevel : `${pokemon.minLevel}-${pokemon.maxLevel}`}
        </div>
        <div className="text-[10px] text-slate-400">
          {pokemon.chance}%
        </div>
      </div>
    </button>
  );
}

function MethodSection({ method, onPokemonClick }: {
  method: MethodEncounters;
  onPokemonClick: (name: string, e: React.MouseEvent) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="border-l-2 border-slate-600 pl-2 mb-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-300 transition-colors mb-1"
      >
        <svg
          className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="font-medium">{method.methodDisplay}</span>
        <span className="text-slate-500">({method.pokemon.length})</span>
      </button>
      {isExpanded && (
        <div className="space-y-0.5">
          {method.pokemon.map((poke) => (
            <PokemonEncounterRow
              key={`${poke.pokemonName}-${poke.conditions.join("-")}`}
              pokemon={poke}
              onPokemonClick={onPokemonClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function VersionSection({ versionGroup, onPokemonClick }: {
  versionGroup: VersionEncounters;
  onPokemonClick: (name: string, e: React.MouseEvent) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const totalPokemon = versionGroup.methods.reduce((sum, m) => sum + m.pokemon.length, 0);

  return (
    <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left flex-wrap"
      >
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <div className="flex flex-wrap gap-1">
          {versionGroup.versions.map((v) => (
            <VersionBadge key={v.version} version={v.version} display={v.versionDisplay} />
          ))}
        </div>
        <span className="text-xs text-slate-500">
          {totalPokemon} Pokemon, {versionGroup.methods.length} methods
        </span>
      </button>
      {isExpanded && (
        <div className="mt-2 space-y-1">
          {versionGroup.methods.map((method) => (
            <MethodSection
              key={method.method}
              method={method}
              onPokemonClick={onPokemonClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function LocationModule({ module, isOverlay = false }: Props) {
  const { setLocationArea, selectModule, addModule, setPokemon, clearNewlyCreatedModule, toggleExtended } = useModuleStore();
  const championsMode = useGenerationStore((s) => s.championsMode);

  const { data: locationData, isLoading, error } = useLocationArea(module.locationAreaName);
  const { data: locationList } = useLocationAreaList();

  // Search state
  const [isSearching, setIsSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Filter location list by query
  const filteredLocations = useMemo(() => {
    if (!locationList || !query) return locationList?.slice(0, 50) || [];
    const lowerQuery = query.toLowerCase();
    return locationList
      .filter((loc) => loc.displayName.toLowerCase().includes(lowerQuery))
      .slice(0, 50);
  }, [locationList, query]);

  // Open the search field when a fresh, empty Location module is created.
  // ModuleShell owns the newly-created flag and scroll-into-view.
  const handleNewlyCreated = () => {
    if (!module.locationAreaName) setIsSearching(true);
  };

  useEffect(() => {
    if (isSearching) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isSearching]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  useEffect(() => {
    if (listRef.current && filteredLocations.length > 0) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex, filteredLocations.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, filteredLocations.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredLocations[highlightedIndex]) {
          handleSelectLocation(filteredLocations[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsSearching(false);
        setQuery("");
        break;
    }
  };

  const handleSelectLocation = (location: LocationAreaListItem) => {
    setLocationArea(module.id, location.name);
    setIsSearching(false);
    setQuery("");
  };

  const handlePokemonClick = (pokemonName: string, e: React.MouseEvent) => {
    // Stop propagation so the LocationModule doesn't get re-selected
    e.stopPropagation();

    // Check if there's already a module with this Pokemon in the current tab
    const store = useModuleStore.getState();
    const activeTab = store.tabs.find(t => t.id === store.activeTabId);
    const existingModule = activeTab?.modules.find(
      m => m.moduleType === "pokemon" && (m as { pokemonName?: string }).pokemonName === pokemonName
    );

    if (existingModule) {
      // Select and scroll to the existing module
      selectModule(existingModule.id);
      const moduleElement = document.querySelector(`[data-module-id="${existingModule.id}"]`);
      moduleElement?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // Add a new Pokemon module with this Pokemon
    addModule("pokemon");
    // Get the new module ID immediately (Zustand state updates are synchronous)
    const newModuleId = useModuleStore.getState().newlyCreatedModuleId;
    if (newModuleId) {
      setPokemon(newModuleId, pokemonName);
      // Clear newlyCreatedModuleId so the PokemonModule doesn't open search
      clearNewlyCreatedModule();
    }
  };

  const title = (
    <span className="flex items-center gap-2 min-w-0">
      <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      {module.locationAreaName ? (
        <button
          onClick={() => setIsSearching(true)}
          className="text-fg font-medium truncate hover:text-accent transition-colors"
        >
          {locationData?.displayName || module.locationAreaName}
        </button>
      ) : (
        <span className="text-fg-subtle text-sm">Location Browser</span>
      )}
    </span>
  );

  const extendButton = (
    <button
      onClick={(e) => { e.stopPropagation(); toggleExtended(module.id); }}
      className={`p-1 rounded transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${module.isExtended ? "bg-accent/20 text-accent" : "text-fg-subtle hover:text-fg hover:bg-surface-hover"}`}
      aria-label={module.isExtended ? "Collapse module" : "Extend module"}
      title={module.isExtended ? "Collapse module" : "Extend module"}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        {module.isExtended ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0v4m0-4h4m6 6l5 5m0 0v-4m0 4h-4" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
        )}
      </svg>
    </button>
  );

  return (
    <ModuleShell
      module={module}
      isOverlay={isOverlay}
      title={title}
      headerControls={extendButton}
      onNewlyCreated={handleNewlyCreated}
      className={module.isExtended ? "col-span-1 md:col-span-2" : ""}
      bodyClassName={`p-4 overflow-auto ${module.customHeight ? "flex-1 min-h-0" : "min-h-[clamp(16rem,40dvh,28rem)]"}`}
    >
        {championsMode && <ChampionsNotApplicableBanner feature="wild encounters" />}
        {isSearching ? (
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search locations..."
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onBlur={() => {
                setTimeout(() => {
                  setIsSearching(false);
                  setQuery("");
                }, 200);
              }}
            />
            {filteredLocations.length > 0 && (
              <ul
                ref={listRef}
                className="absolute z-50 w-full max-w-[calc(100vw-1rem)] mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-[300px] overflow-auto"
              >
                {filteredLocations.map((location, index) => (
                  <li
                    key={location.name}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => handleSelectLocation(location)}
                    className={`px-4 py-2 cursor-pointer ${
                      index === highlightedIndex
                        ? "bg-slate-700"
                        : "hover:bg-slate-700/50"
                    }`}
                  >
                    <span className="text-white">{location.displayName}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : !module.locationAreaName ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <svg className="w-12 h-12 text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-slate-400 mb-4">Search for a location to see Pokemon encounters</p>
            <button
              onClick={() => setIsSearching(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
            >
              Search Locations
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : error ? (
          <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-4 text-center">
            <p className="text-red-400 text-sm">Failed to load location data</p>
            <button
              onClick={() => setIsSearching(true)}
              className="mt-2 text-xs text-blue-400 hover:text-blue-300"
            >
              Try a different location
            </button>
          </div>
        ) : locationData ? (
          <div className="space-y-4">
            {/* Location info */}
            <div className="text-sm text-slate-400">
              <span className="text-slate-500">Region: </span>
              {locationData.locationDisplayName}
            </div>

            {/* Version groups */}
            {locationData.versionEncounters.length > 0 ? (
              <div className="space-y-2">
                {locationData.versionEncounters.map((versionGroup, idx) => (
                  <VersionSection
                    key={versionGroup.versions.map(v => v.version).join("-") || idx}
                    versionGroup={versionGroup}
                    onPokemonClick={handlePokemonClick}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-slate-800 rounded-lg p-4 text-center">
                <p className="text-slate-400 text-sm">
                  No Pokemon encounters found
                </p>
              </div>
            )}
          </div>
        ) : null}
    </ModuleShell>
  );
}
