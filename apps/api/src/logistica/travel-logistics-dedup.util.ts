import { dateKeyInBrazil } from '../common/brazil-time.util';

type TravelDedupRow = {
  id: string;
  tenantId: string;
  matchDate: Date;
  opponentName: string | null;
  externalId?: string | null;
  status?: string | null;
  updatedAt?: Date;
  _count?: { participants?: number };
};

export function normalizeTravelOpponent(name: string | null | undefined): string {
  return (name ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function travelDedupKey(row: TravelDedupRow): string {
  return `${row.tenantId}|${dateKeyInBrazil(row.matchDate)}|${normalizeTravelOpponent(row.opponentName)}`;
}

export function buildTravelMatchKey(
  tenantId: string,
  matchDate: Date | string,
  opponentName: string | null | undefined,
): string {
  const date = typeof matchDate === 'string' ? new Date(matchDate) : matchDate;
  return `${tenantId}|${dateKeyInBrazil(date)}|${normalizeTravelOpponent(opponentName)}`;
}

function travelKeepScore(row: TravelDedupRow): number {
  let score = 0;
  score += (row._count?.participants ?? 0) * 10;
  const ext = row.externalId?.trim();
  if (ext) score += 100;
  if (ext?.startsWith('beatscode-travel') || ext?.startsWith('fmf-travel')) score += 50;
  if (row.status && row.status !== 'rascunho' && row.status !== 'cancelado') score += 25;
  if (row.updatedAt) score += new Date(row.updatedAt).getTime() / 1e12;
  return score;
}

/** Remove viagens duplicadas (mesmo clube + data + adversário), mantendo o registro mais completo. */
export function dedupeTravelLogisticsList<T extends TravelDedupRow>(items: T[]): T[] {
  const bestByKey = new Map<string, T>();
  for (const item of items) {
    const key = travelDedupKey(item);
    const prev = bestByKey.get(key);
    if (!prev || travelKeepScore(item) > travelKeepScore(prev)) {
      bestByKey.set(key, item);
    }
  }
  const keepIds = new Set([...bestByKey.values()].map((r) => r.id));
  return items.filter((item) => keepIds.has(item.id));
}
