/**
 * URLs de mídia: sempre https://www.bostoncitygroup.biz/${path}.
 * Path deve incluir o prefixo da pasta (ex: media/foto.jpg, logos/clube.png).
 * Nenhuma URL de saída deve conter api/media/proxy.
 */
const PUBLIC_MEDIA_ORIGIN =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_MEDIA_ORIGIN) ||
  "https://www.bostoncitygroup.biz";

const ORIGIN = PUBLIC_MEDIA_ORIGIN.replace(/\/$/, "");

export function isS3Url(url: string | undefined | null): boolean {
  if (!url || typeof url !== "string") return false;
  const t = url.trim();
  return t.includes("amazonaws.com");
}

function normalizePath(input: string): string {
  const p = input.startsWith("/") ? input.slice(1) : input;
  return p ? `/${p}` : "";
}

/**
 * Retorna a URL pública da imagem: sempre https://www.bostoncitygroup.biz/${path}.
 * O path deve ser do tipo media/... ou logos/... (ex: media/foto.jpg, logos/tenants/id/logo.png).
 * - Se a entrada for URL do S3 (amazonaws.com), extrai o path e monta a URL no domínio.
 * - Se for path relativo (media/ ou logos/), normaliza e monta a URL no domínio.
 * - URLs absolutas de outros domínios são retornadas como estão.
 */
export function getPublicImageUrl(url: string | undefined | null): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  if (trimmed.includes("amazonaws.com")) {
    try {
      const parsed = new URL(trimmed);
      const path = normalizePath(parsed.pathname) || parsed.pathname;
      const search = parsed.search || "";
      return `${ORIGIN}${path}${search}`;
    } catch {
      const match = trimmed.match(/amazonaws\.com(\/[^?#]*)/);
      if (match) return `${ORIGIN}${match[1]}`;
      return "";
    }
  }

  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://") && !trimmed.startsWith("//")) {
    const path = normalizePath(trimmed);
    if (path && (path.startsWith("/media/") || path.startsWith("/logos/"))) {
      return `${ORIGIN}${path}`;
    }
    const isProduction =
      typeof process !== "undefined" && process.env?.NODE_ENV === "production";
    if (isProduction && path) return `${ORIGIN}${path}`;
  }

  return trimmed;
}

export function isSvgUrl(url?: string | null): boolean {
  if (!url) return false;
  const value = String(url).toLowerCase();
  return value.endsWith(".svg") || value.includes(".svg?");
}
