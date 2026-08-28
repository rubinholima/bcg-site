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
  /** Preenchido quando o PDF trouxer registro/credencial de forma confiável. */
  registrationNumber?: string | null;
};

export type StaffCardClubFilter = {
  homeTeam: string;
  awayTeam: string;
  clubName: string;
  aliases?: string[];
};

export type StaffDisciplineCandidate = {
  id: string;
  name: string;
  role: string;
  licenseNumber?: string | null;
};

export type StaffDisciplineAmbiguity = {
  type: 'duplicate_registration' | 'registration_name_mismatch' | 'ambiguous_name';
  registration?: string;
  nameHint?: string;
  excerpt?: string;
};

export type StaffDisciplineResolveContext = {
  pressKitRoleOverrides?: Record<string, string>;
  onAmbiguous?: (detail: StaffDisciplineAmbiguity) => void;
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

export function normalizeStaffDisciplineText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeRegistration(value: string): string {
  return value.replace(/\D/g, '').trim();
}

/** Slug canônico ou nome de cargo RH → rótulo legível. */
export function resolveDefaultStaffRoleLabel(role: string | null | undefined): string {
  const raw = (role ?? '').trim();
  if (!raw) return 'Comissão técnica';
  if (STAFF_ROLE_LABEL[raw]) return STAFF_ROLE_LABEL[raw]!;
  const norm = normalizeStaffDisciplineText(raw);
  for (const [slug, label] of Object.entries(STAFF_ROLE_LABEL)) {
    if (norm === normalizeStaffDisciplineText(label)) return label;
    if (slug !== 'outro' && norm.includes(normalizeStaffDisciplineText(label))) return label;
  }
  if (norm.includes('auxiliar')) return 'Auxiliar técnico';
  if (norm.includes('goleir')) return 'Treinador de goleiros';
  if (norm.includes('preparador') || norm.includes('fisico')) return 'Preparador físico';
  if (norm.includes('massag')) return 'Massagista';
  if (norm.includes('tecnico') || norm.includes('treinador')) return 'Técnico';
  return raw;
}

function staffRoleLabelFromSlug(slug: string): string {
  return STAFF_ROLE_LABEL[slug] ?? resolveDefaultStaffRoleLabel(slug);
}

/**
 * Função na partida: súmula (evidência histórica) → Press Kit → cadastro default.
 * Se súmula e Press Kit divergirem, mantém a súmula.
 */
export function resolveMatchStaffRoleLabel(
  member: Pick<StaffDisciplineCandidate, 'id' | 'role'>,
  matchRoleLabel: string | null | undefined,
  pressKitRoleOverrides?: Record<string, string>,
): string {
  const sheetRole = matchRoleLabel?.trim();
  if (sheetRole) return sheetRole;

  const overrideSlug = pressKitRoleOverrides?.[member.id]?.trim();
  if (overrideSlug) return staffRoleLabelFromSlug(overrideSlug);

  return resolveDefaultStaffRoleLabel(member.role);
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
  const n = normalizeStaffDisciplineText(line);
  if (!/cart|advert|expuls|vermelh|amarel|disciplin|condut/.test(n)) return false;
  return /comiss|tecnico|auxiliar|preparador|massagista|fisiolog|fisioter|medico|enferm|goleiro|analista|scout|dirigente/.test(
    n,
  );
}

function isGenericStaffDisciplineOccurrence(line: string): boolean {
  const n = normalizeStaffDisciplineText(line);
  return /cart|advert|expuls|vermelh|amarel|disciplin|condut/.test(n);
}

function cardKind(line: string): 'yellow' | 'red' | null {
  const n = normalizeStaffDisciplineText(line);
  if (/vermelh|expuls/.test(n)) return 'red';
  if (/amarel|advert/.test(n)) return 'yellow';
  return null;
}

/** Extrai credencial explícita (CREF, CRM, licença…) — conservador. */
export function extractRegistrationCandidates(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(
    /\b(?:cref|crm|crn|crp|licen[cç]a|registro)\s*[nºo.]?\s*(\d{4,})\b/gi,
  )) {
    const norm = normalizeRegistration(match[1]!);
    if (norm) out.push(norm);
  }
  return [...new Set(out)];
}

export function resolveStaffByRegistration(
  registration: string,
  staff: StaffDisciplineCandidate[],
  ctx?: StaffDisciplineResolveContext,
): StaffDisciplineCandidate | null {
  const norm = normalizeRegistration(registration);
  if (!norm) return null;
  const matches = staff.filter(
    (member) => member.licenseNumber && normalizeRegistration(member.licenseNumber) === norm,
  );
  if (matches.length === 1) return matches[0]!;
  if (matches.length > 1) {
    ctx?.onAmbiguous?.({ type: 'duplicate_registration', registration: norm });
    return null;
  }
  return null;
}

