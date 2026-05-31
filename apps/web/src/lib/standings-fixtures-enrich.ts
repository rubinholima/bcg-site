import type { HomeContentBlock } from "@/types/home-content";
import type { ProximosJogosFixtureItem, TabelaStandingsRow } from "@/types/home-content";
import type { FixtureItem } from "@/lib/fixtures-shared";
import { namesMatch } from "@/lib/names-match";

const OUR_CLUB_PLACEHOLDERS = ["nosso clube", "our club"];

function resolveTeamForMatch(time: string, ourTeamName?: string | null): string {
  const t = (time ?? "").trim();
  if (!t) return "";
  if (OUR_CLUB_PLACEHOLDERS.includes(t.toLowerCase()) && ourTeamName?.trim()) {
    return ourTeamName.trim();
  }
  return t;
}

function teamSideInFixture(
  fixture: FixtureItem,
  teamName: string,
  ourTeamName?: string | null,
): "home" | "away" | null {
  const resolved = resolveTeamForMatch(teamName, ourTeamName);
  if (!resolved) return null;
  const home = (fixture.homeTeamName ?? "").trim();
  const away = (fixture.awayTeamName ?? "").trim();
  if (namesMatch(home, resolved)) return "home";
  if (namesMatch(away, resolved)) return "away";
  if (ourTeamName?.trim()) {
    if (OUR_CLUB_PLACEHOLDERS.includes(home.toLowerCase()) && namesMatch(resolved, ourTeamName)) {
      return "home";
    }
    if (OUR_CLUB_PLACEHOLDERS.includes(away.toLowerCase()) && namesMatch(resolved, ourTeamName)) {
      return "away";
    }
  }
  return null;
}

function fixtureMatchesFilters(
  fixture: FixtureItem,
  competicao?: string,
  categoria?: string,
): boolean {
  if (competicao?.trim()) {
    const cn = (fixture.competitionName ?? "").trim();
    if (cn && !namesMatch(cn, competicao)) return false;
  }
  if (categoria && categoria !== "__all__") {
    const cat = (fixture.category ?? "").trim();
    if (cat && !namesMatch(cat, categoria)) return false;
  }
  return true;
}

function resultLetter(fixture: FixtureItem, side: "home" | "away"): "W" | "D" | "L" | null {
  const hs = fixture.homeScore;
  const as = fixture.awayScore;
  if (hs == null || as == null) return null;
  const gf = side === "home" ? hs : as;
  const ga = side === "home" ? as : hs;
  if (gf > ga) return "W";
  if (gf < ga) return "L";
  return "D";
}

function manualToFixture(item: ProximosJogosFixtureItem, idx: number): FixtureItem {
  return {
    externalId: item.externalId ?? `manual-${idx}-${item.startISO}`,
    startISO: item.startISO,
    status: item.status ?? "SCHEDULED",
    competitionName: item.competitionName ?? "",
    competitionLogoUrl: item.competitionLogoUrl,
    venueName: item.venueName,
    homeTeamName: item.homeTeamName,
    awayTeamName: item.awayTeamName,
    watchUrl: item.watchUrl,
    ticketUrl: item.ticketUrl,
    featured: item.featured,
    category: item.category,
    homeTeamLogoUrl: (item as { homeTeamLogoUrl?: string }).homeTeamLogoUrl,
    awayTeamLogoUrl: (item as { awayTeamLogoUrl?: string }).awayTeamLogoUrl,
  };
}

function collectAllBlocks(blocks: HomeContentBlock[] | undefined): HomeContentBlock[] {
  if (!blocks?.length) return [];
  const out: HomeContentBlock[] = [];
  for (const b of blocks) {
    out.push(b);
    if (b.type === "section") {
      const left = (b.config?.sectionLeftModules as HomeContentBlock[] | undefined) ?? [];
      const right = (b.config?.sectionRightModules as HomeContentBlock[] | undefined) ?? [];
      out.push(...collectAllBlocks(left), ...collectAllBlocks(right));
    }
  }
  return out;
}

