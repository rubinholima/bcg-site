import type { HomeContentBlock } from "@/types/home-content";
import type { ProximosJogosFixtureItem, TabelaStandingsRow } from "@/types/home-content";
import type { FixtureItem } from "@/lib/fixtures-shared";
import { FIXTURE_CATEGORIES } from "@/lib/fixture-categories";
import {
  competitionMatchForStandings,
  namesMatch,
  teamsMatchForStandings,
} from "@/lib/names-match";

const OUR_CLUB_PLACEHOLDERS = ["nosso clube", "our club"];

type ManualScores = Record<string, { homeScore?: number; awayScore?: number }>;

function resolveTeamForMatch(time: string, ourTeamName?: string | null): string {
  const t = (time ?? "").trim();
  if (!t) return "";
  if (OUR_CLUB_PLACEHOLDERS.includes(t.toLowerCase()) && ourTeamName?.trim()) {
    return ourTeamName.trim();
  }
  return t;
}

function resolveOpponentDisplayName(name: string, ourTeamName?: string | null): string {
  const t = (name ?? "").trim();
  if (!t) return "";
  if (OUR_CLUB_PLACEHOLDERS.includes(t.toLowerCase()) && ourTeamName?.trim()) {
    return ourTeamName.trim();
  }
  if (ourTeamName?.trim() && teamsMatchForStandings(t, ourTeamName)) {
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

  if (teamsMatchForStandings(resolved, home)) return "home";
  if (teamsMatchForStandings(resolved, away)) return "away";

  if (ourTeamName?.trim()) {
    if (
      OUR_CLUB_PLACEHOLDERS.includes(home.toLowerCase()) &&
      teamsMatchForStandings(resolved, ourTeamName)
    ) {
      return "home";
    }
    if (
      OUR_CLUB_PLACEHOLDERS.includes(away.toLowerCase()) &&
      teamsMatchForStandings(resolved, ourTeamName)
    ) {
      return "away";
    }
  }
  return null;
}

/** Tabela usa label ("Módulo II"); jogos usam value ("modulo_ii"). */
function categoryMatchForStandings(
  tableCategory: string | undefined,
  fixtureCategory: string | undefined,
): boolean {
  if (!tableCategory?.trim() || tableCategory === "__all__") return true;
  const fc = (fixtureCategory ?? "").trim() || "principal";
  const tc = tableCategory.trim();
  if (namesMatch(fc, tc)) return true;

  const tableCat = FIXTURE_CATEGORIES.find(
    (c) => namesMatch(c.labelPT, tc) || namesMatch(c.labelEN, tc) || namesMatch(c.value, tc),
  );
  const fixtureCat = FIXTURE_CATEGORIES.find(
    (c) => namesMatch(c.value, fc) || namesMatch(c.labelPT, fc) || namesMatch(c.labelEN, fc),
  );

  if (tableCat && fixtureCat) return tableCat.value === fixtureCat.value;
  if (tableCat) return namesMatch(fc, tableCat.value);
  if (fixtureCat) return namesMatch(tc, fixtureCat.labelPT) || namesMatch(tc, fixtureCat.value);
  return namesMatch(fc, tc);
}

function fixtureMatchesFilters(
  fixture: FixtureItem,
  competicao?: string,
  categoria?: string,
): boolean {
  if (!competitionMatchForStandings(competicao, fixture.competitionName)) return false;
  if (!categoryMatchForStandings(categoria, fixture.category)) return false;
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
    homeScore: (item as { homeScore?: number }).homeScore,
    awayScore: (item as { awayScore?: number }).awayScore,
  };
}

function collectAllBlocks(blocks: HomeContentBlock[] | undefined): HomeContentBlock[] {
  if (!blocks?.length) return [];
  const out: HomeContentBlock[] = [];
  for (const b of blocks) {
    out.push(b);
    if (b.type === "section") {
      const left = (b.config?.sectionLeftModules as HomeContentBlock[] | undefined) ?? [];
      const middle = (b.config?.sectionMiddleModules as HomeContentBlock[] | undefined) ?? [];
      const right = (b.config?.sectionRightModules as HomeContentBlock[] | undefined) ?? [];
      out.push(...collectAllBlocks(left), ...collectAllBlocks(middle), ...collectAllBlocks(right));
    }
  }
  return out;
}

function collectResultadosManuais(blocks: HomeContentBlock[] | undefined): ManualScores {
  const out: ManualScores = {};
  for (const b of collectAllBlocks(blocks)) {
    if (b.type !== "ultimos_resultados" && b.type !== "ultimos_eventos") continue;
    const manual = b.config?.resultadosManuais as ManualScores | undefined;
    if (manual && typeof manual === "object") {
      Object.assign(out, manual);
    }
  }
  return out;
}

function isFinishedFixture(f: FixtureItem, now: number): boolean {
  if (f.status === "FINAL" || f.status === "LIVE") return true;
  const hasScore = typeof f.homeScore === "number" && typeof f.awayScore === "number";
  if (!hasScore) return false;
  return new Date(f.startISO).getTime() < now - 2 * 60 * 60 * 1000;
}

