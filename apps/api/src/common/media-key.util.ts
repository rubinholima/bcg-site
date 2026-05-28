/** Key S3 pública (logos/* ou media/*). */
export function isAllowedPublicMediaKey(key: string): boolean {
  const k = key.trim().toLowerCase();
  return k.startsWith('logos/') || k.startsWith('media/');
}

/** Extrai key logos/... ou media/... a partir de URL salva no banco ou path relativo. */
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
      const mo = (process.env.PUBLIC_MEDIA_ORIGIN ?? '').replace(/\/$/, '');
      if (mo.startsWith('http')) {
        try {
          const oh = new URL(mo).hostname.toLowerCase();
          if (oh && host === oh) {
            const k = u.pathname.replace(/^\/+/, '');
            return k && isAllowedPublicMediaKey(k) ? k : null;
          }
        } catch {
          /* continua */
        }
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

/** Percorre JSON e coleta keys de mídia referenciadas. */
export function collectMediaKeysFromJson(value: unknown, out: Set<string>): void {
  if (value == null) return;
  if (typeof value === 'string') {
    const k = mediaKeyFromStoredUrl(value);
    if (k) out.add(k);
    const embedded = value.match(/(?:logos|media)\/[a-zA-Z0-9_\-./]+/g);
    if (embedded) {
      for (const part of embedded) {
        const clean = part.split(/[?#"'\s]/)[0] ?? part;
        if (isAllowedPublicMediaKey(clean)) out.add(clean);
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectMediaKeysFromJson(item, out);
    return;
  }
  if (typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) {
      collectMediaKeysFromJson(v, out);
    }
  }
}
