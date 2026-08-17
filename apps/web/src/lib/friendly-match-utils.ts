/** Competência padrão para jogos amistosos cadastrados manualmente. */
export const FRIENDLY_CHAMPIONSHIP_NAME = "Amistoso";

export function inferIsHomeFromJogoTitle(title: string): boolean | null {
  const normalized = title.trim().toLocaleLowerCase("pt-BR");
  if (normalized.startsWith("jogo em casa")) return true;
  if (normalized.startsWith("jogo fora")) return false;
  return null;
}

export function parseOpponentFromJogoTitle(title: string): string {
  const trimmed = title.trim();
  const normalized = trimmed.toLocaleLowerCase("pt-BR");
  for (const prefix of ["jogo em casa", "jogo fora", "jogo"]) {
    if (normalized.startsWith(prefix)) {
      const rest = trimmed.slice(prefix.length).replace(/^[\s·\-–—:]+/, "").trim();
      if (rest) return rest;
    }
  }
  return trimmed;
}

export function buildJogoAgendaTitle(opponentName: string, isHomeMatch: boolean): string {
  const opponent = opponentName.trim().toLocaleUpperCase("pt-BR");
  return isHomeMatch ? `JOGO EM CASA · ${opponent}` : `JOGO FORA · ${opponent}`;
}

export interface FriendlyTravelPayload {
  tenantId: string;
  matchDate: string;
  opponentName: string;
  category?: string;
  isHomeMatch: boolean;
  stadiumName?: string;
  city?: string;
  championshipName?: string;
  status?: string;
  externalId?: string;
}

export function buildFriendlyTravelPayload(
  input: Omit<FriendlyTravelPayload, "championshipName" | "status"> & {
    championshipName?: string;
    status?: string;
  },
): FriendlyTravelPayload {
  return {
    tenantId: input.tenantId,
    matchDate: input.matchDate,
    opponentName: input.opponentName.trim(),
    category: input.category?.trim() || undefined,
    isHomeMatch: input.isHomeMatch,
    stadiumName: input.stadiumName?.trim() || undefined,
    city: input.city?.trim() || undefined,
    championshipName: input.championshipName?.trim() || FRIENDLY_CHAMPIONSHIP_NAME,
    status: input.status ?? "planejamento",
    externalId: input.externalId,
  };
}

export function gameKeyForTravel(travelId: string): string {
  return `travel:${travelId}`;
}

export function convocacaoPath(travelId: string): string {
  return `/dashboard/futebol/logistica/convocacao?travelId=${encodeURIComponent(travelId)}`;
}

export function planejamentoPath(travelId: string): string {
  return `/dashboard/futebol/logistica/${encodeURIComponent(travelId)}/edit`;
}

export function pressKitPath(tenantId: string, travelId: string): string {
  const params = new URLSearchParams({ tenantId, travelId });
  return `/dashboard/futebol/logistica/relatorios/press-kit?${params.toString()}`;
}

export function jogosDetailPath(tenantId: string, travelId: string): string {
  return `/dashboard/futebol/jogos/${encodeURIComponent(gameKeyForTravel(travelId))}?tenantId=${encodeURIComponent(tenantId)}`;
}

export function newAmistosoPath(tenantId?: string): string {
  const base = "/dashboard/futebol/logistica/new?tipo=amistoso";
  if (!tenantId) return base;
  return `${base}&tenantId=${encodeURIComponent(tenantId)}`;
}
