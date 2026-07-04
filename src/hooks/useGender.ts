"use client";

import { useEffect, useState } from "react";
import { usePokemon } from "@/hooks/usePokemon";
import { genderState } from "@/lib/pokemon/gender";

/**
 * usePokemon + a gender toggle. Distinct-gender species re-fetch the female slug
 * (different data, exposed as `activeId` for callers that fetch by slug — moves,
 * sets, evolution); cosmetic species expose `spriteOverride` (front_female) with
 * the same data. `showFemale` resets whenever `baseId` changes so a new pick
 * never inherits the previous mon's toggle state.
 */
export function useGender(baseId: string | null) {
  const [showFemale, setShowFemale] = useState(false);
  useEffect(() => setShowFemale(false), [baseId]);
  const base = usePokemon(baseId);
  const gs = baseId ? genderState(baseId, base.data) : null;
  const activeId = gs?.kind === "distinct" && showFemale ? gs.femaleId : baseId;
  // When activeId === baseId this dedupes to the same React Query entry.
  const active = usePokemon(activeId);
  return {
    ...active,
    activeId,
    hasGenderToggle: !!gs,
    showFemale,
    setShowFemale,
    spriteOverride: gs?.kind === "cosmetic" && showFemale ? gs.femaleSprite : undefined,
  };
}
