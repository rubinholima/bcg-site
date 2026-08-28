export interface FmfReportRosterPlayer {
  jerseyNumber: number;
  cbfRegistration: string;
  sourceName: string;
  starter: boolean;
  teamSide: 'home' | 'away';
}

export interface FmfReportPlayerStat extends FmfReportRosterPlayer {
  played: boolean;
  enteredMinute: number | null;
  exitedMinute: number | null;
  minutesPlayed: number;
  goals: number;
  ownGoals: number;
  penaltyGoals: number;
  yellowCards: number;
  redCards: number;
}

export interface FmfReportOccurrence {
  kind: 'atraso' | 'briga' | 'disciplina' | 'observacao' | 'acrescimo' | 'outro';
  description: string;
  minute: number | null;
  period: string | null;
  externalKey: string;
}

/** Cartão da comissão técnica na seção Cartões Amarelos/Vermelhos da súmula FMF. */
export interface FmfStaffCardEvent {
  kind: 'yellow' | 'red';
  roleLabel: string;
  name: string;
  excerpt: string;
  clock: string;
  period: string;
  minute: number;
  teamSide?: 'home' | 'away';
}

/** Entrada oficial da comissão técnica (seção Comissão Técnica do PDF). */
export interface FmfReportStaffRosterEntry {
  teamSide: 'home' | 'away';
  roleLabel: string;
  name: string;
  sourceExcerpt: string;
}

export interface FmfReportPlayerGoalEvent {
  teamSide: 'home' | 'away';
  jerseyNumber: number;
  cbfRegistration: string | null;
  sourceName: string | null;
  goalType: 'normal' | 'penalty' | 'own_goal';
  clock: string;
  period: string;
  minute: number;
  excerpt: string;
}

export interface FmfReportPlayerCardEvent {
  kind: 'yellow' | 'red';
  teamSide: 'home' | 'away';
  jerseyNumber: number;
  cbfRegistration: string | null;
  sourceName: string | null;
  clock: string;
  period: string;
  minute: number;
  excerpt: string;
}

/** Marcador temporal FMF quando não há relógio HH:MM (legenda oficial da súmula). */
export type FmfSourceTimingMarker = 'INT' | 'ANT' | 'TER';

/** Substituição oficial — um fato com jogador que sai e entra. */
export interface FmfReportSubstitutionEvent {
  teamSide: 'home' | 'away';
  outJerseyNumber: number;
  inJerseyNumber: number;
  outCbfRegistration: string | null;
  inCbfRegistration: string | null;
  outSourceName: string | null;
  inSourceName: string | null;
  /** HH:MM ou marcador INT/ANT/TER. */
  clock: string;
  period: string;
  /** INT = intervalo; ANT = antes do jogo; TER = após término. */
  sourceTimingMarker?: FmfSourceTimingMarker | null;
  absoluteMinute: number;
  excerpt: string;
}

export interface ParsedFmfMatchReport {
  competition: string;
  phase: string | null;
  round: number | null;
  category: string;
  season: number;
  matchDate: string;
  kickoffTime: string | null;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  firstHalfMinutes: number | null;
  secondHalfMinutes: number | null;
  totalMinutes: number;
  roster: FmfReportRosterPlayer[];
  stats: FmfReportPlayerStat[];
  staffRoster: FmfReportStaffRosterEntry[];
  playerGoalEvents: FmfReportPlayerGoalEvent[];
  playerCardEvents: FmfReportPlayerCardEvent[];
  substitutionEvents: FmfReportSubstitutionEvent[];
  staffCardEvents: FmfStaffCardEvent[];
  occurrencesText: string | null;
  occurrences: FmfReportOccurrence[];
}

function cleanLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalize(value: string): string {
  return cleanLine(value)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase();
}

