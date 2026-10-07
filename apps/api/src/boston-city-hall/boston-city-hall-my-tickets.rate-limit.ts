const WINDOW_MS = 60_000;
const MAX_PER_IP = 8;
const MAX_PER_EMAIL = 4;

type Entry = { timestamps: number[] };

const ipBuckets = new Map<string, Entry>();
const emailBuckets = new Map<string, Entry>();

function prune(entry: Entry, now: number): void {
  entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);
}

function assertLimit(buckets: Map<string, Entry>, key: string, max: number): void {
  const now = Date.now();
  let entry = buckets.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    buckets.set(key, entry);
  }
  prune(entry, now);
  if (entry.timestamps.length >= max) {
    throw new Error('RATE_LIMIT');
  }
  entry.timestamps.push(now);
}

export function assertMyTicketsPasswordlessRateLimit(clientIp: string, emailNormalized: string): void {
  assertLimit(ipBuckets, clientIp.trim() || 'unknown', MAX_PER_IP);
  assertLimit(emailBuckets, emailNormalized, MAX_PER_EMAIL);
}
