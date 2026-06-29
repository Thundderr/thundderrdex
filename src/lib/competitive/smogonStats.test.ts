import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { indexBySpecies, fetchUsageDataset, loadUsage } from "./smogonStats";
import type { UsageDataset } from "./types";

const dataset: UsageDataset = {
  smogonFormat: "gen9championsvgc2026regma",
  month: "2026-05",
  cutoff: 1760,
  battles: 1000,
  entries: [
    { name: "Incineroar", species: "incineroar", usagePct: 40, rawCount: 1, abilities: [], items: [], moves: [], tera: [], teammates: [], spreads: [] },
    { name: "Urshifu-Rapid-Strike", species: "urshifu-rapid-strike", usagePct: 43, rawCount: 1, abilities: [], items: [], moves: [], tera: [], teammates: [], spreads: [] },
  ],
};

function okResponse(body: unknown) {
  return { ok: true, json: async () => body } as Response;
}

describe("indexBySpecies", () => {
  it("keys entries by app species id", () => {
    const idx = indexBySpecies(dataset);
    expect(idx.size).toBe(2);
    expect(idx.get("incineroar")?.usagePct).toBe(40);
    expect(idx.get("urshifu-rapid-strike")?.name).toBe("Urshifu-Rapid-Strike");
  });
});

describe("fetchUsageDataset", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("hits the proxy route with query params and returns the dataset", async () => {
    const fetchMock = vi.fn(async (_url: string) => okResponse(dataset));
    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchUsageDataset("champions-regma", { cutoff: 1630, month: "2026-04" });
    expect(result.smogonFormat).toBe("gen9championsvgc2026regma");
    const url = fetchMock.mock.calls[0][0];
    expect(url).toContain("/api/usage/champions-regma");
    expect(url).toContain("cutoff=1630");
    expect(url).toContain("month=2026-04");
  });

  it("throws with the server error message on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 502, json: async () => ({ error: "boom" }) }) as Response));
    await expect(fetchUsageDataset("champions-regma")).rejects.toThrow("boom");
  });
});

describe("loadUsage (session cache)", () => {
  beforeEach(() => vi.unstubAllGlobals());
  afterEach(() => vi.unstubAllGlobals());

  it("dedupes concurrent/repeat loads for the same key", async () => {
    const fetchMock = vi.fn(async () => okResponse(dataset));
    vi.stubGlobal("fetch", fetchMock);
    // distinct cutoff → fresh cache key for this test
    const a = loadUsage("champions-regma", { cutoff: 1500 });
    const b = loadUsage("champions-regma", { cutoff: 1500 });
    await Promise.all([a, b]);
    await loadUsage("champions-regma", { cutoff: 1500 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("evicts a failed load so the next call retries", async () => {
    let call = 0;
    const fetchMock = vi.fn(async () => {
      call++;
      if (call === 1) throw new Error("network down");
      return okResponse(dataset);
    });
    vi.stubGlobal("fetch", fetchMock);
    // distinct cutoff → isolated cache key
    await expect(loadUsage("champions-regma", { cutoff: 1630 })).rejects.toThrow("network down");
    const ok = await loadUsage("champions-regma", { cutoff: 1630 });
    expect(ok.smogonFormat).toBe("gen9championsvgc2026regma");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
