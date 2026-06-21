import { describe, it, expect } from "vitest";
import {
  isCaughtPayload,
  isGenerationPayload,
  isModulesPayload,
} from "./validators";

describe("isCaughtPayload", () => {
  it("accepts a minimal valid payload with one bucket and a bare id", () => {
    expect(isCaughtPayload({ caught: { national: { "79": "caught" } } })).toBe(
      true
    );
  });

  it("accepts not-caught marks", () => {
    expect(
      isCaughtPayload({ caught: { national: { "1": "not-caught" } } })
    ).toBe(true);
  });

  it("accepts regional-variant keys like 79-galar", () => {
    expect(
      isCaughtPayload({
        caught: { Paldea: { "79-galar": "caught", "128": "not-caught" } },
      })
    ).toBe(true);
  });

  it("accepts multiple buckets", () => {
    expect(
      isCaughtPayload({
        caught: {
          national: { "1": "caught" },
          Paldea: { "905-hisui": "not-caught" },
        },
      })
    ).toBe(true);
  });

  it("accepts an empty caught object (no buckets to violate)", () => {
    expect(isCaughtPayload({ caught: {} })).toBe(true);
  });

  it("accepts an empty bucket", () => {
    expect(isCaughtPayload({ caught: { national: {} } })).toBe(true);
  });

  it("rejects null", () => {
    expect(isCaughtPayload(null)).toBe(false);
  });

  it("rejects undefined", () => {
    expect(isCaughtPayload(undefined)).toBe(false);
  });

  it("rejects a primitive", () => {
    expect(isCaughtPayload("caught")).toBe(false);
    expect(isCaughtPayload(42)).toBe(false);
    expect(isCaughtPayload(true)).toBe(false);
  });

  it("rejects an array at the top level", () => {
    expect(isCaughtPayload([])).toBe(false);
    expect(isCaughtPayload([{ caught: {} }])).toBe(false);
  });

  it("rejects an object missing the caught key", () => {
    expect(isCaughtPayload({})).toBe(false);
    expect(isCaughtPayload({ notCaught: {} })).toBe(false);
  });

  it("rejects when caught is not a record (array)", () => {
    expect(isCaughtPayload({ caught: [] })).toBe(false);
  });

  it("rejects when caught is null", () => {
    expect(isCaughtPayload({ caught: null })).toBe(false);
  });

  it("rejects when caught is a primitive", () => {
    expect(isCaughtPayload({ caught: "x" })).toBe(false);
  });

  it("rejects when a bucket is not a record", () => {
    expect(isCaughtPayload({ caught: { national: "caught" } })).toBe(false);
    expect(isCaughtPayload({ caught: { national: [] } })).toBe(false);
    expect(isCaughtPayload({ caught: { national: null } })).toBe(false);
  });

  it("rejects an invalid mark value", () => {
    expect(isCaughtPayload({ caught: { national: { "1": "maybe" } } })).toBe(
      false
    );
    expect(isCaughtPayload({ caught: { national: { "1": true } } })).toBe(false);
    expect(isCaughtPayload({ caught: { national: { "1": 1 } } })).toBe(false);
  });

  it("rejects an id key that is not a bare/regional id", () => {
    expect(isCaughtPayload({ caught: { national: { abc: "caught" } } })).toBe(
      false
    );
    expect(isCaughtPayload({ caught: { national: { "": "caught" } } })).toBe(
      false
    );
    expect(
      isCaughtPayload({ caught: { national: { "79-Galar": "caught" } } })
    ).toBe(false); // regex requires lowercase suffix
    expect(
      isCaughtPayload({ caught: { national: { "79-galar-x": "caught" } } })
    ).toBe(false); // only one suffix segment allowed
    expect(
      isCaughtPayload({ caught: { national: { "79-": "caught" } } })
    ).toBe(false);
  });

  it("rejects when one of several entries is invalid", () => {
    expect(
      isCaughtPayload({
        caught: { national: { "1": "caught", "2": "bogus" } },
      })
    ).toBe(false);
  });
});

describe("isGenerationPayload", () => {
  it("accepts the lower bound 1", () => {
    expect(isGenerationPayload({ globalGeneration: 1 })).toBe(true);
  });

  it("accepts the upper bound 99", () => {
    expect(isGenerationPayload({ globalGeneration: 99 })).toBe(true);
  });

  it("accepts a mid-range generation", () => {
    expect(isGenerationPayload({ globalGeneration: 9 })).toBe(true);
  });

  it("rejects null and undefined", () => {
    expect(isGenerationPayload(null)).toBe(false);
    expect(isGenerationPayload(undefined)).toBe(false);
  });

  it("rejects an array", () => {
    expect(isGenerationPayload([1])).toBe(false);
  });

  it("rejects missing key", () => {
    expect(isGenerationPayload({})).toBe(false);
    expect(isGenerationPayload({ generation: 5 })).toBe(false);
  });

  it("rejects non-number generation", () => {
    expect(isGenerationPayload({ globalGeneration: "5" })).toBe(false);
    expect(isGenerationPayload({ globalGeneration: null })).toBe(false);
    expect(isGenerationPayload({ globalGeneration: true })).toBe(false);
  });

  it("rejects non-integer generation", () => {
    expect(isGenerationPayload({ globalGeneration: 1.5 })).toBe(false);
  });

  it("rejects NaN", () => {
    expect(isGenerationPayload({ globalGeneration: NaN })).toBe(false);
  });

  it("rejects out-of-range values", () => {
    expect(isGenerationPayload({ globalGeneration: 0 })).toBe(false);
    expect(isGenerationPayload({ globalGeneration: -1 })).toBe(false);
    expect(isGenerationPayload({ globalGeneration: 100 })).toBe(false);
  });
});

