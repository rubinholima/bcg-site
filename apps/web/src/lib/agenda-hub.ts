export const AGENDA_VISAO = {
  GERAL: "geral",
  FUTEBOL: "futebol",
  BOSTON_HALL: "boston-hall",
  CONSULTAS: "consultas",
  MARKETING: "marketing",
} as const;

export type AgendaVisao = (typeof AGENDA_VISAO)[keyof typeof AGENDA_VISAO];

const VALID_VISAO = new Set<string>(Object.values(AGENDA_VISAO));

export function parseAgendaVisao(raw: string | null | undefined): AgendaVisao {
  if (raw && VALID_VISAO.has(raw)) return raw as AgendaVisao;
  return AGENDA_VISAO.GERAL;
}

export function agendaHubUrl(visao?: AgendaVisao | null): string {
  if (!visao || visao === AGENDA_VISAO.GERAL) return "/dashboard/agenda";
  return `/dashboard/agenda?visao=${visao}`;
}

export function isAgendaHubHref(href: string | undefined): boolean {
  return !!href?.startsWith("/dashboard/agenda");
}

export function resolveAgendaVisaoFromHref(href: string): AgendaVisao | null {
  try {
    const url = new URL(href, "https://agenda.local");
    if (url.pathname !== "/dashboard/agenda") return null;
    return parseAgendaVisao(url.searchParams.get("visao"));
  } catch {
    return null;
  }
}
