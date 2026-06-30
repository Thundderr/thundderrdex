import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchTournamentTeams } from "./limitless";
import type { TournamentTeamsDataset } from "./types";

const dataset: TournamentTeamsDataset = {
  tournamentId: "t1",
  tournamentName: "Indianapolis Regional",
  date: "2026-05-30",
  format: "M-A",
  players: 300,
  teams: [],
};

function okResponse(body: unknown) {
  return { ok: true, json: async () => body } as Response;
}

describe("fetchTournamentTeams", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("hits the proxy route for the format and returns the dataset", async () => {
    const fetchMock = vi.fn(async (_url: string) => okResponse(dataset));
    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchTournamentTeams("champions-regma");
    expect(result.tournamentId).toBe("t1");
    expect(fetchMock.mock.calls[0][0]).toContain("/api/tournaments/champions-regma");
  });

  it("throws the server error message on a non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 404, json: async () => ({ error: "no events" }) }) as Response)
    );
    await expect(fetchTournamentTeams("champions-regma")).rejects.toThrow("no events");
  });

  it("falls back to a generic message when the error body has none", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 502, json: async () => ({}) }) as Response)
    );
    await expect(fetchTournamentTeams("champions-regma")).rejects.toThrow("502");
  });
});
