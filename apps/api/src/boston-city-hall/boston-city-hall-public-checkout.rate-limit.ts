/**
 * Anti-abuso leve para POST público de checkout (Fase 3.2).
 * Janela deslizante em memória por IP — adequado a instância única / dev;
 * em cluster, repetir pedidos ainda é bloqueado por idempotencyKey + anti-oversell.
 */
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 12;

type Entry = { timestamps: number[] };

const buckets = new Map<string, Entry>();

function prune(entry: Entry, now: number): void {
  entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);
}

export function assertPublicCheckoutRateLimit(clientKey: string): void {
  const key = clientKey.trim() || 'unknown';
  const now = Date.now();
  let entry = buckets.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    buckets.set(key, entry);
  }
  prune(entry, now);
  if (entry.timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    throw new Error('RATE_LIMIT');
  }
  entry.timestamps.push(now);
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) {
      prune(v, now);
      if (v.timestamps.length === 0) buckets.delete(k);
    }
  }
}
