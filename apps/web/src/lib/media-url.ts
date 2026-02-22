const BASE =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_MEDIA_ORIGIN) ||
  "https://www.bostoncitygroup.biz";
const ORIGIN = BASE.replace(/\/$/, "");

export function isS3Url(url: string | undefined | null): boolean {
  if (!url || typeof url !== "string") return false;
  return url.trim().includes("amazonaws.com");
}

function toPath(s: string): string {
  const t = s.trim();
  if (!t) return "";
  return t.startsWith("/") ? t : `/${t}`;
}

/**
 * Retorna https://www.bostoncitygroup.biz/${path}.
 * O path do banco já inclui as subpastas (ex: media/custom/arquivo.jpg, logos/tenants/logo.png).
 * Não adicionamos prefixos: se já começa com media ou logos, usamos como está.
 */
export function getPublicImageUrl(url: string | undefined | null): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  if (trimmed.includes("amazonaws.com")) {
    try {
      const u = new URL(trimmed);
      const path = toPath(u.pathname);
      return path ? `${ORIGIN}${path}` : "";
    } catch {
      const m = trimmed.match(/amazonaws\.com(\/[^?#]*)/);
      return m ? `${ORIGIN}${m[1]}` : "";
    }
  }

  if (
    !trimmed.startsWith("http://") &&
    !trimmed.startsWith("https://") &&
    !trimmed.startsWith("//")
  ) {
    const path = toPath(trimmed);
    if (path) return `${ORIGIN}${path}`;
  }

  return trimmed;
}

export function isSvgUrl(url?: string | null): boolean {
  if (!url) return false;
  const v = String(url).toLowerCase();
  return v.endsWith(".svg") || v.includes(".svg?");
}
