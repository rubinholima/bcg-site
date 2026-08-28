import type { DriftClassification } from './match-official-event.types';
import { compareProjectedToPersistedStats } from './fmf-player-stat.projection';

export type ShadowComparisonResult = {
  playerStatDrifts: Array<{
    classification: DriftClassification;
    cbfRegistration: string;
    field: string;
    persisted: number | boolean;
    projected: number | boolean;
  }>;
  staffCardDrifts: Array<{
    classification: DriftClassification;
    message: string;
  }>;
};

export function classifyPlayerStatDrift(field: string): DriftClassification {
  if (field === 'minutesPlayed') return 'MINUTES_DRIFT';
  if (field === 'goals' || field === 'ownGoals' || field === 'penaltyGoals') return 'GOAL_DRIFT';
  if (field === 'yellowCards' || field === 'redCards') return 'CARD_DRIFT';
  return 'IDENTITY_DRIFT';
}

export function buildShadowComparison(input: {
  projectedStats: Parameters<typeof compareProjectedToPersistedStats>[0];
  persistedStats: Parameters<typeof compareProjectedToPersistedStats>[1];
  eventStaffYellow: number;
  eventStaffRed: number;
  phase1StaffYellow: number;
  phase1StaffRed: number;
}): ShadowComparisonResult {
  const rawDrifts = compareProjectedToPersistedStats(input.projectedStats, input.persistedStats);
  const playerStatDrifts = rawDrifts.map((d) => ({
    ...d,
    classification: classifyPlayerStatDrift(d.field),
  }));

  const staffCardDrifts: ShadowComparisonResult['staffCardDrifts'] = [];
  if (input.eventStaffYellow !== input.phase1StaffYellow) {
    staffCardDrifts.push({
      classification: 'CARD_DRIFT',
      message: `Amarelos comissão: eventos=${input.eventStaffYellow} fase1=${input.phase1StaffYellow}`,
    });
  }
  if (input.eventStaffRed !== input.phase1StaffRed) {
    staffCardDrifts.push({
      classification: 'CARD_DRIFT',
      message: `Vermelhos comissão: eventos=${input.eventStaffRed} fase1=${input.phase1StaffRed}`,
    });
  }

  return { playerStatDrifts, staffCardDrifts };
}
