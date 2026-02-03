import type { Group } from "@/types/group";
import type { Tenant } from "@/types/tenant";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function fetchGroup(): Promise<Group | null> {
  try {
    const res = await fetch(`${apiUrl}/group`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as Group;
  } catch {
    return null;
  }
}

export async function fetchTenants(): Promise<Tenant[]> {
  try {
    const res = await fetch(`${apiUrl}/tenants`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return [];
    return (await res.json()) as Tenant[];
  } catch {
    return [];
  }
}

export function getTenantSiteUrl(slug: string): string {
  return `https://${slug}.bostoncitygroup.biz`;
}

function isFootballKind(kindName: string): boolean {
  const k = kindName.toLowerCase();
  return k.includes("futebol") || k.includes("clube") || k.includes("football");
}

export function partitionTenants(tenants: Tenant[]) {
  const clubs = tenants.filter((t) => isFootballKind(t.kind?.name ?? ""));
  const companies = tenants.filter((t) => !isFootballKind(t.kind?.name ?? ""));
  return { clubs, companies };
}
