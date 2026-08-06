"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { useCategoriesForTenant } from "@/hooks/useFixtureCategories";
import { getPlayerListDisplayName } from "@/lib/player-display-name";

interface Tenant {
  id: string;
  name: string;
  slug?: string;
  categories?: string[] | null;
}

export interface PlayerOption {
  id: string;
  name: string;
  category?: string | null;
  registrationProfile?: unknown;
}

interface MedicoFiltersProps {
  players: PlayerOption[];
  selectedPlayerId: string;
  onSelectPlayer: (id: string) => void;
}

export function MedicoFilters({
  players,
  selectedPlayerId,
  onSelectPlayer,
}: MedicoFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState(searchParams.get("tenantId") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  useEffect(() => {
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => {
      setTenants(Array.isArray(data) ? data : []);
    });
  }, []);

  useEffect(() => {
    setTenantId(searchParams.get("tenantId") ?? "");
    setCategory(searchParams.get("category") ?? "");
    setSearch(searchParams.get("search") ?? "");
  }, [searchParams]);

  const selectedTenant = tenants.find((t) => t.id === tenantId);
  const { categories: categoriesForDropdown, allCategories } = useCategoriesForTenant(
    selectedTenant?.categories,
  );

  const applyFilters = useCallback(
    (updates?: { tenantId?: string; category?: string; search?: string }) => {
      const t = updates?.tenantId !== undefined ? updates.tenantId : tenantId;
      const c = updates?.category !== undefined ? updates.category : category;
      const s = updates?.search !== undefined ? updates.search : search;
      const params = new URLSearchParams();
      if (t) params.set("tenantId", t);
      if (c) params.set("category", c);
      if (s.trim()) params.set("search", s.trim());
      router.push(`/dashboard/medico?${params.toString()}`);
    },
    [router, tenantId, category, search]
  );

  const clearFilters = useCallback(() => {
    setTenantId("");
    setCategory("");
    setSearch("");
    onSelectPlayer("");
    router.push("/dashboard/medico");
  }, [router, onSelectPlayer]);

  const categoryLabel = (cat: string | null | undefined) =>
    cat
      ? allCategories.find((c) => c.value === cat)?.labelPT ?? cat
      : "—";

  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          Filtros
        </h3>
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[200px]">
            <label className="text-xs text-muted-foreground mb-1 block">
              Clube
            </label>
            <Select
              value={tenantId || "all"}
              onValueChange={(v) => {
                const next = v === "all" ? "" : v;
                setTenantId(next);
                setCategory("");
                onSelectPlayer("");
                applyFilters({ tenantId: next, category: "", search });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todos os clubes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clubes</SelectItem>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[160px]">
            <label className="text-xs text-muted-foreground mb-1 block">
              Categoria
            </label>
            <Select
              value={category || "all"}
              onValueChange={(v) => {
                const next = v === "all" ? "" : v;
                setCategory(next);
                onSelectPlayer("");
                applyFilters({ category: next });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categoriesForDropdown.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.labelPT}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[220px]">
            <label className="text-xs text-muted-foreground mb-1 block">
              Atleta
            </label>
            <Select
              value={selectedPlayerId || "none"}
              onValueChange={(v) => onSelectPlayer(v === "none" ? "" : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um atleta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Selecione um atleta</SelectItem>
                {players.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {categoryLabel(p.category)} • {getPlayerListDisplayName(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={clearFilters}>
            Limpar filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
