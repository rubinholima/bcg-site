import type { FmfReportRosterPlayer, FmfReportStaffRosterEntry } from './fmf-match-report.parser';
import {
  buildPlayersByCbf,
  buildPlayersByNormalizedName,
  resolvePlayerForFmfStat,
} from './fmf-player-link.util';
import {
  normalizeStaffDisciplineText,
  resolveStaffDisciplineMember,
  type StaffDisciplineCandidate,
} from '../futebol-relatorios/fmf-staff-cards.util';
import type { MatchResolutionReason, MatchResolutionStatus } from './match-official-event.types';

export type PlayerLinkPool = {
  players: Array<{
    id: string;
    name: string;
    cbfRegistration?: string | null;
    registrationProfile?: unknown;
  }>;
  byCbf: ReturnType<typeof buildPlayersByCbf>;
  byName: ReturnType<typeof buildPlayersByNormalizedName>;
};

export function buildPlayerLinkPool(
  players: PlayerLinkPool['players'],
): PlayerLinkPool {
  return {
    players,
    byCbf: buildPlayersByCbf(players),
    byName: buildPlayersByNormalizedName(players),
  };
}

export type PlayerEventIdentityResult = {
  playerId: string | null;
  resolutionStatus: MatchResolutionStatus;
  resolutionReason: MatchResolutionReason;
  sourceRegistration: string | null;
  sourceName: string | null;
};

export function resolvePlayerFromRosterEntry(
  rosterEntry: Pick<FmfReportRosterPlayer, 'cbfRegistration' | 'sourceName'>,
  pool: PlayerLinkPool,
): PlayerEventIdentityResult {
  const resolved = resolvePlayerForFmfStat(
    {
      cbfRegistration: rosterEntry.cbfRegistration,
      sourceName: rosterEntry.sourceName,
    },
    pool.byCbf,
    pool.byName,
    pool.players,
  );

  if (resolved.ok) {
    const reason: MatchResolutionReason =
      resolved.linkedBy === 'cbf'
        ? 'ROSTER_CBF'
        : resolved.linkedBy === 'name'
          ? 'ROSTER_NAME_EXACT'
          : resolved.linkedBy === 'name_contained'
            ? 'NAME_CONTAINED'
            : 'NAME_TOKENS';
    return {
      playerId: resolved.playerId,
      resolutionStatus: 'resolved',
      resolutionReason: reason,
      sourceRegistration: rosterEntry.cbfRegistration,
      sourceName: rosterEntry.sourceName,
    };
  }

  const reason: MatchResolutionReason =
    resolved.reason.includes('duplicad') || resolved.reason.includes('Duplicad')
      ? resolved.reason.includes('CBF')
        ? 'DUPLICATE_CBF'
        : 'AMBIGUOUS_NAME'
      : 'NO_MATCH';

  return {
    playerId: null,
    resolutionStatus: reason === 'DUPLICATE_CBF' || reason === 'AMBIGUOUS_NAME' ? 'ambiguous' : 'unresolved',
    resolutionReason: reason,
    sourceRegistration: rosterEntry.cbfRegistration,
    sourceName: rosterEntry.sourceName,
  };
}

export function resolvePlayerForJerseyEvent(
  roster: FmfReportRosterPlayer[],
  teamSide: 'home' | 'away',
  jerseyNumber: number,
  pool: PlayerLinkPool,
  fallbackName?: string | null,
  fallbackCbf?: string | null,
): PlayerEventIdentityResult {
  const matches = roster.filter((r) => r.teamSide === teamSide && r.jerseyNumber === jerseyNumber);
  if (matches.length === 1) {
    return resolvePlayerFromRosterEntry(matches[0]!, pool);
  }
  if (fallbackCbf || fallbackName) {
    return resolvePlayerFromRosterEntry(
      {
        cbfRegistration: fallbackCbf ?? '',
        sourceName: fallbackName ?? '',
      },
      pool,
    );
  }
  return {
    playerId: null,
    resolutionStatus: 'unresolved',
    resolutionReason: 'NO_MATCH',
    sourceRegistration: fallbackCbf ?? null,
    sourceName: fallbackName ?? null,
  };
}

export type StaffEventIdentityResult = {
  technicalStaffId: string | null;
  resolutionStatus: MatchResolutionStatus;
  resolutionReason: MatchResolutionReason;
  rosterMatched: boolean;
};

function staffNamesCompatible(a: string, b: string): boolean {
  const left = normalizeStaffDisciplineText(a);
  const right = normalizeStaffDisciplineText(b);
  if (!left || !right) return false;
  if (left === right) return true;
  return left.includes(right) || right.includes(left);
}

function staffRolesCompatible(cardRole: string, rosterRole: string): boolean {
  const a = normalizeStaffDisciplineText(cardRole);
  const b = normalizeStaffDisciplineText(rosterRole);
  if (!a || !b) return true;
  return a.includes(b) || b.includes(a);
}

/** Correlaciona cartão com roster oficial da comissão antes de TechnicalStaff. */
export function correlateStaffCardWithOfficialRoster(
  input: {
    name: string;
    roleLabel: string;
    teamSide?: 'home' | 'away';
  },
  staffRoster: FmfReportStaffRosterEntry[],
): FmfReportStaffRosterEntry | null {
  const side = input.teamSide;
  const candidates = staffRoster.filter((entry) => {
    if (side && entry.teamSide !== side) return false;
    if (!staffNamesCompatible(entry.name, input.name)) return false;
    return staffRolesCompatible(input.roleLabel, entry.roleLabel);
  });
  if (candidates.length === 1) return candidates[0]!;
  if (candidates.length > 1) {
    const byExactName = candidates.filter(
      (c) => normalizeStaffDisciplineText(c.name) === normalizeStaffDisciplineText(input.name),
    );
    return byExactName.length === 1 ? byExactName[0]! : null;
  }

  if (!side) return null;
  const byNameOnly = staffRoster.filter(
    (entry) => entry.teamSide === side && staffNamesCompatible(entry.name, input.name),
  );
  return byNameOnly.length === 1 ? byNameOnly[0]! : null;
}

export function resolveStaffForCardEvent(
  input: {
    name: string;
    roleLabel: string;
    teamSide?: 'home' | 'away';
    excerpt: string;
  },
  staffRoster: FmfReportStaffRosterEntry[],
  staffPool: StaffDisciplineCandidate[],
): StaffEventIdentityResult {
  const rosterHit = correlateStaffCardWithOfficialRoster(input, staffRoster);
  const lookupName = rosterHit?.name ?? input.name;
  const lookupRole = rosterHit?.roleLabel ?? input.roleLabel;
  const lookupText = `${lookupRole} ${lookupName}`;

  const member = resolveStaffDisciplineMember(lookupText, lookupName, staffPool);
  if (member) {
    return {
      technicalStaffId: member.id,
      resolutionStatus: 'resolved',
      resolutionReason: rosterHit ? 'STAFF_ROSTER_NAME_ROLE' : 'NAME_EXACT',
      rosterMatched: !!rosterHit,
    };
  }

  return {
    technicalStaffId: null,
    resolutionStatus: 'unresolved',
    resolutionReason: 'NO_MATCH',
    rosterMatched: !!rosterHit,
  };
}
