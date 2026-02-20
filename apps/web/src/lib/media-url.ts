const S3_BUCKET_PREFIX = "https://bcg-platform-assets.s3.";
const S3_BUCKET_ALT = "https://bcg-platform-assets.s3.amazonaws.com";

export function isS3Url(url: string | undefined | null): boolean {
  if (!url || typeof url !== "string") return false;
  const t = url.trim();
  return t.startsWith(S3_BUCKET_PREFIX) || t.startsWith(S3_BUCKET_ALT);
}

/**
 * Converte URL de mídia do S3 para o proxy da aplicação.
 * Usa /media/proxy (Next) e não /api/* para que Nginx envie ao Next e não ao backend.
 * Nunca use buildBackendUrl/getApiBaseUrl para assets; use buildAssetUrl (ver assetUrl.ts).
 */
export function getPublicImageUrl(url: string | undefined | null): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (isS3Url(trimmed)) {
    return `/media/proxy?url=${encodeURIComponent(trimmed)}`;
  }
  return trimmed;
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
