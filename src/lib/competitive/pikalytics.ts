import type { UsageOption, SpreadOption } from "./types";
import { toShowdownName } from "@/lib/pokemon/names";
import { getChampionsMegas } from "@/lib/pokemon/championsMega";

/** One Pokémon's official-ranked usage from Pikalytics (parsed from /ai markdown). */
export interface PikalyticsEntry {
  name: string;
  formatLabel: string | null;
  winRate: number | null;
  record: string | null;
  moves: UsageOption[];
  items: UsageOption[];
  abilities: UsageOption[];
  spread: SpreadOption | null;
  teammates: string[];
  notCharted: boolean;
}

/** Body of a `## {header}` section, up to the next `## ` heading.
 *  Assumes newlines are already normalized to `\n` (see parsePikalyticsMon). */
function section(md: string, header: string): string {
  const start = md.indexOf(`## ${header}`);
  if (start === -1) return "";
  const rest = md.slice(start + `## ${header}`.length);
  const end = rest.indexOf("\n## ");
  return end === -1 ? rest : rest.slice(0, end);
}

function sectionOptions(md: string, header: string): UsageOption[] {
  const out: UsageOption[] = [];
  for (const m of section(md, header).matchAll(/- \*\*(.+?)\*\*:\s*([\d.]+)%/g)) {
    out.push({ name: m[1].trim(), pct: parseFloat(m[2]) });
  }
  return out;
}

function sectionNames(md: string, header: string): string[] {
  return [...section(md, header).matchAll(/- \*\*(.+?)\*\*:/g)].map((m) => m[1].trim());
}

const EMPTY = (name: string): PikalyticsEntry => ({
  name, formatLabel: null, winRate: null, record: null,
  moves: [], items: [], abilities: [], spread: null, teammates: [], notCharted: true,
});

export function parsePikalyticsMon(name: string, rawMarkdown: string): PikalyticsEntry {
  // Normalize CRLF so the `\n## ` section terminator is reliable.
  const markdown = (rawMarkdown ?? "").replace(/\r\n/g, "\n");
  // Require the moves section — the reliable marker of a real charted page. A
  // 404/error/unrelated page (which may still contain a "## Best…" heading)
  // must fall through to notCharted rather than parse as an empty entry.
  if (!markdown.includes("## Common Moves")) return EMPTY(name);

  const win = markdown.match(/\*\*Win Rate\*\*\s*\|\s*([\d.]+)%/);
  const rec = markdown.match(/\*\*Record\*\*\s*\|\s*([\d-]+)/);
  const fmt = markdown.match(/\*\*Format\*\*\s*\|\s*(.+?)\s*(?:\(|\|)/);

  let spread: SpreadOption | null = null;
  const sp = markdown.match(/EV spread of `(\d+)\/(\d+)\/(\d+)\/(\d+)\/(\d+)\/(\d+)`/);
  if (sp) {
    const [hp, atk, def, spa, spd, spe] = sp.slice(1).map(Number);
    const nat = markdown.match(/features a \*\*(.*?)\*\* nature/);
    const pct = markdown.match(/accounts for ([\d.]+)% of competitive builds/);
    spread = { nature: (nat?.[1] ?? "").trim(), evs: { hp, atk, def, spa, spd, spe }, pct: pct ? parseFloat(pct[1]) : 0 };
  }

  return {
    name,
    formatLabel: fmt ? fmt[1].trim() : null,
    winRate: win ? parseFloat(win[1]) : null,
    record: rec ? rec[1] : null,
    moves: sectionOptions(markdown, "Common Moves"),
    items: sectionOptions(markdown, "Common Items"),
    abilities: sectionOptions(markdown, "Common Abilities"),
    spread,
    teammates: sectionNames(markdown, "Common Teammates"),
    notCharted: false,
  };
}

/** App PokéAPI name → Pikalytics URL mon slug (Showdown display name). */
export function pikalyticsSlug(appName: string, opts: { megaForm?: boolean } = {}): string {
  if (!opts.megaForm) {
    const mega = getChampionsMegas().find((m) => m.name === appName.toLowerCase());
    if (mega) return mega.baseSpecies; // Pikalytics charts the mega under its base
  }
  return toShowdownName(appName);
}

/** Pull the live Champions season code + label from a Pikalytics /ai page body. */
export function extractChampionsCode(text: string): { code: string; label: string } | null {
  const m = text.match(/battledataregm[a-z0-9]+/i);
  if (!m) return null;
  const label = text.match(/Pok[eé]mon Champions VGC[^\n|)]*Ranked Battle Data/)?.[0]?.trim()
    ?? "Champions Ranked";
  return { code: m[0].toLowerCase(), label };
}
