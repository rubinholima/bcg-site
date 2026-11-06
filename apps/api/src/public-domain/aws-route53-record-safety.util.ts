/**
 * Garante que mutações Route53 do CUP360 não toquem registros de e-mail/DMARC/etc.
 */

const PROTECTED_TYPES = new Set(['MX', 'NS', 'SOA']);

/** Subdomínios/prefixos típicos de email — não sobrescrever. */
const MAIL_RELATED_NAME_PREFIXES = [
  'mail.',
  'smtp.',
  'imap.',
  'pop.',
  'webmail.',
  'autodiscover.',
  'msoid.',
  'selector',
  'selector1.',
  'selector2.',
  'dkim.',
  'google._domainkey',
  'k1._domainkey',
  'k2._domainkey',
  'default._domainkey',
  'amazonses.',
  '_amazonses.',
];

const MAIL_RELATED_TXT_SNIPPETS = [
  'v=spf1',
  'spf1 ',
  'dkim',
  'verification=',
  'globalsign-domain-verification',
  'google-site-verification',
  'facebook-domain-verification',
  'v=DMARC1',
  'google685f73df2',
];

export type Route53RecordLike = {
  Name: string;
  Type: string;
  ResourceRecords?: Array<{ Value?: string }>;
};

function stripDot(s: string): string {
  return s.replace(/\.$/, '').toLowerCase();
}

function recordBelongsToZone(name: string, zoneName: string): boolean {
  const n = stripDot(name);
  const z = stripDot(zoneName);
  return n === z || n.endsWith(`.${z}`);
}

/**
 * CUP360 pode criar/atualizar apenas estes tipos em nomes web.
 */
export function isCup360ManagedWebRecord(name: string, type: string, zoneName: string): boolean {
  const n = stripDot(name);
  const z = stripDot(zoneName);
  if (!recordBelongsToZone(name, zoneName)) return false;
  if (PROTECTED_TYPES.has(type)) return false;
  const relative = n === z ? '@' : n.slice(0, -(z.length + 1));

  for (const p of MAIL_RELATED_NAME_PREFIXES) {
    if (relative === p.replace(/\.$/, '') || relative.startsWith(p)) return false;
  }
  // Bloqueio explícito raiz MX; TXT raiz costuma ter SPF — checado abaixo
  if (type === 'TXT' && (relative === '@' || relative === '')) {
    return false;
  }
  return true;
}

export function isProtectedTxtContent(value: string): boolean {
  const v = value.toLowerCase();
  return MAIL_RELATED_TXT_SNIPPETS.some((s) => v.includes(s.toLowerCase()));
}

export function filterRecordsSafeForUpsert(
  zoneName: string,
  records: Route53RecordLike[],
): Route53RecordLike[] {
  return records.filter((r) => {
    const ok = isCup360ManagedWebRecord(r.Name, r.Type, zoneName);
    if (!ok) return false;
    if (r.Type === 'TXT' && r.ResourceRecords?.length) {
      const joined = r.ResourceRecords.map((x) => x.Value ?? '').join(' ');
      if (isProtectedTxtContent(joined)) return false;
    }
    return true;
  });
}
