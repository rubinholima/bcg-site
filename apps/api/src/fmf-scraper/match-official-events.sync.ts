import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import type { ParsedFmfMatchReport } from './fmf-match-report.parser';
import {
  buildPlayerGoalExternalKey,
  buildPlayerCardExternalKey,
  buildPlayerSubstitutionExternalKey,
  buildStaffCardExternalKey,
} from './match-official-event.external-key';
import {
  assignSourceSequences,
  resolveSubstitutionResolution,
} from './match-official-event.ordering';
import {
  buildPlayerLinkPool,
  resolvePlayerForJerseyEvent,
  resolveStaffForCardEvent,
  type PlayerLinkPool,
} from './match-official-event.identity';
import type { StaffDisciplineCandidate } from '../futebol-relatorios/fmf-staff-cards.util';
import type { MatchOfficialEventDraft } from './match-official-event.types';

export type BuildOfficialEventDraftsInput = {
  parsed: ParsedFmfMatchReport;
  ourTeamSide: 'home' | 'away';
  playerPool: PlayerLinkPool;
  staffPool: StaffDisciplineCandidate[];
};

export function buildOfficialEventDrafts(input: BuildOfficialEventDraftsInput): MatchOfficialEventDraft[] {
  const { parsed, ourTeamSide, playerPool, staffPool } = input;
  const drafts: MatchOfficialEventDraft[] = [];
  const yellowSeq = new Map<string, number>();

  for (const goal of parsed.playerGoalEvents) {
    if (goal.teamSide !== ourTeamSide) continue;
    const identity = resolvePlayerForJerseyEvent(
      parsed.roster,
      goal.teamSide,
      goal.jerseyNumber,
      playerPool,
      goal.sourceName,
      goal.cbfRegistration,
    );
    const factType =
      goal.goalType === 'penalty'
        ? 'PLAYER_PENALTY_GOAL'
        : goal.goalType === 'own_goal'
          ? 'PLAYER_OWN_GOAL'
          : 'PLAYER_GOAL';
    drafts.push({
      factType,
      provenance: 'fmf_official',
      playerId: identity.playerId,
      technicalStaffId: null,
      resolutionStatus: identity.resolutionStatus,
      resolutionReason: identity.resolutionReason,
      sourceName: identity.sourceName,
      sourceRegistration: identity.sourceRegistration,
      sourceJerseyNumber: goal.jerseyNumber,
      sourceTeamSide: goal.teamSide,
      minute: goal.minute,
      period: goal.period,
      sourceClock: goal.clock,
      goalType: goal.goalType,
      sourceExcerpt: goal.excerpt,
      sourceSections: ['Gols'],
      externalKey: buildPlayerGoalExternalKey({
        goalType: goal.goalType,
        teamSide: goal.teamSide,
        period: goal.period,
        clock: goal.clock,
        jerseyNumber: goal.jerseyNumber,
      }),
    });
  }

  for (const card of parsed.playerCardEvents) {
    if (card.teamSide !== ourTeamSide) continue;
    const identity = resolvePlayerForJerseyEvent(
      parsed.roster,
      card.teamSide,
      card.jerseyNumber,
      playerPool,
      card.sourceName,
      card.cbfRegistration,
    );
    const seqKey = `${card.teamSide}:${card.jerseyNumber}:${card.kind}:${card.period}:${card.clock}`;
    const seq = yellowSeq.get(seqKey) ?? 0;
    if (card.kind === 'yellow') yellowSeq.set(seqKey, seq + 1);
    drafts.push({
      factType: card.kind === 'yellow' ? 'PLAYER_YELLOW_CARD' : 'PLAYER_RED_CARD',
      provenance: 'fmf_official',
      playerId: identity.playerId,
      technicalStaffId: null,
      resolutionStatus: identity.resolutionStatus,
      resolutionReason: identity.resolutionReason,
      sourceName: identity.sourceName,
      sourceRegistration: identity.sourceRegistration,
      sourceJerseyNumber: card.jerseyNumber,
      sourceTeamSide: card.teamSide,
      minute: card.minute,
      period: card.period,
      sourceClock: card.clock,
      sourceExcerpt: card.excerpt,
      sourceSections: [card.kind === 'yellow' ? 'Cartões Amarelos' : 'Cartões Vermelhos'],
      externalKey: buildPlayerCardExternalKey({
        kind: card.kind,
        teamSide: card.teamSide,
        period: card.period,
        clock: card.clock,
        jerseyNumber: card.jerseyNumber,
        sequence: card.kind === 'yellow' ? seq : 0,
      }),
    });
  }

  for (const sub of parsed.substitutionEvents) {
    if (sub.teamSide !== ourTeamSide) continue;
    const outIdentity = resolvePlayerForJerseyEvent(
      parsed.roster,
      sub.teamSide,
      sub.outJerseyNumber,
      playerPool,
      sub.outSourceName,
      sub.outCbfRegistration,
    );
    const inIdentity = resolvePlayerForJerseyEvent(
      parsed.roster,
      sub.teamSide,
      sub.inJerseyNumber,
      playerPool,
      sub.inSourceName,
      sub.inCbfRegistration,
    );
    const subResolution = resolveSubstitutionResolution({
      out: outIdentity,
      in: inIdentity,
    });
    drafts.push({
      factType: 'PLAYER_SUBSTITUTION',
      provenance: 'fmf_official',
      playerId: outIdentity.playerId,
      relatedPlayerId: inIdentity.playerId,
      technicalStaffId: null,
      resolutionStatus: subResolution.resolutionStatus,
      relatedResolutionStatus: subResolution.relatedResolutionStatus as MatchOfficialEventDraft['relatedResolutionStatus'],
      resolutionReason:
        subResolution.resolutionStatus === 'resolved'
          ? outIdentity.resolutionReason
          : outIdentity.resolutionReason ?? inIdentity.resolutionReason,
      sourceName: sub.outSourceName,
      sourceRegistration: sub.outCbfRegistration,
      sourceJerseyNumber: sub.outJerseyNumber,
      relatedJerseyNumber: sub.inJerseyNumber,
      sourceTeamSide: sub.teamSide,
      minute: sub.absoluteMinute,
      period: sub.period,
      sourceClock: sub.clock,
      sourceTimingMarker: sub.sourceTimingMarker ?? null,
      sourceExcerpt: sub.excerpt,
      sourceSections: ['Substituições'],
      externalKey: buildPlayerSubstitutionExternalKey({
        teamSide: sub.teamSide,
        period: sub.period,
        clock: sub.clock,
        outJersey: sub.outJerseyNumber,
        inJersey: sub.inJerseyNumber,
      }),
    });
  }

  const staffYellowSeq = new Map<string, number>();
  for (const card of parsed.staffCardEvents) {
    if (card.teamSide && card.teamSide !== ourTeamSide) continue;
    const teamSide = card.teamSide ?? ourTeamSide;
    const identity = resolveStaffForCardEvent(
      {
        name: card.name,
        roleLabel: card.roleLabel,
        teamSide,
        excerpt: card.excerpt,
      },
      parsed.staffRoster,
      staffPool,
    );
    const seqKey = `${teamSide}:${card.kind}:${card.period}:${card.clock}:${card.roleLabel}:${card.name}`;
    const seq = staffYellowSeq.get(seqKey) ?? 0;
    if (card.kind === 'yellow') staffYellowSeq.set(seqKey, seq + 1);
    drafts.push({
      factType: card.kind === 'yellow' ? 'STAFF_YELLOW_CARD' : 'STAFF_RED_CARD',
      provenance: 'fmf_official',
      playerId: null,
      technicalStaffId: identity.technicalStaffId,
      resolutionStatus: identity.resolutionStatus,
      resolutionReason: identity.resolutionReason,
      sourceName: card.name,
      sourceRoleLabel: card.roleLabel,
      sourceTeamSide: teamSide,
      minute: card.minute,
      period: card.period,
      sourceClock: card.clock,
      sourceExcerpt: card.excerpt,
      sourceSections: [
        card.sourceSection ?? (card.kind === 'yellow' ? 'Cartões Amarelos' : 'Cartões Vermelhos'),
      ],
      externalKey: buildStaffCardExternalKey({
        kind: card.kind,
        teamSide,
        period: card.period,
        clock: card.clock,
        roleLabel: card.roleLabel,
        name: card.name,
        sequence: card.kind === 'yellow' ? seq : 0,
      }),
    });
  }

  return assignSourceSequences(drafts);
}

