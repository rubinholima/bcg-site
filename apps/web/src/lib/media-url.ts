/**
 * Resolução de URLs de mídia (S3 → o que o browser carrega)
 *
 * - **`next dev`:** URLs do bucket (`*.amazonaws.com`) e paths `logos/*` / `media/*` viram
 *   **`/api/public/media-asset?key=...`** (mesma origem). Evita **ERR_BLOCKED_BY_ORB** do Chrome em `<img>`
 *   cross-origin. O Next repassa ao Nest `GET /public/media`.
 * - **Produção:** `NEXT_PUBLIC_MEDIA_ORIGIN` ou `www.bostoncitygroup.biz` + pathname (CloudFront).
 *
 * `NEXT_PUBLIC_MEDIA_RESOLUTION=cdn` no `.env.local` desliga o proxy em dev e força URL do CDN (útil se quiser
 * testar igual produção).
 */
const BASE = "https://www.bostoncitygroup.biz";

function useDevSameOriginMediaProxy(): boolean {
  if (typeof process === "undefined") return false;
  if (process.env.NODE_ENV !== "development") return false;
  return process.env.NEXT_PUBLIC_MEDIA_RESOLUTION?.trim().toLowerCase() !== "cdn";
}

function isAllowedPublicMediaKey(key: string): boolean {
  const k = key.trim().toLowerCase();
  return k.startsWith("logos/") || k.startsWith("media/");
}

/**
 * Extrai a key `logos/...` ou `media/...` a partir do URL salvo no cadastro
 * (S3, CDN, proxy dev `/api/public/media-asset?key=...`).
 */
export function mediaKeyFromStoredUrl(url: string | undefined | null): string | null {
  if (!url || typeof url !== "string") return null;
  const sanitized = unwrapLegacyProxyUrl(url.trim());
  if (!sanitized) return null;
  if (sanitized.includes("media-asset") && sanitized.includes("key=")) {
    try {
      const qIdx = sanitized.indexOf("?");
      const query = qIdx >= 0 ? sanitized.slice(qIdx) : "";
      const params = new URLSearchParams(query);
      const key = params.get("key");
      if (key) {
        const decoded = decodeURIComponent(key);
        const k = decoded.trim();
        if (isAllowedPublicMediaKey(k)) return k;
      }
    } catch {
      /* continua */
    }
  }
  return extractPublicMediaKey(sanitized);
}

