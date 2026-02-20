const S3_BUCKET_PREFIX = "https://bcg-platform-assets.s3.";
const S3_BUCKET_ALT = "https://bcg-platform-assets.s3.amazonaws.com";
/** Base para paths relativos (ex: media/hero/...). */
const S3_BASE = "https://bcg-platform-assets.s3.us-east-1.amazonaws.com";

export function isS3Url(url: string | undefined | null): boolean {
  if (!url || typeof url !== "string") return false;
  const t = url.trim();
  return t.startsWith(S3_BUCKET_PREFIX) || t.startsWith(S3_BUCKET_ALT);
}

function isAbsoluteUrl(s: string): boolean {
  return s.startsWith("http://") || s.startsWith("https://");
}

/**
 * Retorna URL pública de imagem: absoluta como está; relativa prefixada com base S3.
 * Nunca use buildBackendUrl/getApiBaseUrl para assets; use buildAssetUrl (ver assetUrl.ts).
 */
export function getPublicImageUrl(url: string | undefined | null): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (isAbsoluteUrl(trimmed)) return trimmed;
  const path = trimmed.replace(/^\/+/, "");
  return `${S3_BASE.replace(/\/$/, "")}/${path}`;
}

/** Retorna true se a URL é do nosso proxy (evita otimização que quebra). */
export function isProxyImageUrl(url: string): boolean {
  return typeof url === "string" && (url.startsWith("/api/media/proxy") || url.startsWith("/media/proxy"));
}

/** Retorna true se a URL aponta para SVG (next/image retorna 400 para SVG em produção). */
export function isSvgUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== "string") return false;
  return url.trim().toLowerCase().endsWith(".svg");
}