function validateEventDraft(draft: MatchOfficialEventDraft): void {
  const playerFacts = draft.factType.startsWith('PLAYER_');
  const staffFacts = draft.factType.startsWith('STAFF_');
  if (draft.resolutionStatus === 'resolved') {
    if (playerFacts && draft.factType === 'PLAYER_SUBSTITUTION') {
      if (!draft.playerId || !draft.relatedPlayerId) {
        throw new Error(`Substituição ${draft.externalKey} marcada resolved sem ambos playerId`);
      }
    } else if (playerFacts && !draft.playerId) {
      throw new Error(`Evento ${draft.externalKey} resolvido sem playerId`);
    }
    if (staffFacts && !draft.technicalStaffId) {
      throw new Error(`Evento ${draft.externalKey} resolvido sem technicalStaffId`);
    }
  }
  if (draft.resolutionStatus === 'partial' && draft.factType === 'PLAYER_SUBSTITUTION') {
    if (!draft.playerId && !draft.relatedPlayerId) {
      throw new Error(`Substituição partial ${draft.externalKey} sem nenhum playerId`);
    }
  }
  if (staffFacts && draft.playerId) {
    throw new Error(`Evento staff ${draft.externalKey} não pode ter playerId`);
  }
  if (playerFacts && draft.technicalStaffId) {
    throw new Error(`Evento player ${draft.externalKey} não pode ter technicalStaffId`);
  }
}

