/** Item de jogo — usado por Próximos Jogos e Últimos Resultados */
export interface FixtureItem {
  externalId: string;
  startISO: string;
  status: "SCHEDULED" | "LIVE" | "FINAL";
  competitionName: string;
  competitionLogoUrl?: string;
  venueName?: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore?: number;
  awayScore?: number;
  watchUrl?: string;
  ticketUrl?: string;
  featured?: boolean;
  category?: string;
  isOurTeamHome?: boolean;
  homeTeamLogoUrl?: string;
  awayTeamLogoUrl?: string;
}

export async function fetchFixtures(slug: string): Promise<FixtureItem[]> {
  const url =
    typeof window !== "undefined"
      ? `/api/public/tenants/${encodeURIComponent(slug)}/fixtures`
      : `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/public/tenants/${encodeURIComponent(slug)}/fixtures`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
