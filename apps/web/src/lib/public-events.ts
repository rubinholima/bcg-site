import { getServerBackendBaseUrl } from "@/lib/apiProxy";

export interface PublicEventItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  organizer: string;
  tenantId: string | null;
  tenantName?: string | null;
}

export async function fetchPublicEvents(tenantId?: string): Promise<PublicEventItem[]> {
  const isClient = typeof window !== "undefined";
  const base = isClient ? "/api" : getServerBackendBaseUrl().replace(/\/$/, "");
  const path = "/public/events";
  const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
  const url = `${base}${path}${qs}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as PublicEventItem[];
  return Array.isArray(data) ? data : [];
}
