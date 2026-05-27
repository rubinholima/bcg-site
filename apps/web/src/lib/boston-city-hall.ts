import { getPublicImageUrl } from "@/lib/media-url";

export const BCH_SLUG = "boston-city-hall";
export const BCH_PUBLIC_PATH = `/portfolio/${BCH_SLUG}`;
/** Logo estático no repo (fallback se tenant ainda não tiver logoUrl no S3). */
export const BCH_LOGO_STATIC = "/logos/boston-city-hall.png";

export function bchLogoSrc(tenantLogoUrl?: string | null): string {
  if (tenantLogoUrl?.trim()) {
    const resolved = getPublicImageUrl(tenantLogoUrl);
    if (resolved) return resolved;
  }
  return BCH_LOGO_STATIC;
}
