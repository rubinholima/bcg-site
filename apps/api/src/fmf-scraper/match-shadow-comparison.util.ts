import type { DriftClassification } from './match-official-event.types';
import { compareProjectedToPersistedStats } from './fmf-player-stat.projection';

export type ShadowDriftClassification =
  | DriftClassification
  | 'EXPECTED_LEGACY_BUG'
  | 'EXPECTED_NEW_COVERAGE'
  | 'SOURCE_LIMITATION'
  | 'EXPECTED_SEMANTIC_DIFF';

export type ShadowComparisonResult = {
  playerStatDrifts: Array<{
    classification: ShadowDriftClassification;
    cbfRegistration: string;
    field: string;
    persisted: number | boolean;
    projected: number | boolean;
    explain?: string;
  }>;
  staffCardDrifts: Array<{
    classification: ShadowDriftClassification;
    message: string;
  }>;
};

export function classifyPlayerStatDrift(
  field: string,
  persisted: number | boolean,
  projected: number | boolean,
  context?: { hasRedCard?: boolean; hasSecondYellow?: boolean },
): ShadowDriftClassification {
  if (field === 'minutesPlayed') {
    if (
      typeof persisted === 'number' &&
      typeof projected === 'number' &&
      persisted > projected &&
      (context?.hasRedCard || context?.hasSecondYellow)
    ) {
      return 'EXPECTED_LEGACY_BUG';
    }
    return 'MINUTES_DRIFT';
  }
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
  eventContext?: {
    redCardJerseys?: number[];
    secondYellowJerseys?: number[];
  };
}): ShadowComparisonResult {
  const rawDrifts = compareProjectedToPersistedStats(input.projectedStats, input.persistedStats);
  const playerStatDrifts = rawDrifts.map((d) => {
    const jersey = input.persistedStats.find((p) => p.cbfRegistration === d.cbfRegistration)?.jerseyNumber;
    const hasRedCard = jersey != null && input.eventContext?.redCardJerseys?.includes(jersey);
    const hasSecondYellow = jersey != null && input.eventContext?.secondYellowJerseys?.includes(jersey);
    const classification = classifyPlayerStatDrift(d.field, d.persisted, d.projected, {
      hasRedCard,
      hasSecondYellow,
    });
    let explain: string | undefined;
    if (classification === 'EXPECTED_LEGACY_BUG' && d.field === 'minutesPlayed') {
      explain = `Minutos divergem porque o atleta foi expulso/interrompido aos ${d.projected}' (legacy=${d.persisted}, projeção=${d.projected}).`;
    }
    return { ...d, classification, explain };
  });

  const staffCardDrifts: ShadowComparisonResult['staffCardDrifts'] = [];
  if (input.eventStaffYellow !== input.phase1StaffYellow) {
    staffCardDrifts.push({
      classification:
        input.eventStaffYellow > input.phase1StaffYellow ? 'EXPECTED_NEW_COVERAGE' : 'CARD_DRIFT',
      message: `Amarelos comissão: eventos=${input.eventStaffYellow} fase1=${input.phase1StaffYellow}`,
    });
  }
  if (input.eventStaffRed !== input.phase1StaffRed) {
    staffCardDrifts.push({
      classification:
        input.eventStaffRed > input.phase1StaffRed ? 'EXPECTED_NEW_COVERAGE' : 'CARD_DRIFT',
      message: `Vermelhos comissão: eventos=${input.eventStaffRed} fase1=${input.phase1StaffRed}`,
    });
  }

  return { playerStatDrifts, staffCardDrifts };
}
