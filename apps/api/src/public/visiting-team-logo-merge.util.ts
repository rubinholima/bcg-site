/**
 * Mesma lógica do web (visiting-teams-merge + media-url) para enriquecer logos
 * de adversários na API pública — sem cookie /api/media.
 */

export interface VisitingTeamRow {
  id: string;
  name: string;
  logoUrl?: string | null;
}

export interface AdvMediaItem {
  key: string;
  url: string;
  displayName?: string | null;
}

function fileBasename(key: string): string {
  return (key.split('/').pop() ?? '').replace(/\.[a-z0-9]+$/i, '');
}

export function normalizeTeamNameKeyForMerge(s: string): string {
  let t = s
    .trim()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('pt-BR');
  t = t.replace(/\b(de|da|do|das|dos)\b/g, '');
  return t.replace(/[^a-z0-9]/g, '');
}

function isAllowedPublicMediaKey(key: string): boolean {
  const k = key.trim().toLowerCase();
  return k.startsWith('logos/') || k.startsWith('media/');
}

/** Extrai key logos/... ou media/... (equivalente ao web mediaKeyFromStoredUrl). */
export function mediaKeyFromStoredUrl(url: string | undefined | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const t = url.trim();
  if (!t) return null;
  if (t.includes('media-asset') && t.includes('key=')) {
    try {
      const qIdx = t.indexOf('?');
      const query = qIdx >= 0 ? t.slice(qIdx) : '';
      const params = new URLSearchParams(query.startsWith('?') ? query : `?${query}`);
      const key = params.get('key');
      if (key) {
        const decoded = decodeURIComponent(key).trim();
        if (isAllowedPublicMediaKey(decoded)) return decoded;
      }
    } catch {
      /* continua */
    }
  }
  if (/amazonaws\.com/i.test(t)) {
    const lower = t.toLowerCase();
    const logosIdx = lower.indexOf('logos/');
    if (logosIdx >= 0) return t.slice(logosIdx).split(/[?#]/)[0] ?? null;
    const mediaIdx = lower.indexOf('media/');
    if (mediaIdx >= 0) return t.slice(mediaIdx).split(/[?#]/)[0] ?? null;
  }
  if (/^https?:\/\//i.test(t)) {
    try {
      const u = new URL(t);
      const host = u.hostname.toLowerCase();
      if (host === 'www.bostoncitygroup.biz' || host === 'bostoncitygroup.biz') {
        const k = u.pathname.replace(/^\/+/, '');
        return k && isAllowedPublicMediaKey(k) ? k : null;
      }
    } catch {
      /* continua */
    }
  }
  if (t.startsWith('/')) {
    const k = t.replace(/^\/+/, '');
    return k && isAllowedPublicMediaKey(k) ? k : null;
  }
  if (!t.includes('://')) {
    const k = t.replace(/^\/+/, '');
    if (isAllowedPublicMediaKey(k)) return k;
  }
  return null;
}

function nameFromClubesAdvMedia(m: AdvMediaItem): string | null {
  const dn = m.displayName?.trim();
  if (dn) return dn;
  const base = fileBasename(m.key);
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(base)) {
    return `Logo ${base.slice(0, 8)}…`;
  }
  const fromFile = base.replace(/-/g, ' ').trim();
  return fromFile || null;
}

function resolveMediaForDbTeam(
  logoUrl: string | null | undefined,
  advLogos: AdvMediaItem[],
  keyToMedia: Map<string, AdvMediaItem>,
  validKeys: Set<string>,
): AdvMediaItem | null {
  if (!logoUrl?.trim()) return null;
  const logoKey = mediaKeyFromStoredUrl(logoUrl);
  if (!logoKey) return null;
  if (validKeys.has(logoKey)) return keyToMedia.get(logoKey) ?? null;
  const baseFile = logoKey.split('/').pop();
  if (!baseFile) return null;
  const match = advLogos.find((m) => (m.key.split('/').pop() ?? '') === baseFile);
  return match ?? null;
}

/**
 * Retorna mapa nome-normalizado → URL pública do logo (cadastro + S3 clubes-adv/external).
 */
export function buildVisitingTeamLogoUrlByMergeKey(
  dbTeams: VisitingTeamRow[],
  advItems: AdvMediaItem[],
): Map<string, string> {
  const advLogos = advItems.filter(
    (i) =>
      i.key.startsWith('logos/clubes-adv/') ||
      i.key.startsWith('logos/external/'),
  );
  const validKeys = new Set(advLogos.map((m) => m.key));
  const keyToMedia = new Map(advLogos.map((m) => [m.key, m] as const));
  const merged = new Map<string, { name: string; logoUrl: string }>();

  const dbSorted = [...dbTeams].sort((a, b) =>
    a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }),
  );
  for (const t of dbSorted) {
    const nk = normalizeTeamNameKeyForMerge(t.name);
    if (!nk) continue;
    const media = resolveMediaForDbTeam(t.logoUrl, advLogos, keyToMedia, validKeys);
    if (!media) continue;
    if (merged.has(nk)) continue;
    merged.set(nk, { name: t.name.trim(), logoUrl: media.url });
  }

  const advSorted = [...advLogos].sort((a, b) => a.key.localeCompare(b.key));
  for (const m of advSorted) {
    const name = nameFromClubesAdvMedia(m);
    if (!name) continue;
    const nk = normalizeTeamNameKeyForMerge(name);
    if (!nk) continue;
    if (merged.has(nk)) continue;
    merged.set(nk, { name, logoUrl: m.url });
  }

  const out = new Map<string, string>();
  for (const [nk, v] of merged) {
    out.set(nk, v.logoUrl);
  }
  return out;
}
