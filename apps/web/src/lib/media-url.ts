/** CloudFront origin — S3 is only reachable via this domain (OAC). */
const BASE = "https://www.bostoncitygroup.biz";

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
    // fallback: split on url= and decode
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

  const path = pathFrom(sanitized);
  if (path) return `${BASE}${path}`;

  const u = sanitized.startsWith("http://") || sanitized.startsWith("https://")
    ? sanitized
    : "";
  if (u && u.includes("amazonaws.com")) {
    const p = pathFrom(u);
    if (p) return `${BASE}${p}`;
  }
  if (u) return u;
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
