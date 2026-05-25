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
import { FIXTURE_CATEGORIES } from "@/lib/fixture-categories";
import { FOOTBALL_POSITIONS } from "@/lib/football-positions";

interface Tenant {
  id: string;
  name: string;
  slug?: string;
  categories?: string[] | null;
}

export function JogadoresFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState(searchParams.get("tenantId") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [position, setPosition] = useState(searchParams.get("position") ?? "");
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  useEffect(() => {
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => {
      setTenants(Array.isArray(data) ? data : []);
    });
  }, []);

  const selectedTenant = tenants.find((t) => t.id === tenantId);
  const categoriesForDropdown = selectedTenant?.categories?.length
    ? FIXTURE_CATEGORIES.filter((c) =>
        selectedTenant.categories!.includes(c.value)
      )
    : FIXTURE_CATEGORIES;

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (tenantId) params.set("tenantId", tenantId);
    if (category) params.set("category", category);
    if (position) params.set("position", position);
    if (search.trim()) params.set("search", search.trim());
    router.push(`/dashboard/cadastros/jogadores?${params.toString()}`);
  };

  const clearFilters = () => {
    setTenantId("");
    setCategory("");
    setPosition("");
    setSearch("");
    router.push("/dashboard/cadastros/jogadores");
  };

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-[240px]">
        <label className="text-xs text-muted-foreground mb-1 block">Clube</label>
        <Select
          value={tenantId || "all"}
          onValueChange={(v) => {
            setTenantId(v === "all" ? "" : v);
            setCategory("");
          }}
        >
          <SelectTrigger>
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
      <div className="min-w-[140px]">
        <label className="text-xs text-muted-foreground mb-1 block">Categoria</label>
        <Select value={category || "all"} onValueChange={(v) => setCategory(v === "all" ? "" : v)}>
          <SelectTrigger>
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
      <div className="min-w-[160px]">
        <label className="text-xs text-muted-foreground mb-1 block">Posição</label>
        <Select value={position || "all"} onValueChange={(v) => setPosition(v === "all" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {FOOTBALL_POSITIONS.map((pos) => (
              <SelectItem key={pos.value} value={pos.value}>
                {pos.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-[180px]">
        <label className="text-xs text-muted-foreground mb-1 block">Busca (nome, time, posição)</label>
        <Input
          placeholder="Buscar..."
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
