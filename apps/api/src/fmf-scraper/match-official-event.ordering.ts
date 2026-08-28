import type { MatchOfficialEventDraft } from './match-official-event.types';

/** Converte relógio HH:MM da súmula em segundos para ordenação (preserva acréscimo: 47:00 > 45:00). */
export function clockToSortSeconds(clock: string | null | undefined): number {
  if (!clock) return 0;
  const match = clock.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function periodSortOrder(period: string | null | undefined): number {
  const p = (period ?? '').toUpperCase();
  if (p === '1T') return 1;
  if (p === '2T') return 2;
  if (p.includes('PROR')) return 3;
  if (p.includes('PEN')) return 4;
  return 99;
}

const FACT_TYPE_ORDER: Record<string, number> = {
  PLAYER_GOAL: 10,
  PLAYER_PENALTY_GOAL: 10,
  PLAYER_OWN_GOAL: 10,
  PLAYER_YELLOW_CARD: 20,
  PLAYER_RED_CARD: 25,
  PLAYER_SUBSTITUTION: 30,
  STAFF_YELLOW_CARD: 40,
  STAFF_RED_CARD: 45,
};

export function compareOfficialEventOrder(
  a: Pick<MatchOfficialEventDraft, 'period' | 'sourceClock' | 'minute' | 'factType' | 'sourceSequence' | 'externalKey'>,
  b: Pick<MatchOfficialEventDraft, 'period' | 'sourceClock' | 'minute' | 'factType' | 'sourceSequence' | 'externalKey'>,
): number {
  const periodDiff = periodSortOrder(a.period) - periodSortOrder(b.period);
  if (periodDiff !== 0) return periodDiff;

  const clockA = clockToSortSeconds(a.sourceClock ?? (a.minute != null ? `${a.minute}:00` : null));
  const clockB = clockToSortSeconds(b.sourceClock ?? (b.minute != null ? `${b.minute}:00` : null));
  if (clockA !== clockB) return clockA - clockB;

  const seqA = a.sourceSequence ?? 0;
  const seqB = b.sourceSequence ?? 0;
  if (seqA !== seqB) return seqA - seqB;

  const typeDiff = (FACT_TYPE_ORDER[a.factType] ?? 50) - (FACT_TYPE_ORDER[b.factType] ?? 50);
  if (typeDiff !== 0) return typeDiff;

  return a.externalKey.localeCompare(b.externalKey);
}

/** Atribui sourceSequence determinístico após ordenação. */
export function assignSourceSequences<T extends MatchOfficialEventDraft>(drafts: T[]): T[] {
  const sorted = [...drafts].sort(compareOfficialEventOrder);
  return sorted.map((draft, index) => ({
    ...draft,
    sourceSequence: index + 1,
  }));
}

export function resolveSubstitutionResolution(input: {
  out: { resolutionStatus: string };
  in: { resolutionStatus: string };
}): { resolutionStatus: 'resolved' | 'partial' | 'unresolved' | 'ambiguous'; relatedResolutionStatus: string } {
  const outStatus = input.out.resolutionStatus;
  const inStatus = input.in.resolutionStatus;
  if (outStatus === 'ambiguous' || inStatus === 'ambiguous') {
    return { resolutionStatus: 'ambiguous', relatedResolutionStatus: inStatus };
  }
  if (outStatus === 'resolved' && inStatus === 'resolved') {
    return { resolutionStatus: 'resolved', relatedResolutionStatus: 'resolved' };
  }
  if (outStatus === 'resolved' || inStatus === 'resolved') {
    return { resolutionStatus: 'partial', relatedResolutionStatus: inStatus };
  }
  return { resolutionStatus: 'unresolved', relatedResolutionStatus: inStatus };
}
