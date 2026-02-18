export interface PortfolioLocation {
  city?: string;
  state?: string;
  country?: string;
}

export interface PortfolioItem {
  id: string;
  type: "club" | "company";
  name: string;
  slug: string;
  shortDescription?: string | null;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: PortfolioLocation | null;
  address?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  segment?: string | null;
  subdomain?: string | null;
  isActive: boolean;
}

import { buildBackendUrl } from "@/lib/apiProxy";

export async function fetchPublicPortfolio(): Promise<PortfolioItem[]> {
  const isClient = typeof window !== "undefined";
  const url = isClient ? "/api/public/portfolio" : buildBackendUrl("/public/portfolio");
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Portfolio API error: ${res.status}`);
  const data = (await res.json()) as PortfolioItem[];
  return (Array.isArray(data) ? data : []).filter((item) => item.isActive === true);
}

export function getClubSiteUrl(item: PortfolioItem): string {
  const sub = item.subdomain ?? item.slug;
  return `https://${sub}.bostoncitygroup.biz`;
}

export function getCompanyWebsiteUrl(item: PortfolioItem): string | null {
  return item.websiteUrl ?? null;
}

export function formatLocation(loc: PortfolioLocation | null | undefined): string {
  if (!loc) return "";
  const parts = [loc.city, loc.state, loc.country].filter(Boolean);
  return parts.join(", ");
}

/** Retorna o telefone a exibir (contactPhone ou phone). */
export function formatPhone(item: PortfolioItem): string | null {
  return item.contactPhone ?? item.phone ?? null;
}