function parseClock(value: string): number | null {
  const match = value.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function clockDifference(start: string | undefined, end: string | undefined): number | null {
  if (!start || !end) return null;
  const startMinutes = parseClock(start);
  const endMinutes = parseClock(end);
  if (startMinutes == null || endMinutes == null) return null;
  const diff = endMinutes >= startMinutes ? endMinutes - startMinutes : 24 * 60 - startMinutes + endMinutes;
  return diff > 0 && diff <= 90 ? diff : null;
}

function section(text: string, start: string, end: string): string {
  const from = text.indexOf(start);
  if (from < 0) return '';
  const contentStart = from + start.length;
  const to = text.indexOf(end, contentStart);
  return text.slice(contentStart, to >= 0 ? to : undefined);
}

function splitSubstitutionSectionRows(value: string): string[] {
  const rows: string[] = [];
  let current = '';
  for (const rawLine of value.split(/\r?\n/)) {
    const line = cleanLine(rawLine);
    if (!line || /^Tempo\s+/i.test(line)) continue;
    if (/^(ANT|INT|TER)\s*=|^NR\s*=/i.test(line)) continue;
    if (/^(INT|ANT|TER)\b/i.test(line) || /^\d{1,2}:\d{2}\s+(?:1T|2T)\b/i.test(line)) {
      if (current) rows.push(current);
      current = line;
    } else if (current) {
      current += ` ${line}`;
    }
  }
  if (current) rows.push(current);
  return rows;
}

/** Minuto derivado para marcadores INT/ANT/TER conforme legenda FMF. */
export function absoluteMinuteForTimingMarker(
  marker: FmfSourceTimingMarker,
  firstHalfMinutes: number,
  totalMinutes: number,
): number {
  switch (marker) {
    case 'ANT':
      return 0;
    case 'INT':
      return firstHalfMinutes;
    case 'TER':
      return totalMinutes;
    default:
      return firstHalfMinutes;
  }
}

function pushSubstitutionEvent(input: {
  substitutionEvents: FmfReportSubstitutionEvent[];
  teamSide: 'home' | 'away';
  inJersey: number;
  outJersey: number;
  entered: FmfReportPlayerStat | undefined;
  exited: FmfReportPlayerStat | undefined;
  clock: string;
  period: string;
  sourceTimingMarker: FmfSourceTimingMarker | null;
  absoluteMinute: number;
  excerpt: string;
  totalMinutes: number;
}): void {
  input.substitutionEvents.push({
    teamSide: input.teamSide,
    outJerseyNumber: input.outJersey,
    inJerseyNumber: input.inJersey,
    outCbfRegistration: input.exited?.cbfRegistration ?? null,
    inCbfRegistration: input.entered?.cbfRegistration ?? null,
    outSourceName: input.exited?.sourceName ?? null,
    inSourceName: input.entered?.sourceName ?? null,
    clock: input.clock,
    period: input.period,
    sourceTimingMarker: input.sourceTimingMarker,
    absoluteMinute: input.absoluteMinute,
    excerpt: input.excerpt,
  });
  if (input.entered) {
    input.entered.played = true;
    input.entered.enteredMinute = input.absoluteMinute;
    input.entered.minutesPlayed = Math.max(0, input.totalMinutes - input.absoluteMinute);
  }
  if (input.exited) {
    input.exited.played = true;
    input.exited.exitedMinute = input.absoluteMinute;
    input.exited.minutesPlayed = Math.max(0, input.absoluteMinute - (input.exited.enteredMinute ?? 0));
  }
}

function splitTimedRows(value: string): string[] {
  const rows: string[] = [];
  let current = '';
  for (const rawLine of value.split(/\r?\n/)) {
    const line = cleanLine(rawLine);
    if (!line || /^Tempo\s+/i.test(line) || /^NR\s*=/i.test(line)) continue;
    if (/^\d{1,2}:\d{2}\s+(?:1T|2T)\b/i.test(line)) {
      if (current) rows.push(current);
      current = line;
    } else if (current) {
      current += ` ${line}`;
    }
  }
  if (current) rows.push(current);
  return rows;
}

/**
 * PDF FMF: "Nº Apelido Nome Completo CBF" vira uma linha só.
 * Preferimos o nome completo; se apelido = nome (comum), remove a duplicata.
 */
export function extractFmfRosterFullName(middleRaw: string): string {
  const middle = cleanLine(middleRaw).replace(/\s+\(C\)$/i, '');
  if (!middle) return '';
  const tokens = middle.split(/\s+/).filter(Boolean);
  if (tokens.length <= 1) return middle;

  // Apelido e nome idênticos (comum na FMF): "A B C A B C" → "A B C"
  if (tokens.length % 2 === 0) {
    const half = tokens.length / 2;
    const left = tokens.slice(0, half).join(' ');
    const right = tokens.slice(half).join(' ');
    if (normalize(left) === normalize(right)) return right;
  }

  // Apelido curto + nome completo: "Lucas Canella Lucas Azevedo Canella"
  let best: string | null = null;
  for (let i = 1; i < tokens.length; i += 1) {
    const leftTokens = tokens.slice(0, i);
    const rightTokens = tokens.slice(i);
    if (rightTokens.length < leftTokens.length) continue;
    if (normalize(leftTokens[0]!) !== normalize(rightTokens[0]!)) continue;

    const rightSet = new Set(normalize(rightTokens.join(' ')).split(' ').filter(Boolean));
    const leftCovered = normalize(leftTokens.join(' '))
      .split(' ')
      .filter(Boolean)
      .every((token) => rightSet.has(token));
    if (!leftCovered) continue;

    const candidate = rightTokens.join(' ');
    if (!best || candidate.length >= best.length) best = candidate;
  }

  return best ?? middle;
}

function parseRosterPlayerLine(line: string): {
  jerseyNumber: number;
  sourceName: string;
  cbfRegistration: string;
} | null {
  const match = line.match(/^(\d{1,3})\s+(.+)\s+(\d{5,10})$/);
  if (!match) return null;
  return {
    jerseyNumber: Number(match[1]),
    sourceName: extractFmfRosterFullName(match[2]),
    cbfRegistration: match[3],
  };
}

/**
 * PDF às vezes quebra o nome no meio:
 * "4 Joao Victor Machado"
 * "De Oliveira Joao Victor Machado De Oliveira 776375"
 */
export function joinWrappedFmfRosterLines(lines: string[]): string[] {
  const out: string[] = [];
  let pending = '';

  for (const raw of lines) {
    const line = cleanLine(raw);
    if (!line) continue;

    if (pending) {
      const combined = `${pending} ${line}`;
      if (parseRosterPlayerLine(combined)) {
        out.push(combined);
        pending = '';
        continue;
      }
      // Continua juntando (quebra em 3+ linhas é raro, mas possível).
      pending = combined;
      continue;
    }

    if (parseRosterPlayerLine(line)) {
      out.push(line);
      continue;
    }

    // Linha começa com camisa mas ainda sem CBF no fim → esperar continuação.
    if (/^\d{1,3}\s+\S/.test(line) && !/\d{5,10}$/.test(line)) {
      pending = line;
    }
  }

  if (pending && parseRosterPlayerLine(pending)) {
    out.push(pending);
  }

  return out;
}

function parseRoster(text: string): FmfReportRosterPlayer[] {
  const content = section(text, 'Relação de Jogadores', 'Árbitro Principal');
  if (!content) return [];

  const groups: FmfReportRosterPlayer[][] = [[], [], [], []];
  let group = -1;
  let buffer: string[] = [];

  const flushBuffer = () => {
    if (group < 0 || buffer.length === 0) {
      buffer = [];
      return;
    }
    const teamSide = group === 0 || group === 2 ? 'home' : 'away';
    for (const line of joinWrappedFmfRosterLines(buffer)) {
      const parsed = parseRosterPlayerLine(line);
      if (!parsed) continue;
      groups[group].push({
        ...parsed,
        starter: group < 2,
        teamSide,
      });
    }
    buffer = [];
  };

  for (const rawLine of content.split(/\r?\n/)) {
    const line = cleanLine(rawLine);
    if (!line) continue;
    if (/^Nº\s+Apelido\s+Nome Completo\s+CBF$/i.test(line)) {
      flushBuffer();
      group = group < 0 ? 0 : 1;
      continue;
    }
    if (/^Substitutos$/i.test(line)) {
      flushBuffer();
      group = group < 2 ? 2 : 3;
      continue;
    }
    if (group < 0) continue;
    buffer.push(line);
  }
  flushBuffer();

  return groups.flat();
}

export function inferFmfRowTeamSide(
  row: string,
  homeTeam: string,
  awayTeam: string,
): 'home' | 'away' | null {
  const normalized = normalize(row);
  const home = normalize(homeTeam);
  const away = normalize(awayTeam);
  if (home && normalized.includes(home)) return 'home';
  if (away && normalized.includes(away)) return 'away';
  return null;
}

function sideFromRow(row: string, homeTeam: string, awayTeam: string): 'home' | 'away' | null {
  return inferFmfRowTeamSide(row, homeTeam, awayTeam);
}

function eventAbsoluteMinute(period: string, minute: number, firstHalfMinutes: number): number {
  return period.toUpperCase() === '2T' ? firstHalfMinutes + minute : minute;
}

const STAFF_CARD_ROLE_PREFIXES: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /^auxiliar\s+t[eé]cnico\s+/i, label: 'Auxiliar técnico' },
  { pattern: /^treinador\s+de\s+goleiros?\s+/i, label: 'Treinador de goleiros' },
  { pattern: /^preparador\s+f[ií]sico\s+/i, label: 'Preparador físico' },
  { pattern: /^analista(?:\s+de\s+desempenho)?\s+/i, label: 'Analista de desempenho' },
  { pattern: /^m[eé]dico\s+/i, label: 'Médico' },
  { pattern: /^massagista\s+/i, label: 'Massagista' },
  { pattern: /^fisioterapeuta\s+/i, label: 'Fisioterapeuta' },
  { pattern: /^fisiologista\s+/i, label: 'Fisiologista' },
  { pattern: /^t[eé]cnico\s+/i, label: 'Técnico' },
];

