const DEFAULT_PLATFORM_HOSTS = new Set([
  'www.bostoncitygroup.biz',
  'bostoncitygroup.biz',
  'origin.bostoncitygroup.biz',
  'localhost',
  '127.0.0.1',
]);

function parseTrustedHostList(): Set<string> {
  const raw = process.env.CUP360_TRUSTED_PUBLIC_HOSTS?.trim();
  const s = new Set(DEFAULT_PLATFORM_HOSTS);
  const canonical =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '').split('/')[0]?.toLowerCase() ??
    process.env.CUP360_CANONICAL_HOST?.trim().toLowerCase();
  if (canonical) s.add(canonical);
  if (!raw) return s;
  for (const p of raw.split(/[\s,]+/)) {
    const h = p.trim().toLowerCase().replace(/\.$/, '');
    if (h) s.add(h);
  }
  return s;
}

let cached: Set<string> | null = null;

function platformHosts(): Set<string> {
  if (!cached) cached = parseTrustedHostList();
  return cached;
}

/** Hosts da plataforma BCG — não são domínio público de tenant. */
export function isCup360PlatformHostname(hostRaw: string): boolean {
  if (!hostRaw?.trim()) return false;
  const hostOnly = hostRaw.replace(/^https?:\/\//, '').split('/')[0] ?? '';
  const h = hostOnly.split(':')[0]?.toLowerCase() ?? '';
  return platformHosts().has(h);
}
