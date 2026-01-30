"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPokemonSpecies, fetchEvolutionChain, getSpriteUrl } from "@/lib/pokeapi/client";
import { PokeAPIEvolutionChainLink, PokeAPIEvolutionDetail } from "@/types/api";

export interface EvolutionMethod {
  trigger: string;
  details: string;
}

export interface EvolutionNode {
  name: string;
  displayName: string;
  spriteUrl: string;
  id: number;
  evolutionMethod: EvolutionMethod | null; // How to evolve TO this Pokemon
  evolvesTo: EvolutionNode[];
}

export interface EvolutionTreeData {
  root: EvolutionNode;
  currentPokemonName: string;
}

// Helper to format Pokemon name for display
function formatDisplayName(name: string): string {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Helper to extract Pokemon ID from species URL
function getIdFromUrl(url: string): number {
  const match = url.match(/\/(\d+)\/?$/);
  return match ? parseInt(match[1], 10) : 0;
}

// Format item/move names for display
function formatName(name: string): string {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Parse evolution details into a human-readable method
function parseEvolutionMethod(details: PokeAPIEvolutionDetail[]): EvolutionMethod | null {
  if (!details || details.length === 0) return null;

  // Use the first evolution detail (most Pokemon only have one)
  const detail = details[0];
  const trigger = detail.trigger.name;
  const parts: string[] = [];

  switch (trigger) {
    case "level-up":
      if (detail.min_level) {
        parts.push(`Lv. ${detail.min_level}`);
      }
      if (detail.min_happiness) {
        parts.push(`Happiness ${detail.min_happiness}+`);
      }
      if (detail.min_beauty) {
        parts.push(`Beauty ${detail.min_beauty}+`);
      }
      if (detail.min_affection) {
        parts.push(`Affection ${detail.min_affection}+`);
      }
      if (detail.time_of_day) {
        parts.push(detail.time_of_day === "day" ? "Daytime" : "Nighttime");
      }
      if (detail.known_move) {
        parts.push(`Knows ${formatName(detail.known_move.name)}`);
      }
      if (detail.known_move_type) {
        parts.push(`Knows ${formatName(detail.known_move_type.name)}-type move`);
      }
      if (detail.location) {
        parts.push(`At ${formatName(detail.location.name)}`);
      }
      if (detail.held_item) {
        parts.push(`Holding ${formatName(detail.held_item.name)}`);
      }
      if (detail.gender === 1) {
        parts.push("Female only");
      } else if (detail.gender === 2) {
        parts.push("Male only");
      }
      if (detail.needs_overworld_rain) {
        parts.push("While raining");
      }
      if (detail.turn_upside_down) {
        parts.push("Console upside down");
      }
      if (detail.party_species) {
        parts.push(`With ${formatName(detail.party_species.name)} in party`);
      }
      if (detail.party_type) {
        parts.push(`With ${formatName(detail.party_type.name)}-type in party`);
      }
      if (detail.relative_physical_stats !== null) {
        if (detail.relative_physical_stats === 1) {
          parts.push("Atk > Def");
        } else if (detail.relative_physical_stats === -1) {
          parts.push("Atk < Def");
        } else {
          parts.push("Atk = Def");
        }
      }
      if (parts.length === 0) {
        parts.push("Level up");
      }
      return { trigger: "Level Up", details: parts.join(", ") };

    case "trade":
      if (detail.held_item) {
        parts.push(`Holding ${formatName(detail.held_item.name)}`);
      }
      if (detail.trade_species) {
        parts.push(`For ${formatName(detail.trade_species.name)}`);
      }
      return { trigger: "Trade", details: parts.length > 0 ? parts.join(", ") : "" };

    case "use-item":
      if (detail.item) {
        return { trigger: "Item", details: formatName(detail.item.name) };
      }
      return { trigger: "Item", details: "Use item" };

    case "shed":
      return { trigger: "Special", details: "Empty slot + Poké Ball (Lv. 20)" };

    case "spin":
      return { trigger: "Special", details: "Spin while holding Sweet" };

    case "tower-of-darkness":
      return { trigger: "Special", details: "Tower of Darkness" };

    case "tower-of-waters":
      return { trigger: "Special", details: "Tower of Waters" };

    case "three-critical-hits":
      return { trigger: "Special", details: "Land 3 critical hits in battle" };

    case "take-damage":
      return { trigger: "Special", details: "Travel under stone bridge after taking damage" };

    case "other":
      return { trigger: "Special", details: "Special condition" };

    case "agile-style-move":
      return { trigger: "Special", details: "Use Agile Style moves 20 times" };

    case "strong-style-move":
      return { trigger: "Special", details: "Use Strong Style moves 20 times" };

    case "recoil-damage":
      return { trigger: "Special", details: "Receive 294+ recoil damage" };

    default:
      return { trigger: formatName(trigger), details: "" };
  }
}

// Recursively build evolution tree from API data
function buildEvolutionTree(link: PokeAPIEvolutionChainLink): EvolutionNode {
  const id = getIdFromUrl(link.species.url);
  return {
    name: link.species.name,
    displayName: formatDisplayName(link.species.name),
    spriteUrl: getSpriteUrl(id),
    id,
    evolutionMethod: parseEvolutionMethod(link.evolution_details),
    evolvesTo: link.evolves_to.map(buildEvolutionTree),
  };
}

export function useEvolution(pokemonName: string | null) {
  return useQuery({
    queryKey: ["evolution-tree", pokemonName],
    queryFn: async (): Promise<EvolutionTreeData> => {
      if (!pokemonName) throw new Error("No Pokemon specified");

      // Handle special forms - get base species name
      const baseName = pokemonName.split("-")[0];

      // Fetch species data to get evolution chain URL
      const species = await fetchPokemonSpecies(baseName);

      if (!species.evolution_chain) {
        // Pokemon with no evolution chain (like legendaries)
        const id = species.id;
        return {
          root: {
            name: baseName,
            displayName: formatDisplayName(baseName),
            spriteUrl: getSpriteUrl(id),
            id,
            evolutionMethod: null,
            evolvesTo: [],
          },
          currentPokemonName: baseName,
        };
      }

      // Extract evolution chain ID from URL
      const chainId = getIdFromUrl(species.evolution_chain.url);
      if (!chainId) {
        throw new Error("Could not parse evolution chain ID");
      }

      // Fetch evolution chain
      const evolutionChain = await fetchEvolutionChain(chainId);

      // Build the tree
      const root = buildEvolutionTree(evolutionChain.chain);

      return {
        root,
        currentPokemonName: baseName,
      };
    },
    enabled: !!pokemonName,
    staleTime: 5 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
    retry: 1,
  });
}