export async function syncMatchOfficialEvents(
  prisma: PrismaService,
  params: {
    tenantId: string;
    matchId: string;
    parsed: ParsedFmfMatchReport;
    ourTeamSide: 'home' | 'away';
    players: PlayerLinkPool['players'];
    staff: StaffDisciplineCandidate[];
    parseSucceeded: boolean;
  },
): Promise<{ created: number; updated: number; removed: number; unresolved: number }> {
  if (!params.parseSucceeded) {
    return { created: 0, updated: 0, removed: 0, unresolved: 0 };
  }

  const playerPool = buildPlayerLinkPool(params.players);
  const drafts = buildOfficialEventDrafts({
    parsed: params.parsed,
    ourTeamSide: params.ourTeamSide,
    playerPool,
    staffPool: params.staff,
  });

  for (const draft of drafts) validateEventDraft(draft);

  const externalKeys = new Set(drafts.map((d) => d.externalKey));
  let created = 0;
  let updated = 0;

  for (const draft of drafts) {
    const data = {
      tenantId: params.tenantId,
      fmfMatchReportId: params.matchId,
      factType: draft.factType,
      provenance: draft.provenance,
      playerId: draft.playerId ?? null,
      technicalStaffId: draft.technicalStaffId ?? null,
      relatedPlayerId: draft.relatedPlayerId ?? null,
      resolutionStatus: draft.resolutionStatus,
      relatedResolutionStatus: draft.relatedResolutionStatus ?? null,
      resolutionReason: draft.resolutionReason ?? null,
      sourceName: draft.sourceName ?? null,
      sourceRegistration: draft.sourceRegistration ?? null,
      sourceJerseyNumber: draft.sourceJerseyNumber ?? null,
      relatedJerseyNumber: draft.relatedJerseyNumber ?? null,
      sourceRoleLabel: draft.sourceRoleLabel ?? null,
      sourceTeamSide: draft.sourceTeamSide ?? null,
      minute: draft.minute ?? null,
      period: draft.period ?? null,
      sourceClock: draft.sourceClock ?? null,
      sourceSequence: draft.sourceSequence ?? null,
      goalType: draft.goalType ?? null,
      sourceExcerpt: draft.sourceExcerpt ?? null,
      sourceSections: (draft.sourceSections ?? null) as Prisma.InputJsonValue,
    };

    const existing = await prisma.matchOfficialEvent.findUnique({
      where: {
        fmfMatchReportId_externalKey: {
          fmfMatchReportId: params.matchId,
          externalKey: draft.externalKey,
        },
      },
    });

    if (existing) {
      await prisma.matchOfficialEvent.update({
        where: { id: existing.id },
        data,
      });
      updated += 1;
    } else {
      await prisma.matchOfficialEvent.create({
        data: { ...data, externalKey: draft.externalKey },
      });
      created += 1;
    }
  }

  const stale = await prisma.matchOfficialEvent.findMany({
    where: {
      fmfMatchReportId: params.matchId,
      provenance: 'fmf_official',
      externalKey: { notIn: [...externalKeys] },
    },
    select: { id: true },
  });
  if (stale.length > 0) {
    await prisma.matchOfficialEvent.deleteMany({
      where: { id: { in: stale.map((s) => s.id) } },
    });
  }

  const unresolved = drafts.filter(
    (d) => d.resolutionStatus !== 'resolved' && d.resolutionStatus !== 'partial',
  ).length + drafts.filter((d) => d.resolutionStatus === 'partial').length;
  return { created, updated, removed: stale.length, unresolved };
}
