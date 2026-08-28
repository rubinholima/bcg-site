import type { ParsedFmfMatchReport } from './fmf-match-report.parser';

/** Garante arrays novos em rawParsed histórico. */
export function normalizeParsedFmfReport(raw: unknown): ParsedFmfMatchReport | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as ParsedFmfMatchReport;
  return {
    ...p,
    staffRoster: Array.isArray(p.staffRoster) ? p.staffRoster : [],
    playerGoalEvents: Array.isArray(p.playerGoalEvents) ? p.playerGoalEvents : [],
    playerCardEvents: Array.isArray(p.playerCardEvents) ? p.playerCardEvents : [],
    substitutionEvents: Array.isArray(p.substitutionEvents) ? p.substitutionEvents : [],
    staffCardEvents: Array.isArray(p.staffCardEvents) ? p.staffCardEvents : [],
    roster: Array.isArray(p.roster) ? p.roster : [],
    stats: Array.isArray(p.stats) ? p.stats : [],
    occurrences: Array.isArray(p.occurrences) ? p.occurrences : [],
  };
}
