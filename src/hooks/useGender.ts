"use client";

import { useState } from "react";
import { usePokemon } from "@/hooks/usePokemon";
import { genderState } from "@/lib/pokemon/gender";

/**
 * usePokemon + a gender toggle. Distinct-gender species re-fetch the female slug
 * (different data); cosmetic species expose `spriteOverride` (front_female) with
 * the same data. `showFemale` resets is the caller's concern (keyed by baseId).
 */
export function useGender(baseId: string | null) {
  const [showFemale, setShowFemale] = useState(false);
  const base = usePokemon(baseId);
  const gs = baseId ? genderState(baseId, base.data) : null;
  const activeId = gs?.kind === "distinct" && showFemale ? gs.femaleId! : baseId;
  // When activeId === baseId this dedupes to the same React Query entry.
  const active = usePokemon(activeId);
  return {
    ...active,
    hasGenderToggle: !!gs,
    showFemale,
    setShowFemale,
    spriteOverride: gs?.kind === "cosmetic" && showFemale ? gs.femaleSprite : undefined,
  };
}
