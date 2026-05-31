import type { HomeContentBlock } from "@/types/home-content";
import type { ProximosJogosFixtureItem, TabelaStandingsRow } from "@/types/home-content";
import type { FixtureItem } from "@/lib/fixtures-shared";
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

function fixtureMatchesFilters(
  fixture: FixtureItem,
  competicao?: string,
  categoria?: string,
): boolean {
  if (!competitionMatchForStandings(competicao, fixture.competitionName)) return false;
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

/** Mesma lógica do Últimos Resultados: placares manuais + status FINAL para jogos passados. */
export function prepareFixturesForStandings(
  apiFixtures: FixtureItem[],
  blocks: HomeContentBlock[] | undefined,
): FixtureItem[] {
  /** API já traz proximosJogosManualFixtures; aqui só aplicamos placares de Últimos Resultados. */
  const merged = [...apiFixtures];
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
    .filter((f) => f.status === "FINAL" || f.status === "LIVE")
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
    .filter((f) => {
      if (f.status === "FINAL") return false;
      if (f.status === "LIVE") return true;
      return new Date(f.startISO).getTime() >= now - 60 * 60 * 1000;
    })
    .filter((f) => teamSideInFixture(f, teamName, ourTeamName) != null)
    .sort((a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime());

  const next = upcoming[0];
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

/**
 * Preenche Últ. e Próx. somente a partir dos jogos FMF (fixtures + placares de Últimos Resultados).
 * Ignora colunas ultimos_jogos / proximo_jogo da planilha e não infere nada da tabela (V/E/D/P).
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

  const clearLegacy = (row: TabelaStandingsRow): TabelaStandingsRow => ({
    ...row,
    ultimosJogos: undefined,
    proximoJogo: undefined,
    logoProximo: undefined,
  });

  if (!fixtures.length) {
    return rows.map(clearLegacy);
  }

  const byFilter = fixtures.filter((f) =>
    fixtureMatchesFilters(f, options.competicao, options.categoria),
  );
  const pool = byFilter.length > 0 ? byFilter : fixtures;

  return rows.map((row) => {
    const team = row.time ?? "";
    const ultimosJogos = buildFormString(pool, team, options.ourTeamName) || undefined;
    const next = buildNextMatch(pool, team, options.ourTeamName);

    return {
      ...row,
      ultimosJogos,
      proximoJogo: next.proximoJogo,
      logoProximo: next.logoProximo,
    };
  });
}
