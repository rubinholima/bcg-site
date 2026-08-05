export const AGENDA_VISAO = {
  GERAL: "geral",
  FUTEBOL: "futebol",
  BOSTON_HALL: "boston-hall",
  PSICOLOGIA: "psicologia",
  CONSULTAS: "consultas",
  MARKETING: "marketing",
} as const;

export type AgendaVisao = (typeof AGENDA_VISAO)[keyof typeof AGENDA_VISAO];

const VALID_VISAO = new Set<string>(Object.values(AGENDA_VISAO));

export function parseAgendaVisao(raw: string | null | undefined): AgendaVisao {
  if (raw && VALID_VISAO.has(raw)) return raw as AgendaVisao;
  return AGENDA_VISAO.GERAL;
}

/** URL da agenda por área — cada departamento no seu hub. */
export function agendaHubUrl(visao?: AgendaVisao | null): string {
  switch (visao) {
    case AGENDA_VISAO.FUTEBOL:
      return "/dashboard/futebol/agenda";
    case AGENDA_VISAO.BOSTON_HALL:
      return "/dashboard/eventos/boston-city-hall/agenda";
    case AGENDA_VISAO.PSICOLOGIA:
    case AGENDA_VISAO.CONSULTAS:
      return "/dashboard/consultas";
    case AGENDA_VISAO.MARKETING:
      return "/dashboard/marketing";
    default:
      return "/dashboard/agenda";
  }
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
