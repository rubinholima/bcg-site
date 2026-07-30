"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { filterCategoriesForTenant, getCategoryLabel } from "@/lib/fixture-categories";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";
import { isFootballKind } from "@/lib/home-data";
import { api } from "@/lib/api";

type Tenant = { id: string; name: string; categories?: string[] | null; kind?: { name?: string } };

export function PhysioReportFilters({
  tenantId,
  category,
  from,
  to,
  onTenantChange,
  onCategoryChange,
  onFromChange,
  onToChange,
  onApply,
  loading,
  showApplyButton = true,
}: {
  tenantId: string;
  category: string;
  from: string;
  to: string;
  onTenantChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  onApply: () => void;
  loading?: boolean;
  showApplyButton?: boolean;
}) {
  const { categories: allCats } = useFixtureCategories();
  const [tenants, setTenants] = useState<Tenant[]>([]);

  useEffect(() => {
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => {
      setTenants((Array.isArray(data) ? data : []).filter((t) => isFootballKind(t.kind?.name ?? "")));
    });
  }, []);

  const selectedTenant = tenants.find((t) => t.id === tenantId);
  const categoriesForClub = filterCategoriesForTenant(allCats, selectedTenant?.categories);

  return (
    <div className="grid gap-3 rounded-lg border border-border/70 p-3 sm:grid-cols-2 lg:grid-cols-5">
      <div className="grid gap-1.5">
        <Label>Clube</Label>
        <NativeSelect value={tenantId} onChange={(e) => onTenantChange(e.target.value)}>
          <option value="">Todos</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-1.5">
        <Label>Categoria</Label>
        <NativeSelect value={category} onChange={(e) => onCategoryChange(e.target.value)} disabled={!tenantId}>
          <option value="">Todas</option>
          {categoriesForClub.map((c) => (
            <option key={c.value} value={c.value}>
              {getCategoryLabel(c.value, "pt", allCats)}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-1.5">
        <Label>De</Label>
        <Input type="date" className="text-foreground" value={from} onChange={(e) => onFromChange(e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label>Até</Label>
        <Input type="date" className="text-foreground" value={to} onChange={(e) => onToChange(e.target.value)} />
      </div>
      {showApplyButton ? (
        <div className="flex items-end">
          <Button type="button" className="min-h-[44px] w-full" disabled={loading} onClick={onApply}>
            Atualizar
          </Button>
        </div>
      ) : null}
    </div>
  );
}
