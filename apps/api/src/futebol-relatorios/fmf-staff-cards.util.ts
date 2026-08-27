import { inferFmfRowTeamSide } from '../fmf-scraper/fmf-match-report.parser';
import { isFmfTeamMatch } from '../fmf-scraper/fmf-team-match.util';

export type StaffCardOccurrence = {
  staffId: string | null;
  name: string;
  roleLabel: string | null;
  yellowCards: number;
  redCards: number;
  excerpt: string;
};

export type FmfStaffCardEventInput = {
  kind: 'yellow' | 'red';
  roleLabel: string;
  name: string;
  excerpt: string;
  teamSide?: 'home' | 'away';
};

export type StaffCardClubFilter = {
  homeTeam: string;
  awayTeam: string;
  clubName: string;
  aliases?: string[];
};

type StaffCandidate = {
  id: string;
  name: string;
  role: string;
};

const STAFF_ROLE_LABEL: Record<string, string> = {
  tecnico: 'Técnico',
  auxiliar_tecnico: 'Auxiliar técnico',
  treinador_goleiros: 'Treinador de goleiros',
  preparador_fisico: 'Preparador físico',
  medico: 'Médico',
  fisioterapeuta: 'Fisioterapeuta',
  fisiologista: 'Fisiologista',
  psicologo: 'Psicólogo',
  nutricionista: 'Nutricionista',
  analista_desempenho: 'Analista de desempenho',
  scout: 'Scout',
  massagista: 'Massagista',
  enfermeiro: 'Enfermeiro',
  outro: 'Comissão técnica',
};

function staffRoleLabel(role: string): string {
  return STAFF_ROLE_LABEL[role] ?? 'Comissão técnica';
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function resolveOurTeamSide(
  homeTeam: string,
  awayTeam: string,
  clubName: string,
  aliases: string[] = [],
): 'home' | 'away' | null {
  if (isFmfTeamMatch(homeTeam, clubName, aliases)) return 'home';
  if (isFmfTeamMatch(awayTeam, clubName, aliases)) return 'away';
  return null;
}

function resolveStaffEventTeamSide(
  event: FmfStaffCardEventInput,
  homeTeam: string,
  awayTeam: string,
): 'home' | 'away' | null {
  if (event.teamSide === 'home' || event.teamSide === 'away') return event.teamSide;
  if (!homeTeam || !awayTeam) return null;
  return inferFmfRowTeamSide(event.excerpt || `${event.roleLabel} ${event.name}`, homeTeam, awayTeam);
}

/** Mantém só cartões da comissão do nosso clube (disciplina / controle de cartões). */
export function filterStaffCardEventsForOurClub(
  events: FmfStaffCardEventInput[],
  filter: StaffCardClubFilter,
): FmfStaffCardEventInput[] {
  const ourSide = resolveOurTeamSide(
    filter.homeTeam,
    filter.awayTeam,
    filter.clubName,
    filter.aliases ?? [],
  );
  if (!ourSide) return events;

  return events.filter((event) => {
    const side = resolveStaffEventTeamSide(event, filter.homeTeam, filter.awayTeam);
    return side == null || side === ourSide;
  });
}

function isStaffDisciplineLine(line: string): boolean {
  const n = normalize(line);
  if (!/cart|advert|expuls|vermelh|amarel|disciplin|condut/.test(n)) return false;
  return /comiss|tecnico|auxiliar|preparador|massagista|fisiolog|fisioter|medico|enferm|goleiro|analista|scout|dirigente/.test(
    n,
  );
}

function cardKind(line: string): 'yellow' | 'red' | null {
  const n = normalize(line);
  if (/vermelh|expuls/.test(n)) return 'red';
  if (/amarel|advert/.test(n)) return 'yellow';
  return null;
}

function matchStaffOnLine(line: string, staff: StaffCandidate[]): StaffCandidate | null {
  const normLine = normalize(line);
  let best: StaffCandidate | null = null;
  let bestScore = 0;

  for (const member of staff) {
    const tokens = normalize(member.name)
      .split(' ')
      .filter((p) => p.length > 2);
    if (tokens.length === 0) continue;
    const matched = tokens.filter((t) => normLine.includes(t)).length;
    const last = tokens[tokens.length - 1]!;
    if (!normLine.includes(last)) continue;
    const score = matched + (tokens.length > 1 && normLine.includes(tokens[0]!) ? 1 : 0);
    if (score > bestScore) {
      best = member;
      bestScore = score;
    }
  }

  return bestScore >= 1 ? best : null;
}

/** Extrai cartões da comissão técnica a partir de Ocorrências / Observações da súmula FMF. */
export function parseStaffCardsFromOccurrences(
  text: string | null | undefined,
  staff: StaffCandidate[],
): StaffCardOccurrence[] {
  if (!text?.trim() || staff.length === 0) return [];

  const out: StaffCardOccurrence[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || !isStaffDisciplineLine(line)) continue;
    const kind = cardKind(line);
    if (!kind) continue;

    const member = matchStaffOnLine(line, staff);
    if (!member) continue;
    out.push({
      staffId: member.id,
      name: member.name,
      roleLabel: staffRoleLabel(member.role),
      yellowCards: kind === 'yellow' ? 1 : 0,
      redCards: kind === 'red' ? 1 : 0,
      excerpt: line,
    });
  }

  return out;
}

