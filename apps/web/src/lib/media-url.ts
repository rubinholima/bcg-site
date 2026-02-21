const S3_BUCKET_PREFIX = "https://bcg-platform-assets.s3.";
const S3_BUCKET_ALT = "https://bcg-platform-assets.s3.amazonaws.com";

export function isS3Url(url: string | undefined | null): boolean {
  if (!url || typeof url !== "string") return false;
  const t = url.trim();
  return t.startsWith(S3_BUCKET_PREFIX) || t.startsWith(S3_BUCKET_ALT);
}

/**
 * Converte URL de mídia do S3 para o proxy da aplicação, para que
 * Next/Image e carregamento de imagens funcionem sem CORS e sem
 * precisar adicionar o domínio S3 em remotePatterns.
 */
export function getPublicImageUrl(url: string | undefined | null): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (isS3Url(trimmed)) {
    return `/api/media/proxy?url=${encodeURIComponent(trimmed)}`;
  }
  return trimmed;
}

/** Retorna true se a URL é do nosso proxy (evita otimização que quebra). */
export function isProxyImageUrl(url: string): boolean {
  return typeof url === "string" && url.startsWith("/api/media/proxy");
}

export function isSvgUrl(url?: string | null): boolean {
  if (!url) return false;
  const value = String(url).toLowerCase();
  return value.endsWith(".svg") || value.includes(".svg?");
}
