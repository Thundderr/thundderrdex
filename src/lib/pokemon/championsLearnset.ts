import { Dex } from "@pkmn/dex";
import { moveFromDex } from "@/lib/pokeapi/battleData";
import type { LearnsetEntry, LearnMethod } from "@/types/moves";
import { getChampionsMegas } from "./championsMega";

const METHOD: Record<string, LearnMethod> = { L: "level-up", M: "machine", T: "tutor", E: "egg" };
const byName = new Map(getChampionsMegas().map((m) => [m.name, m]));

/**
 * A Champions mega's learnset = its pre-mega form's learnset (megas carry no own
 * learnset in @pkmn/dex). The pre-mega form is the mega's `changesFrom` species.
 * Sourced from @pkmn/dex gen-9 codes (e.g. "9M"=TM, "9L1"=level 1), since PokéAPI
 * has no Champions megas. TM numbers aren't known → machineNumber is null.
 */
export async function getChampionsMegaLearnset(name: string): Promise<LearnsetEntry[]> {
  const meta = byName.get(name.toLowerCase());
  if (!meta) return [];
  const gen = Dex.forGen(9);
  const sourceId = meta.changesFrom.toLowerCase().replace(/[\s_]+/g, "-");
  const ls = await gen.learnsets.get(sourceId);
  if (!ls?.learnset) return [];

  const entries: LearnsetEntry[] = [];
  for (const [moveId, codes] of Object.entries(ls.learnset)) {
    const move = moveFromDex(moveId);
    if (!move) continue;
    const seen = new Set<string>();
    for (const code of codes as string[]) {
      if (code[0] !== "9") continue; // gen 9 only
      const method = METHOD[code[1]];
      if (!method || seen.has(method)) continue;
      seen.add(method);
      const levelLearned = method === "level-up" ? parseInt(code.slice(2), 10) || 0 : null;
      entries.push({ move, learnMethod: method, levelLearned, generation: 9, machineNumber: null });
    }
  }
  return entries;
}
