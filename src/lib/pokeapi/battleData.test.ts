import { describe, it, expect } from "vitest";
import { moveFromDex, abilityDescriptionFromDex } from "./battleData";

describe("moveFromDex", () => {
  it("resolves a damaging move's canonical battle data", () => {
    const m = moveFromDex("focus-blast");
    expect(m).not.toBeNull();
    expect(m!).toMatchObject({
      name: "focus-blast", // keeps the PokéAPI-style id
      displayName: "Focus Blast",
      type: "fighting",
      damageClass: "special",
      power: 120,
      accuracy: 70,
      pp: 5,
      priority: 0,
    });
    expect(m!.description.length).toBeGreaterThan(0);
  });

  it("maps a status move's 0 base power and always-hit accuracy to null", () => {
    const m = moveFromDex("swords-dance");
    expect(m!.damageClass).toBe("status");
    expect(m!.power).toBeNull();
    expect(m!.accuracy).toBeNull(); // never-miss
  });

  it("maps a never-miss damaging move's accuracy to null but keeps its power", () => {
    const m = moveFromDex("aerial-ace");
    expect(m!.damageClass).toBe("physical");
    expect(m!.power).toBe(60);
    expect(m!.accuracy).toBeNull();
  });

  it("carries move priority", () => {
    expect(moveFromDex("quick-attack")!.priority).toBe(1);
  });

  it("normalizes ids: hyphenated and condensed forms resolve to the same move", () => {
    const hyphenated = moveFromDex("thunder-punch")!;
    const condensed = moveFromDex("thunderpunch")!;
    expect(hyphenated.displayName).toBe("Thunder Punch");
    // Same underlying move data; only `name` echoes the caller's id form.
    expect(hyphenated.id).toBe(condensed.id);
    expect(hyphenated.type).toBe(condensed.type);
    expect(hyphenated.power).toBe(condensed.power);
    expect(hyphenated.name).toBe("thunder-punch");
    expect(condensed.name).toBe("thunderpunch");
  });

  it("returns null for a move that does not exist", () => {
    expect(moveFromDex("definitely-not-a-move")).toBeNull();
  });
});

describe("abilityDescriptionFromDex", () => {
  it("returns a real description for a known ability", () => {
    const desc = abilityDescriptionFromDex("intimidate");
    expect(desc.length).toBeGreaterThan(0);
    expect(desc).not.toBe("No description available.");
  });

  it("normalizes ids (hyphenated form resolves)", () => {
    expect(abilityDescriptionFromDex("rough-skin")).not.toBe("No description available.");
  });

  it("falls back for an unknown ability", () => {
    expect(abilityDescriptionFromDex("not-a-real-ability")).toBe("No description available.");
  });
});
