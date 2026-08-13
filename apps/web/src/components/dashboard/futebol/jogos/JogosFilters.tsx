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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useCategoriesForTenant } from "@/hooks/useFixtureCategories";
import { JOGOS_STATUS_OPTIONS, type JogosStatusFilter } from "@/lib/futebol-jogos.types";

interface Tenant {
  id: string;
  name: string;
  categories?: string[] | null;
}

const BASE = "/dashboard/futebol/jogos";

export function JogosFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tenants, setTenants] = useState<Tenant[]>([]);

  const tenantId = searchParams.get("tenantId") ?? "";
  const category = searchParams.get("category") ?? "";
  const season = searchParams.get("season") ?? String(new Date().getFullYear());
  const status = (searchParams.get("status") ?? "all") as JogosStatusFilter;

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
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
          <div className="space-y-2">
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
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Temporada</Label>
            <Input
              type="number"
              min={2000}
              max={2100}
              className="text-foreground"
              value={season}
              onChange={(e) => pushParams({ season: e.target.value || null })}
              disabled={!tenantId}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Situação</Label>
            <Select
              value={status}
              onValueChange={(v) => pushParams({ status: v === "all" ? null : v })}
              disabled={!tenantId}
            >
              <SelectTrigger className="text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JOGOS_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
