const BASE = "https://www.bostoncitygroup.biz";

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
  const path = pathFrom(url.trim());
  if (path) return `${BASE}${path}`;
  const u = url.trim();
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
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
