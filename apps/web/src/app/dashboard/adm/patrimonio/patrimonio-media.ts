import {
  getPublicImageUrl,
  resolveMediaUrlWithProxyFallback,
  resolvePublicMediaUrlForDisplay,
} from "@/lib/media-url";

/** Padrão do diário (Marketing / media-url): exibição de miniaturas no dashboard. */
export function patrimonioMediaThumbSrc(raw: string | undefined | null): string {
  if (!raw || typeof raw !== "string") return "";
  const t = raw.trim();
  if (!t) return "";
  return (
    resolvePublicMediaUrlForDisplay(t) ||
    resolveMediaUrlWithProxyFallback(t) ||
    getPublicImageUrl(t) ||
    t
  );
}