function parseStaffCardNameFromTail(tail: string): { roleLabel: string; name: string } | null {
  for (const { pattern, label } of STAFF_CARD_ROLE_PREFIXES) {
    const match = tail.match(pattern);
    if (!match) continue;
    let namePart = tail.slice(match[0].length).trim();
    const dashIdx = namePart.search(/\s+-\s+/);
    if (dashIdx >= 0) namePart = namePart.slice(0, dashIdx).trim();
    if (namePart.length < 3) continue;
    return { roleLabel: label, name: namePart };
  }
  return null;
}

/** Linhas `HH:MM 1T|2T Técnico Nome…` (sem nº de camisa) na seção de cartões. */
export function parseStaffCardEventsFromTimedRows(
  rows: string[],
  kind: 'yellow' | 'red',
  homeTeam = '',
  awayTeam = '',
): FmfStaffCardEvent[] {
  const out: FmfStaffCardEvent[] = [];
  for (const row of rows) {
    const timed = row.match(/^(\d{1,2}:\d{2})\s+(1T|2T)\s+(.+)$/i);
    if (!timed) continue;
    const rest = timed[3].trim();
    if (/^\d+\b/.test(rest)) continue;
    const parsed = parseStaffCardNameFromTail(rest);
    if (!parsed) continue;
    const teamSide =
      homeTeam && awayTeam ? inferFmfRowTeamSide(row, homeTeam, awayTeam) ?? undefined : undefined;
    out.push({
      kind,
      roleLabel: parsed.roleLabel,
      name: parsed.name,
      excerpt: row.slice(0, 240),
      clock: timed[1]!,
      period: timed[2]!.toUpperCase(),
      minute: Number(timed[1]!.split(':')[0]),
      ...(teamSide ? { teamSide } : {}),
    });
  }
  return out;
}