/** Extrai key `logos/...` ou `media/...` para o proxy público (dev). */
function extractPublicMediaKey(sanitized: string): string | null {
  const t = sanitized.trim();
  if (!t) return null;
  if (/amazonaws\.com/i.test(t)) {
    const k = urlToMediaKey(t);
    if (k && isAllowedPublicMediaKey(k)) return k;
    /* path-style: s3.region.amazonaws.com/bucket/logos/... → extrai logos/... ou media/... */
    const logosIdx = k.indexOf("logos/");
    if (logosIdx >= 0) return k.slice(logosIdx);
    const mediaIdx = k.indexOf("media/");
    if (mediaIdx >= 0) return k.slice(mediaIdx);
    return null;
  }
  if (/^https?:\/\//i.test(t)) {
    try {
      const u = new URL(t);
      const host = u.hostname.toLowerCase();
      if (host === "www.bostoncitygroup.biz" || host === "bostoncitygroup.biz") {
        const k = u.pathname.replace(/^\/+/, "");
        return k && isAllowedPublicMediaKey(k) ? k : null;
      }
      /* CloudFront / NEXT_PUBLIC_MEDIA_ORIGIN: mesmo host do origin configurado → extrai key para proxy em dev (ORB). */
      const mo = mediaOrigin();
      if (mo.startsWith("http://") || mo.startsWith("https://")) {
        try {
          const oh = new URL(mo).hostname.toLowerCase();
          if (oh && host === oh) {
            const k = u.pathname.replace(/^\/+/, "");
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
  if (t.startsWith("/")) {
    const k = t.replace(/^\/+/, "");
    return k && isAllowedPublicMediaKey(k) ? k : null;
  }
  if (!t.includes("://")) {
    const k = t.replace(/^\/+/, "");
    if (isAllowedPublicMediaKey(k)) return k;
  }
  return null;
}

function mediaOrigin(): string {
  if (typeof process === "undefined") return BASE;
  const o = process.env.NEXT_PUBLIC_MEDIA_ORIGIN?.trim().replace(/\/$/, "") ?? "";
  return o || BASE;
}

/**
 * Unwraps legacy /api/media/proxy?url=... so we resolve to a clean absolute URL (BASE + path).
 * Returns the inner URL or the original string if not a proxy URL.
 */
function unwrapLegacyProxyUrl(input: string): string {
  const t = input.trim();
  if (!t.includes("/api/media/proxy") || !t.includes("url=")) return t;
  try {
    const queryStart = t.indexOf("?");
    if (queryStart === -1) return t;
    const query = t.slice(queryStart + 1);
    const params = new URLSearchParams(query);
    const inner = params.get("url");
    if (inner) return decodeURIComponent(inner.trim());
    const match = t.match(/[?&]url=([^&]+)/);
    if (match) return decodeURIComponent(match[1].trim());
  } catch {
    const idx = t.indexOf("url=");
    if (idx !== -1) {
      const rest = t.slice(idx + 4).replace(/^&.*$/, "").trim();
      try {
        return decodeURIComponent(rest);
      } catch {
        return rest;
      }
    }
  }
  return t;
}

function pathFrom(url: string): string {
  const t = url.trim();
  if (!t) return "";
  if (t.includes("amazonaws.com")) {
    try {
      const p = new URL(t).pathname;
      return p.startsWith("/") ? p : `/${p}`;
    } catch {
      const m = t.match(/amazonaws\.com(\/[^?#]*)/);
      return m ? m[1] : "";
    }
  }
  if (t.startsWith("http://") || t.startsWith("https://") || t.startsWith("//"))
    return "";
  return t.startsWith("/") ? t : `/${t}`;
}

export function getPublicImageUrl(url: string | undefined | null): string {
  if (!url || typeof url !== "string") return "";
  const sanitized = unwrapLegacyProxyUrl(url.trim());
  if (!sanitized) return "";

  const origin = mediaOrigin();

  if (useDevSameOriginMediaProxy()) {
    const mediaKey =
      mediaKeyFromStoredUrl(sanitized) ?? extractPublicMediaKey(sanitized);
    if (mediaKey) {
      return `/api/public/media-asset?key=${encodeURIComponent(mediaKey)}`;
    }
  }

  if (/amazonaws\.com/i.test(sanitized)) {
    const p = pathFrom(sanitized);
    if (p) return `${origin}${p}`;
  }

  // Outras URLs absolutas (CDN, Unsplash, etc.): manter
  if (/^https?:\/\//i.test(sanitized)) {
    try {
      return new URL(sanitized).href;
    } catch {
      /* continua */
    }
  }

  const path = pathFrom(sanitized);
  if (path) return `${origin}${path}`;

  const u = sanitized.startsWith("http://") || sanitized.startsWith("https://") ? sanitized : "";
  if (u) return u;
  return "";
}

/**
 * Para cards públicos (ex.: logos de jogos): prioriza key `logos/*`/`media/*` para não devolver
 * URL de localhost ou formato que `getPublicImageUrl` não trate — evita cair no fallback estático.
 */
export function resolvePublicMediaUrlForDisplay(url: string | undefined | null): string {
  if (!url || typeof url !== "string") return "";
  const t = url.trim();
  if (!t) return "";
  const k = mediaKeyFromStoredUrl(t);
  if (k) {
    if (useDevSameOriginMediaProxy()) {
      return `/api/public/media-asset?key=${encodeURIComponent(k)}`;
    }
    const origin = mediaOrigin();
    return `${origin.replace(/\/$/, "")}/${k}`;
  }
  return getPublicImageUrl(t);
}

/**
 * Último recurso: se `getPublicImageUrl` esvaziar mas houver key logos/* ou media/*, monta o proxy dev.
 */
export function resolveMediaUrlWithProxyFallback(raw: string | undefined | null): string {
  const base = getPublicImageUrl(raw);
  if (base) return base;
  if (!raw || typeof raw !== "string") return "";
  const t = unwrapLegacyProxyUrl(raw.trim());
  if (!t) return "";
  if (!useDevSameOriginMediaProxy()) return "";
  const k = urlToMediaKey(t);
  const kl = k.toLowerCase();
  if ((kl.startsWith("logos/") || kl.startsWith("media/")) && k) {
    return `/api/public/media-asset?key=${encodeURIComponent(k)}`;
  }
  return "";
}

export function isS3Url(url: string | undefined | null): boolean {
  if (!url || typeof url !== "string") return false;
  return url.trim().includes("amazonaws.com");
}

export function isSvgUrl(url?: string | null): boolean {
  if (!url) return false;
  const v = String(url).toLowerCase();
  return v.endsWith(".svg") || v.includes(".svg?");
}

/** Extrai a key S3 do URL da mídia (para PATCH displayName). */
export function urlToMediaKey(url: string | undefined | null): string {
  if (!url || typeof url !== "string") return "";
  const t = url.trim();
  if (!t) return "";
  try {
    const path = t.startsWith("http") ? new URL(t).pathname : t.startsWith("/") ? t : `/${t}`;
    return path.startsWith("/") ? path.slice(1) : path;
  } catch {
    return t.replace(/^\//, "");
  }
}
