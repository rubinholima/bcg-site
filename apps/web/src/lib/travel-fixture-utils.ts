export interface AgendaFixture {
  externalId: string;
  startISO: string;
  competitionName?: string;
  venueName?: string;
  homeTeamName: string;
  awayTeamName: string;
  category?: string;
  isOurTeamHome?: boolean;
}

export function fixtureSideLabel(f: AgendaFixture): "Casa" | "Fora" | null {
  if (f.isOurTeamHome === true) return "Casa";
  if (f.isOurTeamHome === false) return "Fora";
  return null;
}

export function resolveFixtureOpponentName(f: AgendaFixture, clubName: string): string {
  if (f.isOurTeamHome === true) {
    return /nosso\s+clube/i.test(f.awayTeamName || "")
      ? clubName
      : (f.awayTeamName ?? "");
  }
  if (f.isOurTeamHome === false) {
    return f.homeTeamName || "";
  }
  return f.homeTeamName || f.awayTeamName || "";
}

export function upcomingFixtures(fixtures: AgendaFixture[]): AgendaFixture[] {
  const now = new Date();
  return fixtures
    .filter((f) => new Date(f.startISO) > now)
    .sort((a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime());
}

function isPastFixture(f: AgendaFixture, now = Date.now()): boolean {
  const t = new Date(f.startISO).getTime();
  return !Number.isNaN(t) && t < now;
}

/** Futuros + passados recentes (padrão 90 dias) — para reabrir convocação. */
export function fixturesForConvocation(
  fixtures: AgendaFixture[],
  pastDays = 90,
): AgendaFixture[] {
  const now = Date.now();
  const pastCutoff = now - pastDays * 24 * 60 * 60 * 1000;
  const filtered = fixtures.filter((f) => {
    const t = new Date(f.startISO).getTime();
    return !Number.isNaN(t) && t >= pastCutoff;
  });
  const upcoming = filtered
    .filter((f) => !isPastFixture(f, now))
    .sort((a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime());
  const past = filtered
    .filter((f) => isPastFixture(f, now))
    .sort((a, b) => new Date(b.startISO).getTime() - new Date(a.startISO).getTime());
  // Próximos primeiro; em seguida os mais recentes já jogados (para reabrir convocação).
  return [...upcoming, ...past];
}

export function formatFixtureOptionLabel(
  f: AgendaFixture,
  clubName: string,
  locale = "pt-BR",
): string {
  const side = fixtureSideLabel(f);
  const sideTag = side ? ` [${side}]` : "";
  const pastTag = isPastFixture(f) ? " [Passado]" : "";
  const homeDisplay = f.homeTeamName || "?";
  const awayDisplay = /nosso\s+clube/i.test(f.awayTeamName || "")
    ? clubName
    : (f.awayTeamName ?? "?");
  const date = new Date(f.startISO).toLocaleDateString(locale);
  return `${homeDisplay} vs ${awayDisplay} — ${date}${sideTag}${pastTag}${f.competitionName ? ` · ${f.competitionName}` : ""}`;
}

/** Ordena viagens: próximas (mais cedo primeiro) + passadas recentes (mais recente primeiro). */
export function sortTravelsForConvocation<
  T extends { matchDate: string },
>(travels: T[]): T[] {
  const now = Date.now();
  const upcoming: T[] = [];
  const past: T[] = [];
  for (const t of travels) {
    const ts = new Date(t.matchDate).getTime();
    if (!Number.isNaN(ts) && ts < now) past.push(t);
    else upcoming.push(t);
  }
  upcoming.sort(
    (a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime(),
  );
  past.sort(
    (a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime(),
  );
  return [...upcoming, ...past];
}

const TRAVEL_FIXTURE_PREFIX = "travel:";

export function travelRecordFixtureId(travelId: string): string {
  return `${TRAVEL_FIXTURE_PREFIX}${travelId}`;
}

export function parseTravelRecordFixtureId(externalId: string): string | null {
  if (!externalId.startsWith(TRAVEL_FIXTURE_PREFIX)) return null;
  return externalId.slice(TRAVEL_FIXTURE_PREFIX.length) || null;
}

/** Inclui registros de logística na lista da agenda (garante jogos passados já convocados). */
export function mergeTravelsIntoFixturesForConvocation(
  fixtures: AgendaFixture[],
  travels: Array<{
    id: string;
    matchDate: string;
    opponentName?: string | null;
    championshipName?: string | null;
    stadiumName?: string | null;
    category?: string | null;
    isHomeMatch?: boolean;
    externalId?: string | null;
    tenant?: { name?: string } | null;
  }>,
  clubName: string,
  pastDays = 90,
): AgendaFixture[] {
  const now = Date.now();
  const pastCutoff = now - pastDays * 24 * 60 * 60 * 1000;
  const covered = new Set<string>();

  for (const f of fixtures) {
    covered.add(f.externalId);
    covered.add(`${f.startISO.slice(0, 10)}|${resolveFixtureOpponentName(f, clubName).trim().toLowerCase()}`);
  }

  const extras: AgendaFixture[] = [];
  for (const t of travels) {
    const day = String(t.matchDate).slice(0, 10);
    const dayTs = new Date(t.matchDate).getTime();
    if (Number.isNaN(dayTs) || dayTs < pastCutoff) continue;
    if (t.externalId && covered.has(t.externalId)) continue;
    const opponent = (t.opponentName ?? "").trim();
    const key = `${day}|${opponent.toLowerCase()}`;
    if (covered.has(key)) continue;
    covered.add(key);
    if (t.externalId) covered.add(t.externalId);

    const club = t.tenant?.name?.trim() || clubName || "Nosso Clube";
    const isHome = t.isHomeMatch === true;
    extras.push({
      externalId: t.externalId?.trim() || travelRecordFixtureId(t.id),
      startISO: Number.isNaN(dayTs)
        ? `${day}T15:00:00.000Z`
        : new Date(t.matchDate).toISOString(),
      competitionName: t.championshipName ?? undefined,
      venueName: t.stadiumName ?? undefined,
      homeTeamName: isHome ? club : opponent || "?",
      awayTeamName: isHome ? opponent || "?" : club,
      category: t.category ?? undefined,
      isOurTeamHome: t.isHomeMatch,
    });
  }

  return fixturesForConvocation([...fixtures, ...extras], pastDays);
}