const STAFF_ROSTER_ROLE_PATTERN =
  /^(T[eé]cnico|Auxiliar T[eé]cnico|M[eé]dico|Preparador F[ií]sico|Fisioterapeuta|Prep\.\s*de\s*Goleiros|Massagista|Fisiologista|Analista(?:\s+de\s+desempenho)?)\s*:\s*(.*)$/i;

function normalizeStaffRoleLabel(raw: string): string {
  const n = cleanLine(raw);
  if (/^t[eé]cnico$/i.test(n)) return 'Técnico';
  if (/^auxiliar/i.test(n)) return 'Auxiliar técnico';
  if (/^m[eé]dico$/i.test(n)) return 'Médico';
  if (/^preparador/i.test(n)) return 'Preparador físico';
  if (/^fisioterapeuta$/i.test(n)) return 'Fisioterapeuta';
  if (/^prep\.\s*de\s*goleiros/i.test(n)) return 'Treinador de goleiros';
  if (/^massagista$/i.test(n)) return 'Massagista';
  if (/^fisiologista$/i.test(n)) return 'Fisiologista';
  if (/^analista/i.test(n)) return 'Analista de desempenho';
  return n;
}

/** Relação oficial da comissão técnica (mandante = home, visitante = away). */
export function parseStaffRoster(text: string): FmfReportStaffRosterEntry[] {
  const golsIdx = text.indexOf('\nGols\n');
  if (golsIdx < 0) return [];

  const beforeGols = text.slice(0, golsIdx);
  const blocks = beforeGols.split(/\nComiss[aã]o T[eé]cnica\n/i);
  const entries: FmfReportStaffRosterEntry[] = [];

  const parseBlock = (block: string, teamSide: 'home' | 'away') => {
    for (const rawLine of block.split(/\r?\n/)) {
      const line = cleanLine(rawLine);
      if (!line || /^Cronologia$/i.test(line) || /^Titulares$/i.test(line)) continue;
      if (/^FEDERA/i.test(line) || /^RELAT/i.test(line) || /^--\s*\d+/i.test(line)) continue;
      const match = line.match(STAFF_ROSTER_ROLE_PATTERN);
      if (!match) continue;
      const name = cleanLine(match[2] ?? '');
      if (name.length < 2) continue;
      entries.push({
        teamSide,
        roleLabel: normalizeStaffRoleLabel(match[1]!),
        name,
        sourceExcerpt: line.slice(0, 240),
      });
    }
  };

  if (blocks.length >= 2) {
    parseBlock(blocks[0]!, 'home');
    parseBlock(blocks[1]!, 'away');
  } else if (blocks.length === 1) {
    const chunk = blocks[0]!;
    const cronIdx = chunk.search(/\nCronologia\n/i);
    if (cronIdx >= 0) {
      parseBlock(chunk.slice(0, cronIdx), 'home');
      parseBlock(chunk.slice(cronIdx), 'away');
    } else {
      parseBlock(chunk, 'home');
    }
  }

  return entries;
}

