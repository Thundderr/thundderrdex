import { describe, it, expect } from "vitest";
import { getChampionsMegaLearnset } from "./championsLearnset";

describe("getChampionsMegaLearnset", () => {
  it("sources the pre-mega form's learnset for Champions megas", async () => {
    const pyroar = await getChampionsMegaLearnset("pyroar-mega");
    expect(pyroar.length).toBeGreaterThan(20);
    expect(pyroar.every((e) => e.move && e.move.displayName)).toBe(true);
    expect(pyroar.some((e) => e.learnMethod === "level-up")).toBe(true);

    const floette = await getChampionsMegaLearnset("floette-mega");
    expect(floette.length).toBeGreaterThan(10);
  });
  it("returns [] for a non-champions name", async () => {
    expect(await getChampionsMegaLearnset("incineroar")).toEqual([]);
  });
});
