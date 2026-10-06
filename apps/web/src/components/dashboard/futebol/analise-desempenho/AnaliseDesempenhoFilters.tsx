"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DashboardFilterBar, FilterBarField } from "@/components/dashboard/cup360/DashboardFilterBar";
import { NativeSelectField } from "@/components/ui/native-select";
import { api } from "@/lib/api";
import { useCategoriesForTenant } from "@/hooks/useFixtureCategories";

interface Tenant {
  id: string;
  name: string;
  categories?: string[] | null;
}

export const ANALISE_DESEMPENHO_BASE = "/dashboard/futebol/analise-desempenho";

export function AnaliseDesempenhoFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tenants, setTenants] = useState<Tenant[]>([]);

  const tenantId = searchParams.get("tenantId") ?? "";
  const category = searchParams.get("category") ?? "";

  useEffect(() => {
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => {
      setTenants(Array.isArray(data) ? data : []);
    });
  }, []);

  const selectedTenant = tenants.find((t) => t.id === tenantId);
  const { categories: categoriesForDropdown } = useCategoriesForTenant(selectedTenant?.categories);

  const push = useCallback(
    (updates: { tenantId?: string; category?: string }) => {
      const t = updates.tenantId !== undefined ? updates.tenantId : tenantId;
      const c = updates.category !== undefined ? updates.category : category;
      const params = new URLSearchParams();
      if (t) params.set("tenantId", t);
      if (c) params.set("category", c);
      const qs = params.toString();
      router.push(qs ? `${ANALISE_DESEMPENHO_BASE}?${qs}` : ANALISE_DESEMPENHO_BASE);
    },
    [router, tenantId, category],
  );

  return (
    <DashboardFilterBar>
      <FilterBarField label="Clube">
        <NativeSelectField
          value={tenantId}
          onChange={(e) => push({ tenantId: e.target.value, category: "" })}
          placeholder="Selecione o clube…"
          options={tenants.map((t) => ({ value: t.id, label: t.name }))}
        />
      </FilterBarField>
      <FilterBarField label="Categoria">
        <NativeSelectField
          value={category}
          onChange={(e) => push({ category: e.target.value })}
          placeholder="Todas"
          options={[
            { value: "", label: "Todas" },
            ...categoriesForDropdown.map((c) => ({ value: c.value, label: c.labelPT })),
          ]}
          disabled={!tenantId}
        />
      </FilterBarField>
    </DashboardFilterBar>
  );
}

export function useAnaliseDesempenhoQuery() {
  const searchParams = useSearchParams();
  return {
    tenantId: searchParams.get("tenantId") ?? "",
    category: searchParams.get("category") ?? "",
    qs: searchParams.toString(),
  };
}
