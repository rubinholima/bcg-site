import type { BchAlertCandidate } from './boston-city-hall-operational-alert.constants';

export type AlertRowLike = {
  deduplicationKey: string;
  status: string;
  acknowledgedAt: Date | null;
  acknowledgedByUserId: string | null;
};

export type SyncUpsertAction = BchAlertCandidate & { reopen: boolean };
export type SyncResolveKey = string;

/** Determina upserts e resoluções a partir de candidatos ativos. */
export function planAlertSync(
  candidates: BchAlertCandidate[],
  existing: AlertRowLike[],
): { upsert: SyncUpsertAction[]; resolveKeys: SyncResolveKey[] } {
  const candidateKeys = new Set(candidates.map((c) => c.deduplicationKey));
  const existingByKey = new Map(existing.map((e) => [e.deduplicationKey, e]));

  const upsert: SyncUpsertAction[] = candidates.map((c) => {
    const prev = existingByKey.get(c.deduplicationKey);
    const reopen = prev?.status === 'resolved';
    return { ...c, reopen };
  });

  const resolveKeys = existing
    .filter((e) => (e.status === 'open' || e.status === 'acknowledged') && !candidateKeys.has(e.deduplicationKey))
    .map((e) => e.deduplicationKey);

  return { upsert, resolveKeys };
}