function isUpcomingFixture(f: FixtureItem, now: number): boolean {
  if (f.status === "FINAL") return false;
  const hasScore = typeof f.homeScore === "number" && typeof f.awayScore === "number";
  const isPast = new Date(f.startISO).getTime() < now - 60 * 60 * 1000;
  if (hasScore && isPast) return false;
  if (f.status === "LIVE") return true;
  return new Date(f.startISO).getTime() >= now - 60 * 60 * 1000;
}

/** Mesma lógica do Últimos Resultados: placares manuais + status FINAL para jogos passados. */
export function prepareFixturesForStandings(
  apiFixtures: FixtureItem[],
  blocks: HomeContentBlock[] | undefined,
): FixtureItem[] {
  const merged = mergeFixturesFromPageBlocks(apiFixtures, blocks);
  const resultadosManuais = collectResultadosManuais(blocks);
  const now = Date.now();

  return merged.map((f) => {
    const manual = resultadosManuais[f.externalId];
    const homeScore =
      typeof manual?.homeScore === "number" ? manual.homeScore : f.homeScore;
    const awayScore =
      typeof manual?.awayScore === "number" ? manual.awayScore : f.awayScore;
    const hasScore = typeof homeScore === "number" && typeof awayScore === "number";
    const isPast = new Date(f.startISO).getTime() < now - 2 * 60 * 60 * 1000;

    let status = f.status;
    if (hasScore && isPast) status = "FINAL";
    else if (hasScore && status === "SCHEDULED") status = "FINAL";

    return {
      ...f,
      homeScore,
      awayScore,
      status,
    };
  });
}

export function mergeFixturesFromPageBlocks(
  apiFixtures: FixtureItem[],
  blocks: HomeContentBlock[] | undefined,
): FixtureItem[] {
  const merged = [...apiFixtures];
  const seen = new Set(
    apiFixtures.map((f) => f.externalId || `${f.startISO}|${f.homeTeamName}|${f.awayTeamName}`),
  );

  let idx = 0;
  for (const b of collectAllBlocks(blocks)) {
    if (b.type === "proximos_jogos" || b.type === "proximos_eventos") {
      const manual =
        (b.config?.proximosJogosManualFixtures as ProximosJogosFixtureItem[] | undefined) ?? [];
      for (const item of manual) {
        if (!item.startISO || !item.homeTeamName || !item.awayTeamName) continue;
        const fx = manualToFixture(item, idx++);
        const key = fx.externalId || `${fx.startISO}|${fx.homeTeamName}|${fx.awayTeamName}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(fx);
      }
    }

    if (b.type === "tabela") {
      const league =
        (b.config?.tabelaLeagueFixtures as ProximosJogosFixtureItem[] | undefined) ?? [];
      for (const item of league) {
        if (!item.startISO || !item.homeTeamName || !item.awayTeamName) continue;
        const fx = manualToFixture(item, idx++);
        const key = fx.externalId || `${fx.startISO}|${fx.homeTeamName}|${fx.awayTeamName}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(fx);
      }
    }
  }
  return merged;
}

function buildFormString(
  fixtures: FixtureItem[],
  teamName: string,
  ourTeamName?: string | null,
): string {
  const now = Date.now();
  const finished = fixtures
    .filter((f) => isFinishedFixture(f, now))
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
    .filter((f) => isUpcomingFixture(f, now))
    .filter((f) => teamSideInFixture(f, teamName, ourTeamName) != null)
    .sort((a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime());

  const next = upcoming[0];
  if (!next) return {};

  const side = teamSideInFixture(next, teamName, ourTeamName);
  if (!side) return {};

  const rawOpponent =
    side === "home" ? (next.awayTeamName ?? "").trim() : (next.homeTeamName ?? "").trim();
  const opponent = resolveOpponentDisplayName(rawOpponent, ourTeamName);
  const logo =
    side === "home" ? next.awayTeamLogoUrl?.trim() : next.homeTeamLogoUrl?.trim();

  return {
    proximoJogo: opponent || undefined,
    logoProximo: logo || undefined,
  };
}

/**
 * Preenche Últ. e Próx. a partir dos mesmos jogos FMF usados em Próximos Jogos / Últimos Resultados.
 */
export function enrichStandingsRowsFromFixtures(
  rows: TabelaStandingsRow[],
  fixtures: FixtureItem[],
  options: {
    competicao?: string;
    categoria?: string;
    ourTeamName?: string | null;
  } = {},
): TabelaStandingsRow[] {
  if (!rows.length) return rows;

  if (!fixtures.length) {
    return rows;
  }

  const pool = fixtures.filter((f) =>
    fixtureMatchesFilters(f, options.competicao, options.categoria),
  );
  const effectivePool = pool.length > 0 ? pool : fixtures;

  return rows.map((row) => {
    const team = row.time ?? "";
    const ultimosJogos =
      buildFormString(effectivePool, team, options.ourTeamName) ||
      row.ultimosJogos?.trim() ||
      undefined;
    const next = buildNextMatch(effectivePool, team, options.ourTeamName);

    return {
      ...row,
      ultimosJogos,
      proximoJogo: next.proximoJogo ?? row.proximoJogo?.trim() ?? undefined,
      logoProximo: next.logoProximo ?? row.logoProximo?.trim() ?? undefined,
    };
  });
}
