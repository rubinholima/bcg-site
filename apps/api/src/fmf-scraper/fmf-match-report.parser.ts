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

function parseRoster(text: string): FmfReportRosterPlayer[] {
  const content = section(text, 'Relação de Jogadores', 'Árbitro Principal');
  if (!content) return [];

  const groups: FmfReportRosterPlayer[][] = [[], [], [], []];
  let group = -1;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = cleanLine(rawLine);
    if (!line) continue;
    if (/^Nº\s+Apelido\s+Nome Completo\s+CBF$/i.test(line)) {
      group = group < 0 ? 0 : 1;
      continue;
    }
    if (/^Substitutos$/i.test(line)) {
      group = group < 2 ? 2 : 3;
      continue;
    }
    if (group < 0) continue;
    const match = line.match(/^(\d{1,3})\s+(.+?)\s+(\d{5,10})$/);
    if (!match) continue;
    const teamSide = group === 0 || group === 2 ? 'home' : 'away';
    groups[group].push({
      jerseyNumber: Number(match[1]),
      sourceName: cleanLine(match[2]).replace(/\s+\(C\)$/i, ''),
      cbfRegistration: match[3],
      starter: group < 2,
      teamSide,
    });
  }
  return groups.flat();
}

function sideFromRow(row: string, homeTeam: string, awayTeam: string): 'home' | 'away' | null {
  const normalized = normalize(row);
  const home = normalize(homeTeam);
  const away = normalize(awayTeam);
  if (home && normalized.includes(home)) return 'home';
  if (away && normalized.includes(away)) return 'away';
  return null;
}

function eventAbsoluteMinute(period: string, minute: number, firstHalfMinutes: number): number {
  return period.toUpperCase() === '2T' ? firstHalfMinutes + minute : minute;
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
  const stats = new Map<string, FmfReportPlayerStat>();
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
    const match = row.match(/^(\d{1,2}):\d{2}\s+(1T|2T)\s+(\d+)\s+(NR|PN|GC|FT)\b/i);
    if (!match) continue;
    const side = sideFromRow(row, homeTeam, awayTeam);
    if (!side) continue;
    const player = findRoster(side, Number(match[3]));
    if (!player) continue;
    if (match[4].toUpperCase() === 'GC') {
      player.ownGoals += 1;
    } else {
      player.goals += 1;
      if (match[4].toUpperCase() === 'PN') player.penaltyGoals += 1;
    }
  }

  for (const row of splitTimedRows(section(text, '\nCartões Amarelos\n', '\nCartões Vermelhos\n'))) {
    const match = row.match(/^(\d{1,2}):\d{2}\s+(1T|2T)\s+(\d+)\b/i);
    if (!match) continue;
    const side = sideFromRow(row, homeTeam, awayTeam);
    const player = side ? findRoster(side, Number(match[3])) : undefined;
    if (player) player.yellowCards += 1;
  }

  for (const row of splitTimedRows(section(text, '\nCartões Vermelhos\n', '\nOcorrências / Observações\n'))) {
    const match = row.match(/^(\d{1,2}):\d{2}\s+(1T|2T)\s+(\d+)\b/i);
    if (!match) continue;
    const side = sideFromRow(row, homeTeam, awayTeam);
    const player = side ? findRoster(side, Number(match[3])) : undefined;
    if (player) player.redCards += 1;
  }

  for (const row of splitTimedRows(section(text, '\nSubstituições\n', '\nANT = Antes do Início'))) {
    const match = row.match(/^(\d{1,2}):\d{2}\s+(1T|2T)\s+(.+)$/i);
    if (!match) continue;
    const rest = match[3];
    const playerMarkers = [...rest.matchAll(/(\d+)\s*-\s*/g)];
    if (playerMarkers.length < 2) continue;
    const side = sideFromRow(rest.slice(0, playerMarkers[0].index), homeTeam, awayTeam);
    if (!side) continue;
    const entered = findRoster(side, Number(playerMarkers[0][1]));
    const exited = findRoster(side, Number(playerMarkers[1][1]));
    const absoluteMinute = Math.min(
      totalMinutes,
      eventAbsoluteMinute(match[2], Number(match[1]), effectiveFirst),
    );
    if (entered) {
      entered.played = true;
      entered.enteredMinute = absoluteMinute;
      entered.minutesPlayed = Math.max(0, totalMinutes - absoluteMinute);
    }
    if (exited) {
      exited.played = true;
      exited.exitedMinute = absoluteMinute;
      exited.minutesPlayed = Math.max(0, absoluteMinute - (exited.enteredMinute ?? 0));
    }
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
    occurrencesText,
    occurrences,
  };
}
