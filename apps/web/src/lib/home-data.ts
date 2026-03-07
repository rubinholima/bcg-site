import type { Group } from "@/types/group";
import type { Tenant } from "@/types/tenant";
import { buildBackendUrl, getServerBackendBaseUrl } from "@/lib/apiProxy";

/** Dados do grupo. No servidor: direto no backend (nunca Nginx). No cliente: /api/public/group. */
export async function fetchGroup(): Promise<Group | null> {
  try {
    const url =
      typeof window !== "undefined"
        ? "/api/public/group"
        : `${getServerBackendBaseUrl().replace(/\/$/, "")}/group`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as Group;
  } catch {
    return null;
  }
}

export async function fetchTenants(): Promise<Tenant[]> {
  try {
    const res = await fetch(buildBackendUrl("/tenants"), {
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

/** Verifica se o tipo de empresa é futebol/clube (exibe campos exclusivos: categorias, SofaScore). */
export function isFootballKind(kindName: string): boolean {
  const k = kindName.toLowerCase();
  return k.includes("futebol") || k.includes("clube") || k.includes("football");
}

export function partitionTenants(tenants: Tenant[]) {
  const clubs = tenants.filter((t) => isFootballKind(t.kind?.name ?? ""));
  const companies = tenants.filter((t) => !isFootballKind(t.kind?.name ?? ""));
  return { clubs, companies };
}
