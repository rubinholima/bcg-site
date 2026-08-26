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
    out.push({
      staffId: member?.id ?? null,
      name: member?.name ?? line.slice(0, 120),
      roleLabel: member ? staffRoleLabel(member.role) : null,
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
  return events.map((ev) => {
    const lookupLine = `${ev.roleLabel} ${ev.name}`;
    const member = matchStaffOnLine(lookupLine, staff) ?? matchStaffOnLine(ev.name, staff);
    return {
      staffId: member?.id ?? null,
      name: member?.name ?? ev.name,
      roleLabel: member ? staffRoleLabel(member.role) : ev.roleLabel,
      yellowCards: ev.kind === 'yellow' ? 1 : 0,
      redCards: ev.kind === 'red' ? 1 : 0,
      excerpt: ev.excerpt,
    };
  });
}

/**
 * Cartões da comissão — seção Cartões Amarelos/Vermelhos (padrão FMF) + Ocorrências/Observações.
 */
export function parseStaffCardsForMatch(
  input: {
    occurrencesText?: string | null;
    staffCardEvents?: FmfStaffCardEventInput[] | null;
    rawParsed?: unknown;
  },
  staff: StaffCandidate[],
): StaffCardOccurrence[] {
  if (staff.length === 0) return [];

  const fromEvents =
    input.staffCardEvents && input.staffCardEvents.length > 0
      ? input.staffCardEvents
      : extractStaffCardEventsFromRawParsed(input.rawParsed);

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
