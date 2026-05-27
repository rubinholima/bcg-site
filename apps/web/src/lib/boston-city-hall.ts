import { getPublicImageUrl } from "@/lib/media-url";

export const BCH_SLUG = "boston-city-hall";
export const BCH_PUBLIC_PATH = `/portfolio/${BCH_SLUG}`;
/** Logo estática no Next public (raiz — evita conflito com /logos/* do CDN/S3 em produção). */
export const BCH_LOGO_STATIC = "/boston-city-hall-logo.png";

export function bchLogoSrc(tenantLogoUrl?: string | null): string {
  if (tenantLogoUrl?.trim()) {
    const resolved = getPublicImageUrl(tenantLogoUrl);
    if (resolved) return resolved;
  }
  return BCH_LOGO_STATIC;
}