function matchStaffOnLine(
  line: string,
  staff: StaffDisciplineCandidate[],
  ctx?: StaffDisciplineResolveContext,
): StaffDisciplineCandidate | null {
  const normLine = normalizeStaffDisciplineText(line);
  let best: StaffDisciplineCandidate | null = null;
  let bestScore = 0;
  let tieCount = 0;

  for (const member of staff) {
    const tokens = normalizeStaffDisciplineText(member.name)
      .split(' ')
      .filter((part) => part.length > 2);
    if (tokens.length === 0) continue;
    const matched = tokens.filter((token) => normLine.includes(token)).length;
    const last = tokens[tokens.length - 1]!;
    if (!normLine.includes(last)) continue;
    const score = matched + (tokens.length > 1 && normLine.includes(tokens[0]!) ? 1 : 0);
    if (score > bestScore) {
      best = member;
      bestScore = score;
      tieCount = 1;
    } else if (score === bestScore && score > 0) {
      tieCount += 1;
    }
  }

  if (bestScore < 1) return null;
  if (tieCount > 1) {
    ctx?.onAmbiguous?.({ type: 'ambiguous_name', nameHint: line, excerpt: line });
    return null;
  }
  return best;
}

export function resolveStaffDisciplineMember(
  lookupText: string,
  nameHint: string,
  staff: StaffDisciplineCandidate[],
  ctx?: StaffDisciplineResolveContext,
): StaffDisciplineCandidate | null {
  const combined = `${lookupText} ${nameHint}`.trim();

  for (const registration of extractRegistrationCandidates(combined)) {
    const byRegistration = resolveStaffByRegistration(registration, staff, ctx);
    if (byRegistration) return byRegistration;
  }

  if (nameHint.trim()) {
    const directRegistration = normalizeRegistration(nameHint);
    if (directRegistration.length >= 4 && /^\d+$/.test(nameHint.trim())) {
      const byRegistration = resolveStaffByRegistration(directRegistration, staff, ctx);
      if (byRegistration) return byRegistration;
    }
  }

  const member =
    matchStaffOnLine(combined, staff, ctx) ??
    matchStaffOnLine(nameHint, staff, ctx) ??
    matchStaffOnLine(lookupText, staff, ctx);
  if (!member) return null;

  const registrations = extractRegistrationCandidates(combined);
  if (registrations.length === 1 && member.licenseNumber) {
    const memberReg = normalizeRegistration(member.licenseNumber);
    if (memberReg && memberReg !== registrations[0]) {
      ctx?.onAmbiguous?.({
        type: 'registration_name_mismatch',
        registration: registrations[0],
        nameHint,
        excerpt: combined,
      });
      return null;
    }
  }

  return member;
}

function parseOccurrenceTime(excerpt: string): { time: string; period: string } | null {
  const match = excerpt.match(/(\d{1,2}:\d{2})\s+(1T|2T)/i);
  if (!match) return null;
  return { time: match[1]!, period: match[2]!.toUpperCase() };
}

function cardKindFromOccurrence(occ: StaffCardOccurrence): 'yellow' | 'red' {
  return occ.redCards > 0 ? 'red' : 'yellow';
}

/** Remove duplicata Cartões + Ocorrências; preserva dois amarelos distintos no mesmo jogo. */
export function dedupeStaffCardOccurrences(occurrences: StaffCardOccurrence[]): StaffCardOccurrence[] {
  const timedCountByStaffKind = new Map<string, number>();
  for (const occ of occurrences) {
    const time = parseOccurrenceTime(occ.excerpt);
    if (!time) continue;
    const staffKey = occ.staffId ?? normalizeStaffDisciplineText(occ.name);
    const kind = cardKindFromOccurrence(occ);
    const bucket = `${staffKey}|${kind}`;
    timedCountByStaffKind.set(bucket, (timedCountByStaffKind.get(bucket) ?? 0) + 1);
  }

  const kept = new Map<string, StaffCardOccurrence>();
  for (const occ of occurrences) {
    const staffKey = occ.staffId ?? normalizeStaffDisciplineText(occ.name);
    const kind = cardKindFromOccurrence(occ);
    const time = parseOccurrenceTime(occ.excerpt);

    if (!time) {
      const timedCount = timedCountByStaffKind.get(`${staffKey}|${kind}`) ?? 0;
      if (timedCount > 0 && isGenericStaffDisciplineOccurrence(occ.excerpt)) {
        continue;
      }
    }

    const dedupeKey = time
      ? `${staffKey}|${kind}|${time.time}|${time.period}`
      : `${staffKey}|${kind}|untimed|${normalizeStaffDisciplineText(occ.excerpt)}`;

    if (!kept.has(dedupeKey)) {
      kept.set(dedupeKey, occ);
    }
  }

  return [...kept.values()];
}

