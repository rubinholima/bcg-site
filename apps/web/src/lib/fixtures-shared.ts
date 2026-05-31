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

import { buildBackendUrl } from "@/lib/apiProxy";

export type FixturesFetchContext = "tenant" | "event";

export type FetchFixturesOptions = {
  /** Só para tabela de classificação — inclui jogos de todos os times da competição. */
  forStandings?: boolean;
};

export async function fetchFixtures(
  slug: string,
  context: FixturesFetchContext = "tenant",
  options?: FetchFixturesOptions,
): Promise<FixtureItem[]> {
  const isClient = typeof window !== "undefined";
  const standingsQs =
    options?.forStandings && context === "tenant" ? "?forStandings=1" : "";
  const path =
    context === "event"
      ? `/public/events/${encodeURIComponent(slug)}/fixtures`
      : `/public/tenants/${encodeURIComponent(slug)}/fixtures${standingsQs}`;
  const url = isClient
    ? context === "event"
      ? `/api/public/events/${encodeURIComponent(slug)}/fixtures`
      : `/api/public/tenants/${encodeURIComponent(slug)}/fixtures${standingsQs}`
    : buildBackendUrl(path);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
