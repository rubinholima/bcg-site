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
import { DashboardDeptSearch } from "@/components/dashboard/DashboardDeptHeader";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { HEALTH_INTERN_AREAS } from "@/lib/health-intern-areas";

type Tenant = { id: string; name: string };

export function EstagiariosFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState(searchParams.get("tenantId") ?? "");
  const [area, setArea] = useState(searchParams.get("area") ?? "");
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  useEffect(() => {
    api
      .get<Tenant[]>("/tenants?clubsOnly=1")
      .then(({ data }) => setTenants(Array.isArray(data) ? data : []))
      .catch(() => setTenants([]));
  }, []);

  const apply = () => {
    const params = new URLSearchParams();
    if (tenantId) params.set("tenantId", tenantId);
    if (area) params.set("area", area);
    if (search.trim()) params.set("search", search.trim());
    router.push(`/dashboard/saude/estagiarios?${params.toString()}`);
  };

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="w-full sm:w-[min(220px,100%)]">
        <label className="mb-1.5 block text-xs text-muted-foreground">Clube</label>
        <Select value={tenantId || "all"} onValueChange={(v) => setTenantId(v === "all" ? "" : v)}>
          <SelectTrigger className="min-h-[44px] text-foreground">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {tenants.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-full sm:w-[min(200px,100%)]">
        <label className="mb-1.5 block text-xs text-muted-foreground">Área</label>
        <Select value={area || "all"} onValueChange={(v) => setArea(v === "all" ? "" : v)}>
          <SelectTrigger className="min-h-[44px] text-foreground">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {HEALTH_INTERN_AREAS.map((a) => (
              <SelectItem key={a.value} value={a.value}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DashboardDeptSearch
        value={search}
        onChange={setSearch}
        placeholder="Buscar por nome…"
        className="min-w-0 flex-1"
      />
      <Button type="button" variant="secondary" className="min-h-[44px]" onClick={apply}>
        Filtrar
      </Button>
    </div>
  );
}
