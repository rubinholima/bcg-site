import { compareOfficialEventOrder } from '../fmf-scraper/match-official-event.ordering';
import { formatOfficialEventTiming } from './sumula-cartoes-events.builder';
import { isFmfTeamMatch } from '../fmf-scraper/fmf-team-match.util';

export type PersonalDisciplineHistoryEntryDto = {
  eventId: string;
  factType: string;
  cardLabel: 'Amarelo' | 'Vermelho';
  matchId: string;
  matchDate: string;
  opponentName: string;
  competition: string;
  season: number;
  phase: string | null;
  round: number | null;
  matchCategory: string;
  matchCategoryLabel: string;
  sourceClock: string | null;
  period: string | null;
  timingLabel: string;
  jerseyNumber: number | null;
  sourceRoleLabel: string | null;
  sourceUrl: string | null;
};

export type PersonalDisciplineHistoryDto = {
  personId: string;
  personName: string;
  personKind: 'player' | 'staff';
  summary: {
    yellowCards: number;
    redCards: number;
    matchCount: number;
    categories: string[];
  };
  entries: PersonalDisciplineHistoryEntryDto[];
};

type HistoryEventRow = {
  id: string;
  factType: string;
  sourceJerseyNumber: number | null;
  sourceRoleLabel: string | null;
  sourceClock: string | null;
  period: string | null;
  sourceSequence: number | null;
  minute: number | null;
  externalKey: string;
  fmfMatchReport: {
    id: string;
    matchDate: Date;
    homeTeam: string;
    awayTeam: string;
    competition: string;
    season: number;
    phase: string | null;
    round: number | null;
    category: string;
    sourceUrl: string | null;
  };
};

function cardLabel(factType: string): 'Amarelo' | 'Vermelho' {
  if (factType.includes('RED')) return 'Vermelho';
  return 'Amarelo';
}

function opponentForMatch(
  report: HistoryEventRow['fmfMatchReport'],
  clubName: string,
  aliases: string[],
): string {
  const isHome = isFmfTeamMatch(report.homeTeam, clubName, aliases);
  return isHome ? report.awayTeam : report.homeTeam;
}

function dateKeyBrazil(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function buildPersonalDisciplineHistory(input: {
  personId: string;
  personName: string;
  personKind: 'player' | 'staff';
  events: HistoryEventRow[];
  clubName: string;
  aliases: string[];
  categoryLabels: Record<string, string>;
  filters?: {
    category?: string | null;
    season?: number | null;
    competition?: string | null;
  };
}): PersonalDisciplineHistoryDto {
  const sorted = [...input.events].sort((a, b) => {
    const dateDiff =
      b.fmfMatchReport.matchDate.getTime() - a.fmfMatchReport.matchDate.getTime();
    if (dateDiff !== 0) return dateDiff;
    return compareOfficialEventOrder(
      {
        period: a.period,
        sourceClock: a.sourceClock,
        minute: a.minute,
        factType: a.factType as Parameters<typeof compareOfficialEventOrder>[0]['factType'],
        sourceSequence: a.sourceSequence,
        externalKey: a.externalKey,
      },
      {
        period: b.period,
        sourceClock: b.sourceClock,
        minute: b.minute,
        factType: b.factType as Parameters<typeof compareOfficialEventOrder>[0]['factType'],
        sourceSequence: b.sourceSequence,
        externalKey: b.externalKey,
      },
    );
  });

  let entries: PersonalDisciplineHistoryEntryDto[] = sorted.map((event) => {
    const report = event.fmfMatchReport;
    const category = report.category?.trim() || '—';
    return {
      eventId: event.id,
      factType: event.factType,
      cardLabel: cardLabel(event.factType),
      matchId: report.id,
      matchDate: dateKeyBrazil(report.matchDate),
      opponentName: opponentForMatch(report, input.clubName, input.aliases),
      competition: report.competition,
      season: report.season,
      phase: report.phase,
      round: report.round,
      matchCategory: category,
      matchCategoryLabel: input.categoryLabels[category] ?? category,
      sourceClock: event.sourceClock,
      period: event.period,
      timingLabel: formatOfficialEventTiming(event.sourceClock, event.period),
      jerseyNumber: event.sourceJerseyNumber,
      sourceRoleLabel: event.sourceRoleLabel?.trim() || null,
      sourceUrl: report.sourceUrl?.trim() || null,
    };
  });

  const filters = input.filters;
  if (filters?.category?.trim()) {
    const wanted = filters.category.trim().toLowerCase();
    entries = entries.filter((e) => e.matchCategory.toLowerCase() === wanted);
  }
  if (typeof filters?.season === 'number' && filters.season >= 2000) {
    entries = entries.filter((e) => e.season === filters.season);
  }
  if (filters?.competition?.trim()) {
    const wanted = filters.competition.trim().toLowerCase();
    entries = entries.filter((e) => e.competition.toLowerCase().includes(wanted));
  }

  const matchIds = new Set(entries.map((e) => e.matchId));
  const categories = [...new Set(entries.map((e) => e.matchCategory))].filter(Boolean);

  return {
    personId: input.personId,
    personName: input.personName,
    personKind: input.personKind,
    summary: {
      yellowCards: entries.filter((e) => e.cardLabel === 'Amarelo').length,
      redCards: entries.filter((e) => e.cardLabel === 'Vermelho').length,
      matchCount: matchIds.size,
      categories,
    },
    entries,
  };
}
