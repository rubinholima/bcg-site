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

export async function fetchFixtures(slug: string): Promise<FixtureItem[]> {
  const isClient = typeof window !== "undefined";
  const url = isClient
    ? `/api/public/tenants/${encodeURIComponent(slug)}/fixtures`
    : buildBackendUrl(`/public/tenants/${encodeURIComponent(slug)}/fixtures`);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
