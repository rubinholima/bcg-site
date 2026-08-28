import type { ParsedFmfMatchReport } from './fmf-match-report.parser';
import { buildOfficialEventDrafts } from './match-official-events.sync';
import type { PlayerLinkPool } from './match-official-event.identity';
import type {
  EventReconciliationOutcome,
  EventReconciliationRow,
  MatchOfficialEventDraft,
  MatchOfficialFactType,
} from './match-official-event.types';
import type { StaffDisciplineCandidate } from '../futebol-relatorios/fmf-staff-cards.util';

export type PersistedOfficialEvent = {
  id: string;
  externalKey: string;
  factType: string;
  resolutionStatus: string;
  relatedResolutionStatus?: string | null;
  sourceTeamSide?: string | null;
  sourceJerseyNumber?: number | null;
  relatedJerseyNumber?: number | null;
  sourceName?: string | null;
  sourceRoleLabel?: string | null;
  minute?: number | null;
  period?: string | null;
  sourceClock?: string | null;
  playerId?: string | null;
  technicalStaffId?: string | null;
  relatedPlayerId?: string | null;
};

function summarizeDraft(d: MatchOfficialEventDraft): string {
  const side = d.sourceTeamSide ?? '?';
  const clock = d.sourceClock ?? (d.minute != null ? `${d.minute}'` : '?');
  if (d.factType === 'PLAYER_SUBSTITUTION') {
    return `${side} sub ${d.sourceJerseyNumber}→${d.relatedJerseyNumber} ${clock} ${d.period ?? ''}`.trim();
  }
  if (d.factType.startsWith('STAFF_')) {
    return `${side} ${d.sourceRoleLabel ?? 'staff'} ${d.sourceName ?? '?'} ${clock} ${d.period ?? ''}`.trim();
  }
  return `${side} #${d.sourceJerseyNumber ?? '?'} ${d.factType} ${clock} ${d.period ?? ''}`.trim();
}

function summarizePersisted(p: PersistedOfficialEvent): string {
  const side = p.sourceTeamSide ?? '?';
  const clock = p.sourceClock ?? (p.minute != null ? `${p.minute}'` : '?');
  if (p.factType === 'PLAYER_SUBSTITUTION') {
    return `${side} sub ${p.sourceJerseyNumber}→${p.relatedJerseyNumber} ${clock} status=${p.resolutionStatus}/${p.relatedResolutionStatus ?? '?'}`;
  }
  if (p.factType.startsWith('STAFF_')) {
    return `${side} ${p.sourceRoleLabel ?? 'staff'} ${p.sourceName ?? '?'} ${clock} status=${p.resolutionStatus}`;
  }
  return `${side} #${p.sourceJerseyNumber ?? '?'} ${p.factType} ${clock} status=${p.resolutionStatus}`;
}

function draftIdentityMatchesPersisted(
  draft: MatchOfficialEventDraft,
  persisted: PersistedOfficialEvent,
): boolean {
  if (draft.factType !== persisted.factType) return false;
  if ((draft.sourceTeamSide ?? null) !== (persisted.sourceTeamSide ?? null)) return false;
  if ((draft.sourceJerseyNumber ?? null) !== (persisted.sourceJerseyNumber ?? null)) return false;
  if (draft.factType === 'PLAYER_SUBSTITUTION') {
    if ((draft.relatedJerseyNumber ?? null) !== (persisted.relatedJerseyNumber ?? null)) return false;
  }
  if (draft.factType.startsWith('STAFF_')) {
    const draftRole = (draft.sourceRoleLabel ?? '').toLowerCase();
    const persistedRole = (persisted.sourceRoleLabel ?? '').toLowerCase();
    const draftName = (draft.sourceName ?? '').toLowerCase();
    const persistedName = (persisted.sourceName ?? '').toLowerCase();
    if (draftRole !== persistedRole || draftName !== persistedName) return false;
  } else if (draft.sourceName && persisted.sourceName) {
    const draftName = draft.sourceName.toLowerCase();
    const persistedName = persisted.sourceName.toLowerCase();
    if (draftName !== persistedName) return false;
  }
  const draftClock = draft.sourceClock ?? null;
  const persistedClock = persisted.sourceClock ?? null;
  if (draftClock && persistedClock && draftClock !== persistedClock) return false;
  if ((draft.period ?? null) !== (persisted.period ?? null)) return false;
  return true;
}

