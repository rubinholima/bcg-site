const TTL_MS = 120_000; // 2 min

type Entry = {
  tokens: { id_token?: string; access_token?: string; refresh_token?: string };
  expires: number;
};

const store = new Map<string, Entry>();

function prune() {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (v.expires < now) store.delete(k);
  }
}

export function setPendingTokens(
  key: string,
  tokens: { id_token?: string; access_token?: string; refresh_token?: string }
) {
  prune();
  store.set(key, { tokens, expires: Date.now() + TTL_MS });
}

export function getPendingTokens(
  key: string
): { id_token?: string; access_token?: string; refresh_token?: string } | null {
  const entry = store.get(key);
  if (!entry || entry.expires < Date.now()) return null;
  return entry.tokens;
}

export function deletePendingTokens(key: string) {
  store.delete(key);
}
