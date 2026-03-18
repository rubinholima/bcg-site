"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";

interface Tenant {
  id: string;
  name: string;
  slug?: string;
}

export function PsicologosFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState(searchParams.get("tenantId") ?? "");
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  useEffect(() => {
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => {
      setTenants(Array.isArray(data) ? data : []);
    }).catch(() => setTenants([]));
  }, []);

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (tenantId) params.set("tenantId", tenantId);
    if (search.trim()) params.set("search", search.trim());
    router.push(`/dashboard/psicologia/psicologos?${params.toString()}`);
  };

  const clearFilters = () => {
    setTenantId("");
    setSearch("");
    router.push("/dashboard/psicologia/psicologos");
  };

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-[240px]">
        <label className="text-xs text-muted-foreground mb-1 block">Clube / Empresa</label>
        <Select
          value={tenantId || "all"}
          onValueChange={(v) => setTenantId(v === "all" ? "" : v)}
        >
          <SelectTrigger>
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
      <div className="min-w-[200px]">
        <label className="text-xs text-muted-foreground mb-1 block">Buscar por nome</label>
        <Input
          placeholder="Nome do psicólogo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applyFilters()}
        />
      </div>
      <Button variant="secondary" onClick={applyFilters}>
        Filtrar
      </Button>
      <Button variant="ghost" onClick={clearFilters}>
        Limpar
      </Button>
    </div>
  );
}
