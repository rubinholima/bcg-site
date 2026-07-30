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

export function formatFixtureOptionLabel(
  f: AgendaFixture,
  clubName: string,
  locale = "pt-BR",
): string {
  const side = fixtureSideLabel(f);
  const sideTag = side ? ` [${side}]` : "";
  const homeDisplay = f.homeTeamName || "?";
  const awayDisplay = /nosso\s+clube/i.test(f.awayTeamName || "")
    ? clubName
    : (f.awayTeamName ?? "?");
  const date = new Date(f.startISO).toLocaleDateString(locale);
  return `${homeDisplay} vs ${awayDisplay} — ${date}${sideTag}${f.competitionName ? ` · ${f.competitionName}` : ""}`;
}

export function upcomingFixtures(fixtures: AgendaFixture[]): AgendaFixture[] {
  const now = new Date();
  return fixtures
    .filter((f) => new Date(f.startISO) > now)
    .sort((a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime());
}
