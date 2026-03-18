"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { Building2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import type { Tenant } from "@/types/tenant";
import { useState, useEffect } from "react";

interface EquipeFiltersProps {
  tenantId: string;
  search: string;
}

export function EquipeFilters({ tenantId, search }: EquipeFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tenants, setTenants] = useState<Tenant[]>([]);

  useEffect(() => {
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => setTenants(Array.isArray(data) ? data : [])).catch(() => setTenants([]));
  }, []);

  const setParam = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(key, value);
    else p.delete(key);
    router.push(`/dashboard/medico/equipe?${p.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="space-y-2 min-w-[200px]">
        <Label className="text-muted-foreground">Clube</Label>
        <Select value={tenantId || "all"} onValueChange={(v) => setParam("tenantId", v === "all" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {tenants.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                <span className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5" />
                  {t.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2 min-w-[200px] flex-1 max-w-xs">
        <Label className="text-muted-foreground">Buscar por nome</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Nome do profissional"
            value={search}
            onChange={(e) => setParam("search", e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
    </div>
  );
}
