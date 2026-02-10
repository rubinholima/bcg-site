export interface PublicTenantCarouselItem {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  city: string | null;
  country: string | null;
}

export async function fetchPublicTenants(
  type: "club" | "company",
  limit = 50
): Promise<PublicTenantCarouselItem[]> {
  const isClient = typeof window !== "undefined";
  const url = isClient
    ? `/api/public/tenants?type=${type}&limit=${limit}`
    : `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/public/tenants?type=${type}&limit=${limit}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
