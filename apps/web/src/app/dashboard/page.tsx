import { cookies } from "next/headers";
import { Tenant } from "@/types/tenant";
import type { Group } from "@/types/group";
import { buildBackendUrl, getAppBaseUrl } from "@/lib/apiProxy";
import { formatRoleSlug } from "@/lib/platform-roles";
import { MasterDashboardGate } from "@/components/dashboard/MasterDashboardGate";
import { MasterDashboardHeader } from "@/components/dashboard/MasterDashboardHeader";
import { MasterOperationsConsole } from "@/components/dashboard/master/MasterOperationsConsole";
import { MasterPlatformAnalytics } from "@/components/dashboard/master/MasterPlatformAnalytics";
import { MasterAnnouncementsPanel } from "@/components/dashboard/master/MasterAnnouncementsPanel";
import { MasterSecondarySection } from "@/components/dashboard/master/MasterSecondarySection";
import { formatDateTimeDayMonYear } from "@/lib/format-date";

interface LastActivity {
  name: string;
  createdAt: string;
}

interface DashboardStats {
  tenantsCount: number;
  tenantKindsCount: number;
  usersCount: number;
  workmailOrgsCount?: number;
  workmailAccountsCount?: number;
  pagesCount?: number;
  lastTenant?: LastActivity | null;
  lastUser?: LastActivity | null;
}

async function getGroup(): Promise<Group | null> {
  try {
    const base = getAppBaseUrl();
    const res = await fetch(`${base}/api/public/group`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as Group;
  } catch {
    return null;
  }
}

async function getStats(token: string | undefined): Promise<DashboardStats | null> {
  if (!token) return null;
  try {
    const res = await fetch(buildBackendUrl("/dashboard/stats"), {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as DashboardStats;
  } catch {
    return null;
  }
}

async function getTenants(token: string | undefined): Promise<Tenant[]> {
  if (!token) return [];
  try {
    const res = await fetch(buildBackendUrl("/tenants"), {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return (await res.json()) as Tenant[];
  } catch {
    return [];
  }
}

async function getUsersByRole(token: string | undefined): Promise<Array<{ name: string; count: number }>> {
  if (!token) return [];
  try {
    const res = await fetch(buildBackendUrl("/users"), {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const users = (await res.json()) as Array<{ role?: string | null }>;
    if (!Array.isArray(users)) return [];
    const counts = new Map<string, number>();
    for (const user of users) {
      const role = user.role?.trim() || "user";
      counts.set(role, (counts.get(role) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([role, count]) => ({ name: formatRoleSlug(role), count }))
      .sort((a, b) => b.count - a.count);
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token =
    cookieStore.get("access_token")?.value ?? cookieStore.get("id_token")?.value;

  const [group, stats, tenants, usersByRole] = await Promise.all([
    getGroup(),
    getStats(token ?? undefined),
    getTenants(token ?? undefined),
    getUsersByRole(token ?? undefined),
  ]);

  const countsByKind = tenants.reduce<Record<string, number>>((acc, t) => {
    const name = t.kind?.name ?? "Sem tipo";
    acc[name] = (acc[name] ?? 0) + 1;
    return acc;
  }, {});
  const kindEntries = Object.entries(countsByKind).sort((a, b) => b[1] - a[1]);

  const groupName = group?.name ?? "Boston City Group";
  const updatedAtLabel = formatDateTimeDayMonYear(new Date().toISOString());

  return (
    <MasterDashboardGate>
      <div className="w-full min-w-0 max-w-full space-y-6">
        <MasterDashboardHeader groupName={groupName} />

        <MasterOperationsConsole />

        <MasterAnnouncementsPanel />

        <MasterPlatformAnalytics usersByRole={usersByRole} />

        <MasterSecondarySection stats={stats} tenants={tenants} kindEntries={kindEntries} />

        <p className="text-right text-xs text-muted-foreground">
          Dados administrativos carregados em {updatedAtLabel}
        </p>
      </div>
    </MasterDashboardGate>
  );
}
