"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { authFetch } from "@/lib/authFetch";
import { canAccessFutebolExecutiveDashboard } from "@/lib/futebol-executive-access";
import type { ExecutiveDashboardDto, TenantOption } from "@/lib/futebol-executive-types";
import { ExecutiveDashboardView } from "@/components/dashboard/futebol/executive/ExecutiveDashboardView";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";

export default function FutebolExecutivoPage() {
  const router = useRouter();
  const { role, modules, loading: authLoading, tenantIds } = useAuth();
  const { categories } = useFixtureCategories();

  const [data, setData] = useState<ExecutiveDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [category, setCategory] = useState("");
  const [periodDays, setPeriodDays] = useState(14);

  const canAccess = useMemo(
    () => canAccessFutebolExecutiveDashboard(role, modules),
    [role, modules],
  );

  useEffect(() => {
    if (authLoading) return;
    if (!canAccess) {
      router.replace("/dashboard/futebol");
    }
  }, [authLoading, canAccess, router]);

  useEffect(() => {
    let cancelled = false;
    authFetch("/api/tenants")
      .then(async (res) => {
        if (!res.ok) return [];
        const json = (await res.json()) as TenantOption[];
        return Array.isArray(json) ? json : [];
      })
      .then((list) => {
        if (cancelled) return;
        const filtered =
          tenantIds && tenantIds.length > 0
            ? list.filter((t) => tenantIds.includes(t.id))
            : list;
        setTenants(filtered);
        if (filtered.length === 1) setTenantId(filtered[0].id);
      })
      .catch(() => {
        if (!cancelled) setTenants([]);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantIds]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tenantId) params.set("tenantId", tenantId);
      if (category) params.set("category", category);
      params.set("periodDays", String(periodDays));
      const qs = params.toString();
      const { data: payload } = await api.get<ExecutiveDashboardDto>(
        `/futebol-executive/dashboard${qs ? `?${qs}` : ""}`,
      );
      setData(payload);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId, category, periodDays]);

  useEffect(() => {
    if (authLoading || !canAccess) return;
    void loadDashboard();
  }, [authLoading, canAccess, loadDashboard]);

  if (authLoading || !canAccess) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ExecutiveDashboardView
      data={data}
      loading={loading}
      tenants={tenants}
      categories={categories}
      tenantId={tenantId}
      category={category}
      periodDays={periodDays}
      onTenantChange={setTenantId}
      onCategoryChange={setCategory}
      onPeriodChange={setPeriodDays}
      onRefresh={() => void loadDashboard()}
    />
  );
}
