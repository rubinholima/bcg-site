export type CartoesSuspensaoSourceMode = 'legacy' | 'events' | 'auto';

export type CartoesSuspensaoSourceDecision = {
  effectiveMode: 'legacy' | 'events';
  configured: CartoesSuspensaoSourceMode;
  fallbackReason?: string;
};

export type DisciplineSourceMatchContext = {
  matchId: string;
  rawParsedAvailable: boolean;
  integrityStatus: string | null;
  eventCount: number;
  isFriendly: boolean;
};

export function getConfiguredCartoesSuspensaoSource(): CartoesSuspensaoSourceMode {
  const raw = (process.env.CARTOES_SUSPENSAO_SOURCE ?? 'auto').trim().toLowerCase();
  if (raw === 'legacy' || raw === 'events' || raw === 'auto') return raw;
  return 'auto';
}

function evaluateMatchesForEventsSource(
  matches: DisciplineSourceMatchContext[],
): { canUseEvents: boolean; reason?: string } {
  const competitive = matches.filter((m) => !m.isFriendly);
  if (competitive.length === 0) return { canUseEvents: true };

  for (const match of competitive) {
    if (!match.rawParsedAvailable) {
      return {
        canUseEvents: false,
        reason: 'Snapshot rawParsed indisponível em partida da competição',
      };
    }
    const synced = match.integrityStatus != null || match.eventCount > 0;
    if (!synced) {
      return {
        canUseEvents: false,
        reason: 'Partidas sem eventos oficiais sincronizados',
      };
    }
    if (match.integrityStatus === 'failed') {
      return {
        canUseEvents: false,
        reason: `Integridade oficial falhou na partida ${match.matchId}`,
      };
    }
  }

  return { canUseEvents: true };
}

/**
 * AUTO: usa events quando todas as partidas competitivas têm sync oficial.
 * Cartões unresolved NÃO causam fallback — ficam fora da acumulação individual.
 * FAILED estrutural ou ausência de sync → legacy.
 */
export function resolveCartoesSuspensaoSource(input: {
  configured: CartoesSuspensaoSourceMode;
  matches: DisciplineSourceMatchContext[];
}): CartoesSuspensaoSourceDecision {
  const { configured } = input;
  const evaluation = evaluateMatchesForEventsSource(input.matches);

  if (configured === 'legacy') {
    return { effectiveMode: 'legacy', configured };
  }

  if (configured === 'events') {
    if (!evaluation.canUseEvents) {
      return {
        effectiveMode: 'legacy',
        configured,
        fallbackReason: evaluation.reason,
      };
    }
    return { effectiveMode: 'events', configured };
  }

  if (!evaluation.canUseEvents) {
    return {
      effectiveMode: 'legacy',
      configured,
      fallbackReason: evaluation.reason,
    };
  }

  return { effectiveMode: 'events', configured };
}