function resolutionOutcome(
  draft: MatchOfficialEventDraft,
  persisted: PersistedOfficialEvent,
): EventReconciliationOutcome {
  if (!draftIdentityMatchesPersisted(draft, persisted)) return 'drifted';
  if (draft.resolutionStatus === 'resolved' && persisted.resolutionStatus === 'resolved') return 'matched';
  if (persisted.resolutionStatus === 'ambiguous' || draft.resolutionStatus === 'ambiguous') return 'ambiguous';
  if (persisted.resolutionStatus === 'partial' || draft.resolutionStatus === 'partial') return 'unresolved';
  if (persisted.resolutionStatus === 'unresolved' || draft.resolutionStatus === 'unresolved') return 'unresolved';
  return 'matched';
}

function explainOutcome(
  outcome: EventReconciliationOutcome,
  draft: MatchOfficialEventDraft,
  persisted?: PersistedOfficialEvent,
): string | null {
  switch (outcome) {
    case 'matched':
      return null;
    case 'missing':
      return `Fato oficial ausente no banco: ${summarizeDraft(draft)}`;
    case 'stale':
      return `Evento persistido não existe mais na fonte: ${persisted ? summarizePersisted(persisted) : ''}`;
    case 'extra':
      return `Evento extra no banco sem correspondente na fonte`;
    case 'drifted':
      return `Conteúdo divergente entre fonte (${summarizeDraft(draft)}) e persistido (${persisted ? summarizePersisted(persisted) : '?'})`;
    case 'ambiguous':
      return `Identidade ambígua: ${summarizeDraft(draft)}`;
    case 'unresolved':
      if (draft.factType === 'PLAYER_SUBSTITUTION' && draft.resolutionStatus === 'partial') {
        return `Substituição parcialmente resolvida: ${summarizeDraft(draft)}`;
      }
      if (draft.factType.startsWith('STAFF_')) {
        return `Cartão de comissão sem vínculo cadastral: ${draft.sourceRoleLabel ?? 'comissão'} ${draft.sourceName ?? ''}`.trim();
      }
      return `Atleta da súmula sem vínculo cadastral: ${summarizeDraft(draft)}`;
    default:
      return null;
  }
}

export function reconcileOfficialEvents(input: {
  parsed: ParsedFmfMatchReport;
  ourTeamSide: 'home' | 'away';
  playerPool: PlayerLinkPool;
  staffPool: StaffDisciplineCandidate[];
  persisted: PersistedOfficialEvent[];
}): {
  rows: EventReconciliationRow[];
  summary: Record<EventReconciliationOutcome, number>;
} {
  const drafts = buildOfficialEventDrafts({
    parsed: input.parsed,
    ourTeamSide: input.ourTeamSide,
    playerPool: input.playerPool,
    staffPool: input.staffPool,
  });

  const draftByKey = new Map(drafts.map((d) => [d.externalKey, d]));
  const persistedByKey = new Map(input.persisted.map((p) => [p.externalKey, p]));
  const rows: EventReconciliationRow[] = [];
  const summary: Record<EventReconciliationOutcome, number> = {
    matched: 0,
    unresolved: 0,
    ambiguous: 0,
    missing: 0,
    drifted: 0,
    stale: 0,
    extra: 0,
  };

  for (const draft of drafts) {
    const persisted = persistedByKey.get(draft.externalKey);
    if (!persisted) {
      const outcome: EventReconciliationOutcome = 'missing';
      summary[outcome] += 1;
      rows.push({
        externalKey: draft.externalKey,
        factType: draft.factType,
        outcome,
        sourceSummary: summarizeDraft(draft),
        persistedSummary: null,
        explain: explainOutcome(outcome, draft),
      });
      continue;
    }
    const outcome = resolutionOutcome(draft, persisted);
    summary[outcome] += 1;
    rows.push({
      externalKey: draft.externalKey,
      factType: draft.factType,
      outcome,
      sourceSummary: summarizeDraft(draft),
      persistedSummary: summarizePersisted(persisted),
      explain: explainOutcome(outcome, draft, persisted),
    });
  }

  for (const persisted of input.persisted) {
    if (!draftByKey.has(persisted.externalKey)) {
      summary.stale += 1;
      rows.push({
        externalKey: persisted.externalKey,
        factType: persisted.factType as MatchOfficialFactType,
        outcome: 'stale',
        sourceSummary: '',
        persistedSummary: summarizePersisted(persisted),
        explain: explainOutcome('stale', {} as MatchOfficialEventDraft, persisted),
      });
    }
  }

  return { rows, summary };
}

export function mergeStaffCardSections(parsed: ParsedFmfMatchReport): number {
  const keys = new Set<string>();
  for (const card of parsed.staffCardEvents) {
    keys.add(`${card.kind}:${card.period}:${card.clock}:${card.roleLabel}:${card.name}`);
  }
  return keys.size;
}
