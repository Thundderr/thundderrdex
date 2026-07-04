import { describe, it, expect } from "vitest";
import { parsePikalyticsMon, pikalyticsSlug, extractChampionsCode } from "./pikalytics";

// Trimmed but faithful sample of a real /ai/pokedex/{code}/Pyroar page.
const PYROAR_MD = `# Pyroar - Best Builds, Moves and Teams

## Best Pyroar Quick Info

| Property | Value |
|----------|-------|
| **Format** | Pokemon Champions VGC 2026 Reg M-B S3 Ranked Battle Data (\`battledataregmbs3\`) |
| **Win Rate** | 53.006% |
| **Record** | 845-749-3 |

## Common Moves
- **Heat Wave**: 99.6%
- **Protect**: 99.2%
- **Overheat**: 72.9%

## Common Abilities
- **Unnerve**: 88.5%
- **Moxie**: 6.4%

## Common Items
- **Pyroarite**: 99.9%

## Common Teammates
- **Whimsicott**: undefined%
- **Garchomp**: undefined%

### What is the most common EV Spread and Nature for Pyroar?
The top build for Pyroar features a **Modest** nature with an EV spread of \`2/0/0/32/0/32\`. This configuration accounts for 52.0% of competitive builds.
`;

describe("parsePikalyticsMon", () => {
  const e = parsePikalyticsMon("Pyroar", PYROAR_MD);
  it("parses headline win rate + record + format label", () => {
    expect(e.notCharted).toBe(false);
    expect(e.winRate).toBeCloseTo(53.006, 3);
    expect(e.record).toBe("845-749-3");
    expect(e.formatLabel).toContain("Reg M-B S3");
  });
  it("parses moves/items/abilities with %", () => {
    expect(e.moves[0]).toEqual({ name: "Heat Wave", pct: 99.6 });
    expect(e.items[0]).toEqual({ name: "Pyroarite", pct: 99.9 });
    expect(e.abilities.map((a) => a.name)).toContain("Unnerve");
  });
  it("parses the EV spread + nature + pct", () => {
    expect(e.spread).toEqual({ nature: "Modest", evs: { hp: 2, atk: 0, def: 0, spa: 32, spd: 0, spe: 32 }, pct: 52 });
  });
  it("lists teammate names (percentless upstream)", () => {
    expect(e.teammates).toEqual(["Whimsicott", "Garchomp"]);
  });
  it("flags an empty/404 page as notCharted without throwing", () => {
    const nc = parsePikalyticsMon("Nothing", "");
    expect(nc.notCharted).toBe(true);
    expect(nc.moves).toEqual([]);
  });
  it("treats a page with a '## Best' heading but no moves section as notCharted", () => {
    const nc = parsePikalyticsMon("X", "# X\n## Best Practices\nsome unrelated content");
    expect(nc.notCharted).toBe(true);
  });
  it("handles CRLF line endings without bleeding sections together", () => {
    const crlf = PYROAR_MD.replace(/\n/g, "\r\n");
    const e2 = parsePikalyticsMon("Pyroar", crlf);
    expect(e2.notCharted).toBe(false);
    expect(e2.moves[0]).toEqual({ name: "Heat Wave", pct: 99.6 });
    // Items must not contain moves — sections stayed separate.
    expect(e2.items.map((i) => i.name)).not.toContain("Heat Wave");
  });
});

describe("pikalyticsSlug", () => {
  it("maps a normal mon via toShowdownName", () => {
    expect(pikalyticsSlug("pyroar-male")).toBe("Pyroar");
    expect(pikalyticsSlug("incineroar")).toBe("Incineroar");
  });
  it("maps a Champions mega to its pre-mega form by default", () => {
    expect(pikalyticsSlug("pyroar-mega")).toBe("Pyroar");
    // Mega Floette's competitive form is Floette-Eternal, not plain Floette.
    expect(pikalyticsSlug("floette-mega")).toBe("Floette-Eternal");
  });
  it("uses the mega name when megaForm is set", () => {
    expect(pikalyticsSlug("pyroar-mega", { megaForm: true })).toBe("Pyroar-Mega");
  });
});

describe("extractChampionsCode", () => {
  it("pulls the live season code + label", () => {
    const r = extractChampionsCode("... format `battledataregmbs3` Pokemon Champions VGC 2026 Reg M-B S3 Ranked Battle Data ...");
    expect(r?.code).toBe("battledataregmbs3");
    expect(r?.label).toContain("Reg M-B S3");
  });
  it("returns null when absent", () => {
    expect(extractChampionsCode("no code here")).toBeNull();
  });
});