function buildOccurrence(
  member: StaffDisciplineCandidate,
  kind: 'yellow' | 'red',
  excerpt: string,
  matchRoleLabel: string | null | undefined,
  ctx?: StaffDisciplineResolveContext,
): StaffCardOccurrence {
  return {
    staffId: member.id,
    name: member.name,
    roleLabel: resolveMatchStaffRoleLabel(member, matchRoleLabel, ctx?.pressKitRoleOverrides),
    yellowCards: kind === 'yellow' ? 1 : 0,
    redCards: kind === 'red' ? 1 : 0,
    excerpt,
  };
}

/** Extrai cartões da comissão técnica a partir de Ocorrências / Observações da súmula FMF. */
export function parseStaffCardsFromOccurrences(
  text: string | null | undefined,
  staff: StaffDisciplineCandidate[],
  ctx?: StaffDisciplineResolveContext,
): StaffCardOccurrence[] {
  if (!text?.trim() || staff.length === 0) return [];

  const out: StaffCardOccurrence[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || !isStaffDisciplineLine(line)) continue;
    const kind = cardKind(line);
    if (!kind) continue;

    const member = resolveStaffDisciplineMember(line, line, staff, ctx);
    if (!member) continue;

    const roleFromLine = line.match(
      /(?:tecnico|auxiliar(?:\s+tecnico)?|preparador(?:\s+fisico)?|massagista|medico|fisioterapeuta|fisiologista)/i,
    )?.[0];

    out.push(
      buildOccurrence(
        member,
        kind,
        line,
        roleFromLine ? resolveDefaultStaffRoleLabel(roleFromLine) : null,
        ctx,
      ),
    );
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
  staff: StaffDisciplineCandidate[],
  ctx?: StaffDisciplineResolveContext,
): StaffCardOccurrence[] {
  const out: StaffCardOccurrence[] = [];
  for (const ev of events) {
    const lookupLine = `${ev.roleLabel} ${ev.name}`;
    const member =
      (ev.registrationNumber
        ? resolveStaffByRegistration(ev.registrationNumber, staff, ctx)
        : null) ??
      resolveStaffDisciplineMember(lookupLine, ev.name, staff, ctx);
    if (!member) continue;
    out.push(buildOccurrence(member, ev.kind, ev.excerpt, ev.roleLabel, ctx));
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
    resolveContext?: StaffDisciplineResolveContext;
  },
  staff: StaffDisciplineCandidate[],
): StaffCardOccurrence[] {
  if (staff.length === 0) return [];

  let fromEvents =
    input.staffCardEvents && input.staffCardEvents.length > 0
      ? input.staffCardEvents
      : extractStaffCardEventsFromRawParsed(input.rawParsed);

  if (input.clubFilter) {
    fromEvents = filterStaffCardEventsForOurClub(fromEvents, input.clubFilter);
  }

  const ctx = input.resolveContext;
  const merged = [
    ...staffCardEventsToOccurrences(fromEvents, staff, ctx),
    ...parseStaffCardsFromOccurrences(input.occurrencesText, staff, ctx),
  ];

  return dedupeStaffCardOccurrences(merged);
}

export function aggregateStaffDisciplineRows(
  rows: Array<StaffCardOccurrence & { matchDate: string; matchLabel: string; matchCategory?: string | null }>,
): Array<{
  staffId: string | null;
  name: string;
  roleLabel: string | null;
  yellowCards: number;
  redCards: number;
  matches: Array<{
    matchDate: string;
    label: string;
    yellowCards: number;
    redCards: number;
    matchCategory?: string | null;
  }>;
}> {
  const map = new Map<
    string,
    {
      staffId: string | null;
      name: string;
      roleLabel: string | null;
      yellowCards: number;
      redCards: number;
      matches: Array<{
        matchDate: string;
        label: string;
        yellowCards: number;
        redCards: number;
        matchCategory?: string | null;
      }>;
    }
  >();

  for (const row of rows) {
    const key = row.staffId ?? normalizeStaffDisciplineText(row.name);
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
      matchCategory: row.matchCategory ?? null,
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