export function mergeFixturesFromPageBlocks(
  apiFixtures: FixtureItem[],
  blocks: HomeContentBlock[] | undefined,
): FixtureItem[] {
  const merged = [...apiFixtures];
  const seen = new Set(apiFixtures.map((f) => f.externalId || `${f.startISO}|${f.homeTeamName}|${f.awayTeamName}`));

  let idx = 0;
  for (const b of collectAllBlocks(blocks)) {
    if (b.type !== "proximos_jogos" && b.type !== "proximos_eventos") continue;
    const manual = (b.config?.proximosJogosManualFixtures as ProximosJogosFixtureItem[] | undefined) ?? [];
    for (const item of manual) {
      if (!item.startISO || !item.homeTeamName || !item.awayTeamName) continue;
      const fx = manualToFixture(item, idx++);
      const key = fx.externalId || `${fx.startISO}|${fx.homeTeamName}|${fx.awayTeamName}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(fx);
    }
  }
  return merged;
}

function buildFormString(
  fixtures: FixtureItem[],
  teamName: string,
  ourTeamName?: string | null,
): string {
  const finished = fixtures
    .filter((f) => f.status === "FINAL")
    .sort((a, b) => new Date(b.startISO).getTime() - new Date(a.startISO).getTime());

  const letters: string[] = [];
  for (const f of finished) {
    const side = teamSideInFixture(f, teamName, ourTeamName);
    if (!side) continue;
    const letter = resultLetter(f, side);
    if (letter) letters.push(letter);
    if (letters.length >= 5) break;
  }
  return letters.reverse().join(" ");
}

function buildNextMatch(
  fixtures: FixtureItem[],
  teamName: string,
  ourTeamName?: string | null,
): { proximoJogo?: string; logoProximo?: string } {
  const now = Date.now();
  const upcoming = fixtures
    .filter((f) => f.status === "SCHEDULED" || f.status === "LIVE")
    .filter((f) => teamSideInFixture(f, teamName, ourTeamName))
    .sort((a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime());

  const next =
    upcoming.find((f) => f.status === "LIVE") ??
    upcoming.find((f) => new Date(f.startISO).getTime() >= now - 5 * 60 * 60 * 1000) ??
    upcoming[0];

  if (!next) return {};

  const side = teamSideInFixture(next, teamName, ourTeamName);
  if (!side) return {};

  const opponent =
    side === "home" ? (next.awayTeamName ?? "").trim() : (next.homeTeamName ?? "").trim();
  const logo =
    side === "home" ? next.awayTeamLogoUrl?.trim() : next.homeTeamLogoUrl?.trim();

  return {
    proximoJogo: opponent || undefined,
    logoProximo: logo || undefined,
  };
}

/** Preenche Últ. e Próx. a partir dos jogos quando a planilha não trouxe esses campos. */
export function enrichStandingsRowsFromFixtures(
  rows: TabelaStandingsRow[],
  fixtures: FixtureItem[],
  options: {
    competicao?: string;
    categoria?: string;
    ourTeamName?: string | null;
  } = {},
): TabelaStandingsRow[] {
  if (!fixtures.length || !rows.length) return rows;

  const filtered = fixtures.filter((f) =>
    fixtureMatchesFilters(f, options.competicao, options.categoria),
  );
  if (!filtered.length) return rows;

  return rows.map((row) => {
    const team = row.time ?? "";
    const form =
      row.ultimosJogos?.trim() ||
      buildFormString(filtered, team, options.ourTeamName);
    const next =
      row.proximoJogo?.trim() || row.logoProximo?.trim()
        ? { proximoJogo: row.proximoJogo, logoProximo: row.logoProximo }
        : buildNextMatch(filtered, team, options.ourTeamName);

    return {
      ...row,
      ultimosJogos: form || row.ultimosJogos,
      proximoJogo: next.proximoJogo ?? row.proximoJogo,
      logoProximo: next.logoProximo ?? row.logoProximo,
    };
  });
}
