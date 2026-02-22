/** Prefixes usados apenas para detectar URLs do bucket S3 (não para montar URLs de saída). */
const S3_BUCKET_PREFIX = "https://bcg-platform-assets.s3.";
const S3_BUCKET_ALT = "https://bcg-platform-assets.s3.amazonaws.com";

/** Origem pública de mídia: CloudFront OAC serve o S3 por este domínio. Nunca retornar s3.amazonaws.com. */
const PUBLIC_MEDIA_ORIGIN =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_MEDIA_ORIGIN) ||
  "https://www.bostoncitygroup.biz";

const ORIGIN = () => PUBLIC_MEDIA_ORIGIN.replace(/\/$/, "");

export function isS3Url(url: string | undefined | null): boolean {
  if (!url || typeof url !== "string") return false;
  const t = url.trim();
  return (
    t.includes("amazonaws.com") ||
    t.startsWith(S3_BUCKET_PREFIX) ||
    t.startsWith(S3_BUCKET_ALT)
  );
}

/** True se for path relativo de mídia ou logo (ex: logos/tenants/..., media/custom/...). */
function isRelativeMediaOrLogoPath(path: string): boolean {
  const p = path.startsWith("/") ? path.slice(1) : path;
  return p.startsWith("logos/") || p.startsWith("media/");
}

/**
 * Retorna a URL pública para exibição de mídia.
 * - Qualquer URL que contenha amazonaws.com ou seja path de logos/media → https://www.bostoncitygroup.biz/[path].
 * - Nunca retorna URL direta do bucket S3.
 */
export function getPublicImageUrl(url: string | undefined | null): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  // URL absoluta do S3 (qualquer variante *.amazonaws.com) → converter para domínio oficial (nunca retornar S3)
  if (trimmed.includes("amazonaws.com")) {
    try {
      const parsed = new URL(trimmed);
      const pathname = parsed.pathname.startsWith("/") ? parsed.pathname : `/${parsed.pathname}`;
      const search = parsed.search || "";
      return `${ORIGIN()}${pathname}${search}`;
    } catch {
      // Fallback: extrair path após amazonaws.com (nunca retornar URL S3)
      const match = trimmed.match(/amazonaws\.com(\/[^?#]*)/);
      if (match) return `${ORIGIN()}${match[1]}`;
      return ""; // URL S3 inválida: não expor s3.amazonaws.com
    }
  }

  // Path relativo de mídia/logo (ex: logos/tenants/xyz/logo.png ou /media/custom/abc.png)
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://") && !trimmed.startsWith("//")) {
    const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    if (isRelativeMediaOrLogoPath(path)) {
      return `${ORIGIN()}${path}`;
    }
    // Em produção, qualquer path relativo usa o origin (ex: /uploads/...)
    const isProduction =
      typeof process !== "undefined" && process.env?.NODE_ENV === "production";
    if (isProduction) {
      return `${ORIGIN()}${path}`;
    }
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
