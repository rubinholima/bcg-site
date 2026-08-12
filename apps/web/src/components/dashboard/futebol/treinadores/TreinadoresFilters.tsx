"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useCategoriesForTenant } from "@/hooks/useFixtureCategories";

interface Tenant {
  id: string;
  name: string;
  slug?: string;
  categories?: string[] | null;
}

const BASE = "/dashboard/futebol/treinadores";

export function TreinadoresFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tenants, setTenants] = useState<Tenant[]>([]);

  const tenantId = searchParams.get("tenantId") ?? "";
  const category = searchParams.get("category") ?? "";
  const tab = searchParams.get("tab") ?? "informacoes";

  const selectedTenant = tenants.find((t) => t.id === tenantId);
  const { categories: categoriesForDropdown } = useCategoriesForTenant(selectedTenant?.categories);

  useEffect(() => {
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => {
      setTenants(Array.isArray(data) ? data : []);
    });
  }, []);

  const pushParams = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`${BASE}?${params.toString()}`);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-[200px] flex-1 space-y-2">
            <Label className="text-sm text-muted-foreground">Clube</Label>
            <Select value={tenantId} onValueChange={(v) => pushParams({ tenantId: v, category: null })}>
              <SelectTrigger className="text-foreground">
                <SelectValue placeholder="Selecione o clube…" />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[180px] flex-1 space-y-2">
            <Label className="text-sm text-muted-foreground">Categoria</Label>
            <Select
              value={category || "__all__"}
              onValueChange={(v) => pushParams({ category: v === "__all__" ? null : v })}
              disabled={!tenantId}
            >
              <SelectTrigger className="text-foreground">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {categoriesForDropdown.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.labelPT}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[180px] flex-1 space-y-2">
            <Label className="text-sm text-muted-foreground">Área</Label>
            <Select value={tab} onValueChange={(v) => pushParams({ tab: v })}>
              <SelectTrigger className="text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="informacoes">Informações</SelectItem>
                <SelectItem value="pos-jogo">Relatório pós-jogo</SelectItem>
                <SelectItem value="treinos">Planejamento de treinos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
