import { Dex } from "@pkmn/dex";

/**
 * Smogon usage data uses condensed ids (`choicescarf`, `surgingstrikes`,
 * `roughskin`). @pkmn/dex resolves those to display names ("Choice Scarf",
 * "Surging Strikes", "Rough Skin"). Gen 9 is fine for naming — names don't drift
 * across gens for our purposes.
 */
const gen = Dex.forGen(9);

export function itemDisplayName(id: string): string {
  return gen.items.get(id)?.name ?? id;
}

export function moveDisplayName(id: string): string {
  return gen.moves.get(id)?.name ?? id;
}

export function abilityDisplayName(id: string): string {
  return gen.abilities.get(id)?.name ?? id;
}

export function speciesDisplayName(id: string): string {
  return gen.species.get(id)?.name ?? id;
}

/** Title-case a Tera type id ("water" → "Water"). */
export function teraDisplayName(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

/** A species' types as lowercase type ids (["dragon","ground"]), or null if unknown. */
export function speciesTypes(id: string): string[] | null {
  const s = gen.species.get(id);
  if (!s || !s.exists || !s.types?.length) return null;
  return s.types.map((t) => t.toLowerCase());
}

/** A move's attacking type (lowercase) + whether it deals damage; null if unknown. */
export function moveInfo(id: string): { type: string; damaging: boolean } | null {
  const m = gen.moves.get(id);
  if (!m || !m.exists) return null;
  return { type: m.type.toLowerCase(), damaging: m.category !== "Status" && (m.basePower ?? 0) > 0 };
}
