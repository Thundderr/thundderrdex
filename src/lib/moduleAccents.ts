import { ModuleType } from "@/types/module";

/**
 * Single source of truth for per-module accent colours.
 *
 * Previously the Header (solid button backgrounds) and the Sidebar (text colours)
 * each kept their own, slightly disagreeing colour maps. Every surface that needs
 * a module's colour now reads from here, keyed by the canonical `ModuleType`.
 */
export interface ModuleAccent {
  /** Tailwind colour family, e.g. "blue". */
  name: string;
  /** Solid filled background + hover (buttons, badges). */
  solid: string;
  /** Accent text colour for labels on dark surfaces. */
  text: string;
  /** Selection / focus ring colour. */
  ring: string;
  /** Small status dot. */
  dot: string;
}

export const MODULE_ACCENTS: Record<ModuleType, ModuleAccent> = {
  pokemon: { name: "blue", solid: "bg-blue-600 hover:bg-blue-500", text: "text-blue-300", ring: "ring-blue-500", dot: "bg-blue-500" },
  "type-chart": { name: "cyan", solid: "bg-cyan-600 hover:bg-cyan-500", text: "text-cyan-300", ring: "ring-cyan-500", dot: "bg-cyan-500" },
  "nature-chart": { name: "pink", solid: "bg-pink-600 hover:bg-pink-500", text: "text-pink-300", ring: "ring-pink-500", dot: "bg-pink-500" },
  "team-builder": { name: "purple", solid: "bg-purple-600 hover:bg-purple-500", text: "text-purple-300", ring: "ring-purple-500", dot: "bg-purple-500" },
  "damage-calc": { name: "orange", solid: "bg-orange-600 hover:bg-orange-500", text: "text-orange-300", ring: "ring-orange-500", dot: "bg-orange-500" },
  location: { name: "green", solid: "bg-green-600 hover:bg-green-500", text: "text-green-300", ring: "ring-green-500", dot: "bg-green-500" },
  pokedex: { name: "emerald", solid: "bg-emerald-600 hover:bg-emerald-500", text: "text-emerald-300", ring: "ring-emerald-500", dot: "bg-emerald-500" },
  "catch-rate": { name: "red", solid: "bg-red-600 hover:bg-red-500", text: "text-red-300", ring: "ring-red-500", dot: "bg-red-500" },
  training: { name: "indigo", solid: "bg-indigo-600 hover:bg-indigo-500", text: "text-indigo-300", ring: "ring-indigo-500", dot: "bg-indigo-500" },
};

export function moduleAccent(type: ModuleType): ModuleAccent {
  return MODULE_ACCENTS[type] ?? MODULE_ACCENTS.pokemon;
}
