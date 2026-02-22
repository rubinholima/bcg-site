const ORIGIN =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_MEDIA_ORIGIN) ||
  "https://www.bostoncitygroup.biz";

export function isS3Url(url: string | undefined | null): boolean {
  if (!url || typeof url !== "string") return false;
  return url.trim().includes("amazonaws.com");
}

function getPath(url: string): string {
  const t = url.trim();
  if (!t) return "";
  if (t.includes("amazonaws.com")) {
    try {
      const path = new URL(t).pathname;
      return path.startsWith("/") ? path : `/${path}`;
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
  const trimmed = url.trim();
  if (!trimmed) return "";
  const path = getPath(trimmed);
  if (!path) {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://"))
      return trimmed;
    return "";
  }
  const base = ORIGIN.replace(/\/$/, "");
  return `${base}${path}`;
}

export function isSvgUrl(url?: string | null): boolean {
  if (!url) return false;
  const v = String(url).toLowerCase();
  return v.endsWith(".svg") || v.includes(".svg?");
}
