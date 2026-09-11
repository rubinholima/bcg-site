import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import type { ParsedFmfMatchReport } from './fmf-match-report.parser';
import {
  buildPlayerCardExternalKey,
  buildStaffCardExternalKey,
} from './match-official-event.external-key';
import {
  buildPlayerLinkPool,
  resolvePlayerForJerseyEvent,
  resolveStaffForCardEvent,
  type PlayerLinkPool,
} from './match-official-event.identity';
import type { StaffDisciplineCandidate } from '../futebol-relatorios/fmf-staff-cards.util';
import type { MatchOfficialEventDraft } from './match-official-event.types';

export const DISCIPLINE_CARD_FACT_TYPES = [
  'PLAYER_YELLOW_CARD',
  'PLAYER_RED_CARD',
  'STAFF_YELLOW_CARD',
  'STAFF_RED_CARD',
] as const;

export type DisciplineCardFactType = (typeof DISCIPLINE_CARD_FACT_TYPES)[number];

export function isDisciplineCardFactType(factType: string): factType is DisciplineCardFactType {
  return (DISCIPLINE_CARD_FACT_TYPES as readonly string[]).includes(factType);
}

export type DisciplineEventFieldSnapshot = {
  factType: string;
  externalKey: string;
  playerId: string | null;
  technicalStaffId: string | null;
  sourceClock: string | null;
  period: string | null;
  sourceSections: unknown;
  sourceExcerpt: string | null;
};

export type DisciplineEventOperationPlan = {
  op: 'CREATE' | 'UPDATE' | 'DELETE';
  eventId: string | null;
  externalKey: string;
  factType: string;
  before: DisciplineEventFieldSnapshot | null;
  after: DisciplineEventFieldSnapshot | null;
};

type ExistingDisciplineEvent = {
  id: string;
  factType: string;
  provenance: string;
  externalKey: string;
  playerId: string | null;
  technicalStaffId: string | null;
  sourceClock: string | null;
  period: string | null;
  sourceSections: unknown;
  sourceExcerpt: string | null;
};

function snapshotFromExisting(event: ExistingDisciplineEvent): DisciplineEventFieldSnapshot {
  return {
    factType: event.factType,
    externalKey: event.externalKey,
    playerId: event.playerId,
    technicalStaffId: event.technicalStaffId,
    sourceClock: event.sourceClock,
    period: event.period,
    sourceSections: event.sourceSections,
    sourceExcerpt: event.sourceExcerpt,
  };
}

function snapshotFromDraft(draft: MatchOfficialEventDraft): DisciplineEventFieldSnapshot {
  return {
    factType: draft.factType,
    externalKey: draft.externalKey,
    playerId: draft.playerId ?? null,
    technicalStaffId: draft.technicalStaffId ?? null,
    sourceClock: draft.sourceClock ?? null,
    period: draft.period ?? null,
    sourceSections: draft.sourceSections ?? null,
    sourceExcerpt: draft.sourceExcerpt ?? null,
  };
}