/** Lê eventos de cartão da comissão gravados no rawParsed da súmula FMF. */
export function extractStaffCardEventsFromRawParsed(rawParsed: unknown): FmfStaffCardEventInput[] {
  if (!rawParsed || typeof rawParsed !== 'object') return [];
  const events = (rawParsed as { staffCardEvents?: unknown }).staffCardEvents;
  if (!Array.isArray(events)) return [];
  return events.filter(
    (ev): ev is FmfStaffCardEventInput =>
      !!ev &&
      typeof ev === 'object' &&
      (ev as FmfStaffCardEventInput).kind !== undefined &&
      typeof (ev as FmfStaffCardEventInput).name === 'string',
  );
}

function staffCardEventsToOccurrences(
  events: FmfStaffCardEventInput[],
  staff: StaffCandidate[],
): StaffCardOccurrence[] {
  const out: StaffCardOccurrence[] = [];
  for (const ev of events) {
    const lookupLine = `${ev.roleLabel} ${ev.name}`;
    const member = matchStaffOnLine(lookupLine, staff) ?? matchStaffOnLine(ev.name, staff);
    if (!member) continue;
    out.push({
      staffId: member.id,
      name: member.name,
      roleLabel: staffRoleLabel(member.role),
      yellowCards: ev.kind === 'yellow' ? 1 : 0,
      redCards: ev.kind === 'red' ? 1 : 0,
      excerpt: ev.excerpt,
    });
  }
  return out;
}

/**
 * Cartões da comissão — seção Cartões Amarelos/Vermelhos (padrão FMF) + Ocorrências/Observações.
 * Com `clubFilter`, ignora cartões do adversário (controle disciplinar do tenant).
 */
export function parseStaffCardsForMatch(
  input: {
    occurrencesText?: string | null;
    staffCardEvents?: FmfStaffCardEventInput[] | null;
    rawParsed?: unknown;
    clubFilter?: StaffCardClubFilter | null;
  },
  staff: StaffCandidate[],
): StaffCardOccurrence[] {
  if (staff.length === 0) return [];

  let fromEvents =
    input.staffCardEvents && input.staffCardEvents.length > 0
      ? input.staffCardEvents
      : extractStaffCardEventsFromRawParsed(input.rawParsed);

  if (input.clubFilter) {
    fromEvents = filterStaffCardEventsForOurClub(fromEvents, input.clubFilter);
  }

  return [
    ...staffCardEventsToOccurrences(fromEvents, staff),
    ...parseStaffCardsFromOccurrences(input.occurrencesText, staff),
  ];
}

export function aggregateStaffDisciplineRows(
  rows: Array<StaffCardOccurrence & { matchDate: string; matchLabel: string }>,
): Array<{
  staffId: string | null;
  name: string;
  roleLabel: string | null;
  yellowCards: number;
  redCards: number;
  matches: Array<{ matchDate: string; label: string; yellowCards: number; redCards: number }>;
}> {
  const map = new Map<
    string,
    {
      staffId: string | null;
      name: string;
      roleLabel: string | null;
      yellowCards: number;
      redCards: number;
      matches: Array<{ matchDate: string; label: string; yellowCards: number; redCards: number }>;
    }
  >();

  for (const row of rows) {
    const key = row.staffId ?? normalize(row.name);
    const current = map.get(key) ?? {
      staffId: row.staffId,
      name: row.name,
      roleLabel: row.roleLabel,
      yellowCards: 0,
      redCards: 0,
      matches: [],
    };
    current.yellowCards += row.yellowCards;
    current.redCards += row.redCards;
    current.matches.push({
      matchDate: row.matchDate,
      label: row.matchLabel,
      yellowCards: row.yellowCards,
      redCards: row.redCards,
    });
    map.set(key, current);
  }

  return [...map.values()].sort(
    (a, b) =>
      b.redCards - a.redCards ||
      b.yellowCards - a.yellowCards ||
      a.name.localeCompare(b.name, 'pt-BR'),
  );
}
