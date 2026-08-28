import type {
  MatchIntegrityStatus,
  MatchReconciliationDetail,
} from '../fmf-scraper/match-official-event.types';
import type { ParsedFmfMatchReport } from '../fmf-scraper/fmf-match-report.parser';

export type SumulaCartoesSourceMode = 'legacy' | 'events' | 'auto';

export type SumulaCartoesSourceDecision = {
  effectiveMode: 'legacy' | 'events';
  configured: SumulaCartoesSourceMode;
  fallbackReason?: string;
};

export function getConfiguredSumulaCartoesSource(): SumulaCartoesSourceMode {
  const raw = (process.env.SUMULA_CARTOES_SOURCE ?? 'auto').trim().toLowerCase();
  if (raw === 'legacy' || raw === 'events' || raw === 'auto') return raw;
  return 'auto';
}

function buildFailedReason(
  reconciliation: MatchReconciliationDetail | null,
  limitations: string[],
): string {
  if (!reconciliation) return 'Reconciliação oficial indisponível';
  const s = reconciliation.events.summary;
  if (s.missing > 0) return `${s.missing} fato(s) oficial(is) ausente(s) na projeção`;
  if (s.drifted > 0) return `${s.drifted} evento(s) com divergência de conteúdo`;
  if (s.stale > 0) return `${s.stale} evento(s) obsoleto(s) detectado(s)`;
  if (s.extra > 0) return `${s.extra} evento(s) extra(s) sem correspondência na fonte`;
  if (limitations.length > 0) return limitations[0]!;
  return 'Integridade oficial falhou';
}

/** Limitações que impedem representação fiel — identidade incompleta NÃO entra aqui. */
function isCriticalSourceLimitation(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('rawparsed indisponível') ||
    lower.includes('parser não estruturou') ||
    lower.includes('parser falhou')
  );
}

/**
 * AUTO: usa events quando fatos oficiais estão estruturalmente persistidos.
 * unresolved/partial/ambiguous de identidade NÃO causam fallback.
 * FAILED (missing/drifted/stale/extra) ou limitação crítica de parser → legacy.
 */
export function resolveSumulaCartoesSource(input: {
  configured: SumulaCartoesSourceMode;
  parsed: ParsedFmfMatchReport | null;
  persistedEventCount: number;
  reconciliation: MatchReconciliationDetail | null;
  integrityStatus: MatchIntegrityStatus | null;
  limitations: string[];
}): SumulaCartoesSourceDecision {
  const { configured } = input;

  if (configured === 'legacy') {
    return { effectiveMode: 'legacy', configured };
  }

  const noParsed = !input.parsed;
  const noEvents = input.persistedEventCount === 0;
  const failed = input.integrityStatus === 'failed';

  if (configured === 'events') {
    if (noParsed) {
      return {
        effectiveMode: 'legacy',
        configured,
        fallbackReason: 'Snapshot rawParsed indisponível',
      };
    }
    if (noEvents) {
      return {
        effectiveMode: 'legacy',
        configured,
        fallbackReason: 'Nenhum evento oficial persistido para a partida',
      };
    }
    if (failed) {
      return {
        effectiveMode: 'legacy',
        configured,
        fallbackReason: buildFailedReason(input.reconciliation, input.limitations),
      };
    }
    return { effectiveMode: 'events', configured };
  }

  // auto
  if (noParsed) {
    return {
      effectiveMode: 'legacy',
      configured,
      fallbackReason: 'Snapshot rawParsed indisponível',
    };
  }
  if (noEvents) {
    return {
      effectiveMode: 'legacy',
      configured,
      fallbackReason: 'Eventos oficiais ainda não sincronizados',
    };
  }
  if (failed) {
    return {
      effectiveMode: 'legacy',
      configured,
      fallbackReason: buildFailedReason(input.reconciliation, input.limitations),
    };
  }

  const critical = input.limitations.find(isCriticalSourceLimitation);
  if (critical) {
    return { effectiveMode: 'legacy', configured, fallbackReason: critical };
  }

  return { effectiveMode: 'events', configured };
}
