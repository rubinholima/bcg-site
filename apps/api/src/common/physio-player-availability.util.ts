/** Prefixos em Player.statusDetails para restrições de fisio/transição. */

export const FISIO_STATUS_PREFIX = 'Fisio:';
export const TRANSITION_STATUS_PREFIX = 'Transição:';

export const PROTECTED_PLAYER_STATUSES = ['suspended', 'absent', 'not_in_squad'] as const;

export type PhysioAvailabilitySession = {
  disposition: string | null;
};

export type PhysioAvailabilityResolution =
  | {
      kind: 'update';
      status: 'injured' | 'available';
      statusDetails: string;
      statusUntil: Date | null;
    }
  | { kind: 'clear_fisio_transition' }
  | { kind: 'no_change' };

export function resolvePhysioTransitionAvailability(input: {
  playerStatus: string;
  playerStatusDetails: string | null;
  activePhysioSessions: PhysioAvailabilitySession[];
  hasActiveTransitionProgram: boolean;
  physioDetailsBase: string;
  physioLatestEnd: Date | null;
  transitionSummary: string;
}): PhysioAvailabilityResolution {
  const status = (input.playerStatus || 'available').toLowerCase();
  if (
    PROTECTED_PLAYER_STATUSES.includes(status as (typeof PROTECTED_PLAYER_STATUSES)[number])
  ) {
    return { kind: 'no_change' };
  }

  const hasNaoApto = input.activePhysioSessions.some(
    (s) => s.disposition === 'nao_apto' || !s.disposition,
  );
  if (hasNaoApto) {
    return {
      kind: 'update',
      status: 'injured',
      statusDetails: `${FISIO_STATUS_PREFIX} NÃO APTO · ${input.physioDetailsBase}`,
      statusUntil: input.physioLatestEnd,
    };
  }

  if (input.hasActiveTransitionProgram) {
    return {
      kind: 'update',
      status: 'injured',
      statusDetails: `${TRANSITION_STATUS_PREFIX} EM TRANSIÇÃO · ${input.transitionSummary}`,
      statusUntil: null,
    };
  }

  const hasEmTratamento = input.activePhysioSessions.some(
    (s) => s.disposition === 'em_tratamento',
  );
  if (hasEmTratamento) {
    return {
      kind: 'update',
      status: 'available',
      statusDetails: `${FISIO_STATUS_PREFIX} EM TRATAMENTO (pode treinar) · ${input.physioDetailsBase}`,
      statusUntil: input.physioLatestEnd,
    };
  }

  if (input.activePhysioSessions.length === 0) {
    return { kind: 'clear_fisio_transition' };
  }

  return { kind: 'clear_fisio_transition' };
}

export function shouldClearFisioTransitionStatus(
  status: string,
  statusDetails: string | null,
): boolean {
  const normalized = (status || 'available').toLowerCase();
  if (normalized !== 'injured' && normalized !== 'available') return false;
  if (!statusDetails) return false;
  return (
    statusDetails.startsWith(FISIO_STATUS_PREFIX) ||
    statusDetails.startsWith(TRANSITION_STATUS_PREFIX)
  );
}