describe("isModulesPayload", () => {
  const validTab = {
    id: "tab-1",
    name: "Main",
    modules: [{ id: "m1", moduleType: "pokemon" }],
    recentSearches: [],
  };

  const validPayload = {
    tabs: [validTab],
    activeTabId: "tab-1",
    selectedModuleId: null,
    savedTeams: [],
  };

  it("accepts a minimal valid payload", () => {
    expect(isModulesPayload(validPayload)).toBe(true);
  });

  it("accepts a string selectedModuleId", () => {
    expect(isModulesPayload({ ...validPayload, selectedModuleId: "m1" })).toBe(
      true
    );
  });

  it("accepts a tab with empty modules array", () => {
    expect(
      isModulesPayload({
        ...validPayload,
        tabs: [{ ...validTab, modules: [] }],
      })
    ).toBe(true);
  });

  it("accepts populated savedTeams (only checked to be an array)", () => {
    expect(
      isModulesPayload({ ...validPayload, savedTeams: [{ anything: true }] })
    ).toBe(true);
  });

  it("rejects null, undefined, primitives, and arrays", () => {
    expect(isModulesPayload(null)).toBe(false);
    expect(isModulesPayload(undefined)).toBe(false);
    expect(isModulesPayload(123)).toBe(false);
    expect(isModulesPayload("modules")).toBe(false);
    expect(isModulesPayload([])).toBe(false);
  });

  it("rejects when tabs is not an array", () => {
    expect(isModulesPayload({ ...validPayload, tabs: {} })).toBe(false);
  });

  it("rejects an empty tabs array", () => {
    expect(isModulesPayload({ ...validPayload, tabs: [] })).toBe(false);
  });

  it("rejects a non-string activeTabId", () => {
    expect(isModulesPayload({ ...validPayload, activeTabId: 1 })).toBe(false);
    expect(isModulesPayload({ ...validPayload, activeTabId: null })).toBe(false);
  });

  it("rejects missing activeTabId", () => {
    const { activeTabId, ...rest } = validPayload;
    void activeTabId;
    expect(isModulesPayload(rest)).toBe(false);
  });

  it("rejects a non-string, non-null selectedModuleId", () => {
    expect(isModulesPayload({ ...validPayload, selectedModuleId: 5 })).toBe(
      false
    );
  });

  it("rejects when savedTeams is not an array", () => {
    expect(isModulesPayload({ ...validPayload, savedTeams: {} })).toBe(false);
    expect(isModulesPayload({ ...validPayload, savedTeams: null })).toBe(false);
  });

  it("rejects a tab that is not a record", () => {
    expect(isModulesPayload({ ...validPayload, tabs: ["nope"] })).toBe(false);
    expect(isModulesPayload({ ...validPayload, tabs: [null] })).toBe(false);
  });

  it("rejects a tab missing string id or name", () => {
    expect(
      isModulesPayload({ ...validPayload, tabs: [{ ...validTab, id: 1 }] })
    ).toBe(false);
    expect(
      isModulesPayload({ ...validPayload, tabs: [{ ...validTab, name: 2 }] })
    ).toBe(false);
  });

  it("rejects a tab whose modules is not an array", () => {
    expect(
      isModulesPayload({ ...validPayload, tabs: [{ ...validTab, modules: {} }] })
    ).toBe(false);
  });

  it("rejects a tab whose recentSearches is not an array", () => {
    expect(
      isModulesPayload({
        ...validPayload,
        tabs: [{ ...validTab, recentSearches: {} }],
      })
    ).toBe(false);
  });

  it("rejects a module that is not a record", () => {
    expect(
      isModulesPayload({
        ...validPayload,
        tabs: [{ ...validTab, modules: ["nope"] }],
      })
    ).toBe(false);
  });

  it("rejects a module missing string id", () => {
    expect(
      isModulesPayload({
        ...validPayload,
        tabs: [{ ...validTab, modules: [{ moduleType: "pokemon" }] }],
      })
    ).toBe(false);
  });

  it("rejects a module missing string moduleType", () => {
    expect(
      isModulesPayload({
        ...validPayload,
        tabs: [{ ...validTab, modules: [{ id: "m1" }] }],
      })
    ).toBe(false);
  });
});
