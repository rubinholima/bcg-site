/** Prefixes usados apenas para detectar URLs do bucket S3 (não para montar URLs de saída). */
const S3_BUCKET_PREFIX = "https://bcg-platform-assets.s3.";
const S3_BUCKET_ALT = "https://bcg-platform-assets.s3.amazonaws.com";

/** Origem pública de mídia: CloudFront OAC serve o S3 por este domínio. */
const PUBLIC_MEDIA_ORIGIN =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_MEDIA_ORIGIN) ||
  "https://www.bostoncitygroup.biz";

export function isS3Url(url: string | undefined | null): boolean {
  if (!url || typeof url !== "string") return false;
  const t = url.trim();
  return t.startsWith(S3_BUCKET_PREFIX) || t.startsWith(S3_BUCKET_ALT);
}

/**
 * Retorna a URL pública para exibição de mídia.
 * - URLs do S3: convertidas para o domínio oficial (CloudFront OAC), sem expor s3.amazonaws.com.
 * - Em produção, paths relativos recebem o mesmo prefixo.
 * - Demais URLs absolutas são retornadas como estão.
 */
export function getPublicImageUrl(url: string | undefined | null): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  if (isS3Url(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      const pathname = parsed.pathname.startsWith("/") ? parsed.pathname : `/${parsed.pathname}`;
      const search = parsed.search || "";
      return `${PUBLIC_MEDIA_ORIGIN.replace(/\/$/, "")}${pathname}${search}`;
    } catch {
      return trimmed;
    }
  }

  const isProduction =
    typeof process !== "undefined" && process.env?.NODE_ENV === "production";
  if (isProduction && trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return `${PUBLIC_MEDIA_ORIGIN.replace(/\/$/, "")}${trimmed}`;
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
