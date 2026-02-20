/**
 * URLs de assets (imagens, logos, favicons).
 * Nunca use buildBackendUrl/getApiBaseUrl para assets; use buildAssetUrl.
 */

export function isAbsoluteUrl(s: string): boolean {
  if (!s || typeof s !== "string") return false;
  const t = s.trim();
  return t.startsWith("http://") || t.startsWith("https://");
}

/**
 * Monta URL de asset. Para paths relativos opcionalmente usa NEXT_PUBLIC_ASSET_BASE_URL.
 * Para URLs absolutas (http/https) retorna como está.
 */
export function buildAssetUrl(pathOrUrl: string | undefined | null): string {
  if (!pathOrUrl || typeof pathOrUrl !== "string") return "";
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return "";
  if (isAbsoluteUrl(trimmed)) return trimmed;
  const base = (process.env.NEXT_PUBLIC_ASSET_BASE_URL ?? "").replace(/\/$/, "");
  if (!base) return trimmed;
  const path = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
  return `${base}/${path}`;
}