function classifyOccurrenceKind(text: string): FmfReportOccurrence['kind'] {
  const n = normalize(text);
  if (/BRIGA|CONFUS|AGRESS|EMPURR|DISCUT|DESACATO|INVAD/.test(n)) return 'briga';
  if (/ATRAS|DEMOR|ESPERA/.test(n)) return 'atraso';
  if (/ACRESC/.test(n)) return 'acrescimo';
  if (/CART|EXPULS|ADVERT|DISCIPLIN|CONDUT/.test(n)) return 'disciplina';
  return 'observacao';
}

function parseOccurrencesSection(text: string): { occurrencesText: string | null; occurrences: FmfReportOccurrence[] } {
  const marker = '\nOcorrências / Observações\n';
  const from = text.indexOf(marker);
  if (from < 0) return { occurrencesText: null, occurrences: [] };

  let content = text.slice(from + marker.length).trim();
  const cutMarkers = ['\nRelatório', '\nAssinatura', '\nDocumento gerado'];
  for (const cut of cutMarkers) {
    const idx = content.indexOf(cut);
    if (idx >= 0) content = content.slice(0, idx).trim();
  }
  if (!content) return { occurrencesText: null, occurrences: [] };

  const occurrences: FmfReportOccurrence[] = [];
  let lineIndex = 0;
  for (const rawLine of content.split(/\r?\n/)) {
    const line = cleanLine(rawLine);
    if (!line || /^NR\s*=/i.test(line)) continue;

    let minute: number | null = null;
    let period: string | null = null;
    let description = line;

    const timed = line.match(/^(\d{1,2}):\d{2}\s+(1T|2T)\s*[–-]?\s*(.+)$/i);
    if (timed) {
      minute = Number(timed[1]);
      period = timed[2].toUpperCase();
      description = cleanLine(timed[3]);
    } else {
      const minuteOnly = line.match(/^(\d{1,2})\s*(?:min|')\s*[–-]?\s*(.+)$/i);
      if (minuteOnly) {
        minute = Number(minuteOnly[1]);
        description = cleanLine(minuteOnly[2]);
      }
    }

    if (!description) continue;
    occurrences.push({
      kind: classifyOccurrenceKind(description),
      description,
      minute,
      period,
      externalKey: `fmf:line:${lineIndex}`,
    });
    lineIndex += 1;
  }

  return { occurrencesText: content, occurrences };
}

export function parseFmfMatchReportText(textRaw: string): ParsedFmfMatchReport {
  const text = textRaw.replace(/\u00a0/g, ' ');
  const header = text.match(
    /Competição:\s*(.+?)\s+Fase:\s*(.+?)\s+Rodada:\s*(\d+)[\r\n]+Jogo:\s*([\s\S]+?)\s+X\s+([\s\S]+?)[\r\n]+Data:\s*(\d{2}\/\d{2}\/\d{4})\s+Hora:\s*([0-9:]+)/i,
  );
  if (!header) throw new Error('Formato de súmula FMF não reconhecido (cabeçalho ausente).');

  const competition = cleanLine(header[1]);
  const phase = cleanLine(header[2]) || null;
  const round = Number(header[3]) || null;
  const homeTeam = cleanLine(header[4]);
  const awayTeam = cleanLine(header[5]);
  const [day, month, year] = header[6].split('/');
  const matchDate = `${year}-${month}-${day}`;
  const kickoffTime = header[7]?.slice(0, 5) ?? null;
  const categoryMatch = competition.match(/\b(SUB\s*[- ]?\s*\d{2}|M[ÓO]DULO\s+[IVX]+|FEMININO)\b/i);
  const category = categoryMatch
    ? normalize(categoryMatch[1]).replace(/[^A-Z0-9]+/g, '').toLowerCase()
    : 'principal';

  const resultSection = section(text, 'Resultado do Jogo', 'Arbitragem');
  const scoreMatches = [
    ...cleanLine(resultSection).matchAll(/\s(\d+)\s*x\s*(\d+)(?:\s|$)/gi),
  ];
  const scoreMatch = scoreMatches.at(-1);
  const homeScore = scoreMatch ? Number(scoreMatch[1]) : null;
  const awayScore = scoreMatch ? Number(scoreMatch[2]) : null;

  const firstStart = text.match(/Início do 1º Tempo:\s*(\d{1,2}:\d{2})/i)?.[1];
  const firstEnd = text.match(/Término do 1º Tempo:\s*(\d{1,2}:\d{2})/i)?.[1];
  const secondStart = text.match(/Início do 2º Tempo:\s*(\d{1,2}:\d{2})/i)?.[1];
  const secondEnd = text.match(/Término do 2º Tempo:\s*(\d{1,2}:\d{2})/i)?.[1];
  const firstHalfMinutes = clockDifference(firstStart, firstEnd);
  const secondHalfMinutes = clockDifference(secondStart, secondEnd);
  const fallbackHalf = /SUB\s*1[45]/i.test(competition) ? 35 : 45;
  const effectiveFirst = firstHalfMinutes ?? fallbackHalf;
  const effectiveSecond = secondHalfMinutes ?? fallbackHalf;
  const totalMinutes = effectiveFirst + effectiveSecond;

  const roster = parseRoster(text);
  const staffRoster = parseStaffRoster(text);
  const stats = new Map<string, FmfReportPlayerStat>();
  const playerGoalEvents: FmfReportPlayerGoalEvent[] = [];
  const playerCardEvents: FmfReportPlayerCardEvent[] = [];
  const substitutionEvents: FmfReportSubstitutionEvent[] = [];
  for (const player of roster) {
    stats.set(player.cbfRegistration, {
      ...player,
      played: player.starter,
      enteredMinute: player.starter ? 0 : null,
      exitedMinute: null,
      minutesPlayed: player.starter ? totalMinutes : 0,
      goals: 0,
      ownGoals: 0,
      penaltyGoals: 0,
      yellowCards: 0,
      redCards: 0,
    });
  }

  const findRoster = (
    side: 'home' | 'away',
    jerseyNumber: number,
  ): FmfReportPlayerStat | undefined => {
    const matches = [...stats.values()].filter(
      (player) => player.teamSide === side && player.jerseyNumber === jerseyNumber,
    );
    return matches.length === 1 ? matches[0] : undefined;
  };

  for (const row of splitTimedRows(section(text, '\nGols\n', '\nCartões Amarelos\n'))) {
    const match = row.match(/^(\d{1,2}:\d{2})\s+(1T|2T)\s+(\d+)\s+(NR|PN|GC|FT)\b/i);
    if (!match) continue;
    const side = sideFromRow(row, homeTeam, awayTeam);
    if (!side) continue;
    const jersey = Number(match[3]);
    const goalTypeRaw = match[4]!.toUpperCase();
    const goalType =
      goalTypeRaw === 'GC' ? 'own_goal' : goalTypeRaw === 'PN' ? 'penalty' : 'normal';
    const player = findRoster(side, jersey);
    playerGoalEvents.push({
      teamSide: side,
      jerseyNumber: jersey,
      cbfRegistration: player?.cbfRegistration ?? null,
      sourceName: player?.sourceName ?? null,
      goalType,
      clock: match[1]!,
      period: match[2]!.toUpperCase(),
      minute: Number(match[1]!.split(':')[0]),
      excerpt: row.slice(0, 240),
    });
    if (!player) continue;
    if (goalType === 'own_goal') {
      player.ownGoals += 1;
    } else {
      player.goals += 1;
      if (goalType === 'penalty') player.penaltyGoals += 1;
    }
  }

  const yellowCardRows = splitTimedRows(section(text, '\nCartões Amarelos\n', '\nCartões Vermelhos\n'));
  for (const row of yellowCardRows) {
    const match = row.match(/^(\d{1,2}:\d{2})\s+(1T|2T)\s+(\d+)\b/i);
    if (!match) continue;
    const side = sideFromRow(row, homeTeam, awayTeam);
    if (!side) continue;
    const jersey = Number(match[3]);
    const rosterPlayer = findRoster(side, jersey);
    playerCardEvents.push({
      kind: 'yellow',
      teamSide: side,
      jerseyNumber: jersey,
      cbfRegistration: rosterPlayer?.cbfRegistration ?? null,
      sourceName: rosterPlayer?.sourceName ?? null,
      clock: match[1]!,
      period: match[2]!.toUpperCase(),
      minute: Number(match[1]!.split(':')[0]),
      excerpt: row.slice(0, 240),
    });
    if (rosterPlayer) rosterPlayer.yellowCards += 1;
  }

  const redCardRows = splitTimedRows(section(text, '\nCartões Vermelhos\n', '\nOcorrências / Observações\n'));
  for (const row of redCardRows) {
    const match = row.match(/^(\d{1,2}:\d{2})\s+(1T|2T)\s+(\d+)\b/i);
    if (!match) continue;
    const side = sideFromRow(row, homeTeam, awayTeam);
    if (!side) continue;
    const jersey = Number(match[3]);
    const rosterPlayer = findRoster(side, jersey);
    playerCardEvents.push({
      kind: 'red',
      teamSide: side,
      jerseyNumber: jersey,
      cbfRegistration: rosterPlayer?.cbfRegistration ?? null,
      sourceName: rosterPlayer?.sourceName ?? null,
      clock: match[1]!,
      period: match[2]!.toUpperCase(),
      minute: Number(match[1]!.split(':')[0]),
      excerpt: row.slice(0, 240),
    });
    if (rosterPlayer) rosterPlayer.redCards += 1;
  }

  const staffCardEvents: FmfStaffCardEvent[] = [
    ...parseStaffCardEventsFromTimedRows(yellowCardRows, 'yellow', homeTeam, awayTeam),
    ...parseStaffCardEventsFromTimedRows(redCardRows, 'red', homeTeam, awayTeam),
  ];

  for (const row of splitSubstitutionSectionRows(section(text, '\nSubstituições\n', '\nANT = Antes do Início'))) {
    const markerMatch = row.match(/^(INT|ANT|TER)\s+(.+)$/i);
    if (markerMatch) {
      const marker = markerMatch[1]!.toUpperCase() as FmfSourceTimingMarker;
      const rest = markerMatch[2]!;
      const playerMarkers = [...rest.matchAll(/(\d+)\s*-\s*/g)];
      if (playerMarkers.length < 2) continue;
      const side = sideFromRow(rest, homeTeam, awayTeam);
      if (!side) continue;
      const inJersey = Number(playerMarkers[0]![1]);
      const outJersey = Number(playerMarkers[1]![1]);
      const entered = findRoster(side, inJersey);
      const exited = findRoster(side, outJersey);
      const absoluteMinute = absoluteMinuteForTimingMarker(marker, effectiveFirst, totalMinutes);
      pushSubstitutionEvent({
        substitutionEvents,
        teamSide: side,
        inJersey,
        outJersey,
        entered,
        exited,
        clock: marker,
        period: marker,
        sourceTimingMarker: marker,
        absoluteMinute,
        excerpt: row.slice(0, 240),
        totalMinutes,
      });
      continue;
    }

    const match = row.match(/^(\d{1,2}:\d{2})\s+(1T|2T)\s+(.+)$/i);
    if (!match) continue;
    const rest = match[3]!;
    const playerMarkers = [...rest.matchAll(/(\d+)\s*-\s*/g)];
    if (playerMarkers.length < 2) continue;
    const side = sideFromRow(rest.slice(0, playerMarkers[0]!.index), homeTeam, awayTeam);
    if (!side) continue;
    const inJersey = Number(playerMarkers[0]![1]);
    const outJersey = Number(playerMarkers[1]![1]);
    const entered = findRoster(side, inJersey);
    const exited = findRoster(side, outJersey);
    const absoluteMinute = Math.min(
      totalMinutes,
      eventAbsoluteMinute(match[2]!, Number(match[1]!.split(':')[0]), effectiveFirst),
    );
    pushSubstitutionEvent({
      substitutionEvents,
      teamSide: side,
      inJersey,
      outJersey,
      entered,
      exited,
      clock: match[1]!,
      period: match[2]!.toUpperCase(),
      sourceTimingMarker: null,
      absoluteMinute,
      excerpt: row.slice(0, 240),
      totalMinutes,
    });
  }

  const { occurrencesText, occurrences } = parseOccurrencesSection(text);

  return {
    competition,
    phase,
    round,
    category,
    season: Number(year),
    matchDate,
    kickoffTime,
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    firstHalfMinutes,
    secondHalfMinutes,
    totalMinutes,
    roster,
    stats: [...stats.values()],
    staffRoster,
    playerGoalEvents,
    playerCardEvents,
    substitutionEvents,
    staffCardEvents,
    occurrencesText,
    occurrences,
  };
}
