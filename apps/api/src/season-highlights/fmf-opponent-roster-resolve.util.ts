import { isFmfTeamMatch } from '../fmf-scraper/fmf-team-match.util';
import type { FmfReportPlayerStat, ParsedFmfMatchReport } from '../fmf-scraper/fmf-match-report.parser';
import { normalizeParsedFmfReport } from '../fmf-scraper/fmf-parsed-normalize.util';
import { normalizeIdentityKey } from './season-standout.util';

export type ResolvedOpponentSide = 'home' | 'away';

export type ResolvedOpponentIdentity = {
  teamSide: ResolvedOpponentSide;
  opponentClub: string;
  clubWasHome: boolean;
  cbfRegistration: string | null;
  sourceName: string | null;
  rosterStat: FmfReportPlayerStat | null;
  identitySource: 'cbf' | 'fmf_resolved' | 'name_club' | 'isolated';
  identityConfidence: 'high' | 'medium' | 'low';
};

export function resolveOpponentTeamSide(
  homeTeam: string,
  awayTeam: string,
  clubName: string,
  aliases: string[] = [],
): { side: ResolvedOpponentSide; clubWasHome: boolean; opponentClub: string } {
  const clubIsHome = isFmfTeamMatch(homeTeam, clubName, aliases);
  const clubIsAway = isFmfTeamMatch(awayTeam, clubName, aliases);
  if (clubIsHome && !clubIsAway) {
    return { side: 'away', clubWasHome: true, opponentClub: awayTeam };
  }
  if (clubIsAway && !clubIsHome) {
    return { side: 'home', clubWasHome: false, opponentClub: homeTeam };
  }
  return { side: 'away', clubWasHome: true, opponentClub: awayTeam };
}

function pickRosterEntry(
  parsed: ParsedFmfMatchReport,
  teamSide: ResolvedOpponentSide,
  jerseyNumber: number | null,
): FmfReportPlayerStat | null {
  if (jerseyNumber == null) return null;
  const fromStats = parsed.stats.find(
    (s) => s.teamSide === teamSide && s.jerseyNumber === jerseyNumber,
  );
  if (fromStats) return fromStats;
  const fromRoster = parsed.roster.find(
    (s) => s.teamSide === teamSide && s.jerseyNumber === jerseyNumber,
  );
  if (!fromRoster) return null;
  return {
    ...fromRoster,
    played: false,
    enteredMinute: null,
    exitedMinute: null,
    minutesPlayed: 0,
    goals: 0,
    ownGoals: 0,
    penaltyGoals: 0,
    yellowCards: 0,
    redCards: 0,
  };
}

export function resolveOpponentIdentityFromFmf(input: {
  rawParsed: unknown;
  homeTeam: string;
  awayTeam: string;
  clubName: string;
  clubAliases?: string[];
  opponentNameFallback?: string | null;
  jerseyNumber: number | null;
}): ResolvedOpponentIdentity {
  const parsed = normalizeParsedFmfReport(input.rawParsed);
  const { side, clubWasHome, opponentClub } = resolveOpponentTeamSide(
    input.homeTeam,
    input.awayTeam,
    input.clubName,
    input.clubAliases ?? [],
  );
  const club =
    opponentClub?.trim() ||
    input.opponentNameFallback?.trim() ||
    (side === 'home' ? input.homeTeam : input.awayTeam);

  if (!parsed) {
    return {
      teamSide: side,
      opponentClub: club,
      clubWasHome,
      cbfRegistration: null,
      sourceName: null,
      rosterStat: null,
      identitySource: 'isolated',
      identityConfidence: 'low',
    };
  }

  const rosterStat = pickRosterEntry(parsed, side, input.jerseyNumber);
  const cbf = rosterStat?.cbfRegistration?.trim() || null;
  const sourceName = rosterStat?.sourceName?.trim() || null;

  if (cbf) {
    return {
      teamSide: side,
      opponentClub: club,
      clubWasHome,
      cbfRegistration: cbf,
      sourceName,
      rosterStat,
      identitySource: 'cbf',
      identityConfidence: 'high',
    };
  }
  if (sourceName) {
    return {
      teamSide: side,
      opponentClub: club,
      clubWasHome,
      cbfRegistration: null,
      sourceName,
      rosterStat,
      identitySource: 'fmf_resolved',
      identityConfidence: 'medium',
    };
  }

  return {
    teamSide: side,
    opponentClub: club,
    clubWasHome,
    cbfRegistration: null,
    sourceName: null,
    rosterStat: null,
    identitySource: 'isolated',
    identityConfidence: 'low',
  };
}

export function buildFallbackIdentityKey(input: {
  tenantId: string;
  opponentClub: string;
  resolvedName: string | null;
  staffNotes: string | null;
  opponentHighlightId: string;
}): string {
  const clubKey = normalizeIdentityKey(input.opponentClub || 'unknown');
  const nameKey = normalizeIdentityKey(input.resolvedName || '');
  if (nameKey) {
    return `nameclub:${input.tenantId}:${clubKey}:${nameKey}`;
  }
  const notesKey = normalizeIdentityKey((input.staffNotes || '').slice(0, 120));
  if (notesKey) {
    return `notesctx:${input.tenantId}:${clubKey}:${notesKey}`;
  }
  return `event:${input.opponentHighlightId}`;
}

export function buildDisplayName(resolvedName: string | null, jerseyNumber: number | null): string {
  if (resolvedName?.trim()) return resolvedName.trim();
  if (jerseyNumber != null) return `Adversário #${jerseyNumber}`;
  return 'Adversário destacado';
}