function snapshotsEqual(
  a: DisciplineEventFieldSnapshot | null,
  b: DisciplineEventFieldSnapshot | null,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Apenas cartões — sem gols/substituições. */
export function buildDisciplineCardEventDrafts(input: {
  parsed: ParsedFmfMatchReport;
  ourTeamSide: 'home' | 'away';
  playerPool: PlayerLinkPool;
  staffPool: StaffDisciplineCandidate[];
}): MatchOfficialEventDraft[] {
  const { parsed, ourTeamSide, playerPool, staffPool } = input;
  const drafts: MatchOfficialEventDraft[] = [];
  const yellowSeq = new Map<string, number>();

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
    const sourceSections = [
      card.kind === 'yellow' ? 'Cartões Amarelos' : 'Cartões Vermelhos',
      ...(card.expulsionBySecondYellow ? ['Expulsão por 2º amarelo'] : []),
    ];
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
      sourceSections,
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

  return drafts;
}

export function planDisciplineEventOperations(input: {
  existingEvents: ExistingDisciplineEvent[];
  drafts: MatchOfficialEventDraft[];
}): DisciplineEventOperationPlan[] {
  const disciplineExisting = input.existingEvents.filter(
    (event) => event.provenance === 'fmf_official' && isDisciplineCardFactType(event.factType),
  );
  const byKey = new Map(disciplineExisting.map((event) => [event.externalKey, event]));
  const draftByKey = new Map(input.drafts.map((draft) => [draft.externalKey, draft]));
  const operations: DisciplineEventOperationPlan[] = [];

  for (const draft of input.drafts) {
    const existing = byKey.get(draft.externalKey);
    const after = snapshotFromDraft(draft);
    if (!existing) {
      operations.push({
        op: 'CREATE',
        eventId: null,
        externalKey: draft.externalKey,
        factType: draft.factType,
        before: null,
        after,
      });
      continue;
    }
    const before = snapshotFromExisting(existing);
    if (!snapshotsEqual(before, after)) {
      operations.push({
        op: 'UPDATE',
        eventId: existing.id,
        externalKey: draft.externalKey,
        factType: draft.factType,
        before,
        after,
      });
    }
  }

  for (const existing of disciplineExisting) {
    if (draftByKey.has(existing.externalKey)) continue;
    operations.push({
      op: 'DELETE',
      eventId: existing.id,
      externalKey: existing.externalKey,
      factType: existing.factType,
      before: snapshotFromExisting(existing),
      after: null,
    });
  }

  return operations;
}

function draftToCreateData(
  tenantId: string,
  matchId: string,
  draft: MatchOfficialEventDraft,
): Prisma.MatchOfficialEventUncheckedCreateInput {
  return {
    tenantId,
    fmfMatchReportId: matchId,
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
    externalKey: draft.externalKey,
  };
}

function draftToUpdateData(
  draft: MatchOfficialEventDraft,
): Prisma.MatchOfficialEventUncheckedUpdateInput {
  return {
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
}

type TxClient = Pick<
  PrismaService,
  'matchOfficialEvent'
>;

export async function applyDisciplineEventOperations(
  tx: TxClient,
  input: {
    tenantId: string;
    matchId: string;
    operations: DisciplineEventOperationPlan[];
    draftsByExternalKey: Map<string, MatchOfficialEventDraft>;
  },
): Promise<{ created: number; updated: number; deleted: number }> {
  let created = 0;
  let updated = 0;
  let deleted = 0;

  for (const operation of input.operations) {
    const draft = input.draftsByExternalKey.get(operation.externalKey);
    if (operation.op === 'CREATE') {
      if (!draft) throw new Error(`Draft ausente para CREATE ${operation.externalKey}`);
      await tx.matchOfficialEvent.create({
        data: draftToCreateData(input.tenantId, input.matchId, draft),
      });
      created += 1;
      continue;
    }
    if (operation.op === 'UPDATE') {
      if (!draft || !operation.eventId) {
        throw new Error(`Draft/eventId ausente para UPDATE ${operation.externalKey}`);
      }
      await tx.matchOfficialEvent.update({
        where: { id: operation.eventId },
        data: draftToUpdateData(draft),
      });
      updated += 1;
      continue;
    }
    if (operation.op === 'DELETE') {
      if (!operation.eventId) throw new Error(`eventId ausente para DELETE ${operation.externalKey}`);
      await tx.matchOfficialEvent.delete({ where: { id: operation.eventId } });
      deleted += 1;
    }
  }

  return { created, updated, deleted };
}

export function buildDisciplineCardDraftsForRepair(input: {
  parsed: ParsedFmfMatchReport;
  ourTeamSide: 'home' | 'away';
  players: PlayerLinkPool['players'];
  staff: StaffDisciplineCandidate[];
}): MatchOfficialEventDraft[] {
  const playerPool = buildPlayerLinkPool(input.players);
  return buildDisciplineCardEventDrafts({
    parsed: input.parsed,
    ourTeamSide: input.ourTeamSide,
    playerPool,
    staffPool: input.staff,
  });
}
