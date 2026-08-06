"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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
import { useCategoriesForTenant } from "@/hooks/useFixtureCategories";
import { FOOTBALL_POSITIONS, getPositionLabel } from "@/lib/football-positions";
import { SPORTS_SITUATION_OPTIONS } from "@/lib/player-registration-profile";

interface Tenant {
  id: string;
  name: string;
  slug?: string;
  categories?: string[] | null;
}

interface JogadoresFiltersProps {
  archivedMode?: boolean;
  loanedMode?: boolean;
  basePath?: string;
}

export function JogadoresFilters({
  archivedMode = false,
  loanedMode = false,
  basePath = "/dashboard/cadastros/jogadores",
}: JogadoresFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState(searchParams.get("tenantId") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [position, setPosition] = useState(searchParams.get("position") ?? "");
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [situation, setSituation] = useState(searchParams.get("situation") ?? "");
  const [availability, setAvailability] = useState(searchParams.get("availability") ?? "");

  useEffect(() => {
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => {
      setTenants(Array.isArray(data) ? data : []);
    });
  }, []);

  const selectedTenant = tenants.find((t) => t.id === tenantId);
  const { categories: categoriesForDropdown } = useCategoriesForTenant(
    selectedTenant?.categories,
  );

  const pushFilters = useCallback(
    (values: {
      tenantId: string;
      category: string;
      position: string;
      search: string;
      situation: string;
      availability: string;
    }) => {
      const params = new URLSearchParams();
      if (values.tenantId) params.set("tenantId", values.tenantId);
      if (values.category) params.set("category", values.category);
      if (values.position) params.set("position", values.position);
      if (values.search.trim()) params.set("search", values.search.trim());
      if (!archivedMode && !loanedMode && values.situation) {
        params.set("situation", values.situation);
      }
      if (!archivedMode && !loanedMode && values.availability) {
        params.set("availability", values.availability);
      }
      const qs = params.toString();
      router.replace(qs ? `${basePath}?${qs}` : basePath);
    },
    [archivedMode, basePath, loanedMode, router],
  );

  const filterValues = { tenantId, category, position, search, situation, availability };

  useEffect(() => {
    const urlSearch = searchParams.get("search") ?? "";
    if (search.trim() === urlSearch.trim()) return;
    const timer = window.setTimeout(() => {
      pushFilters(filterValues);
    }, 400);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce só no texto de busca
  }, [search]);

  const clearFilters = () => {
    setTenantId("");
    setCategory("");
    setPosition("");
    setSearch("");
    setSituation("");
    setAvailability("");
    router.replace(basePath);
  };

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-[240px]">
        <label className="text-xs text-muted-foreground mb-1 block">Clube</label>
        <Select
          value={tenantId || "all"}
          onValueChange={(v) => {
            const nextTenantId = v === "all" ? "" : v;
            setTenantId(nextTenantId);
            setCategory("");
              pushFilters({
              tenantId: nextTenantId,
              category: "",
              position,
              search,
              situation,
              availability,
            });
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
      {!archivedMode && !loanedMode ? (
        <div className="min-w-[140px]">
          <label className="text-xs text-muted-foreground mb-1 block">Categoria</label>
          <Select
            value={category || "all"}
            onValueChange={(v) => {
              const nextCategory = v === "all" ? "" : v;
              setCategory(nextCategory);
              pushFilters({ tenantId, category: nextCategory, position, search, situation, availability });
            }}
          >
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
      ) : null}
      {!archivedMode && !loanedMode ? (
        <div className="min-w-[160px]">
          <label className="text-xs text-muted-foreground mb-1 block">Posição</label>
          <Select
            value={position || "all"}
            onValueChange={(v) => {
              const nextPosition = v === "all" ? "" : v;
              setPosition(nextPosition);
              pushFilters({ tenantId, category, position: nextPosition, search, situation, availability });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas">
                {position ? getPositionLabel(position) : undefined}
              </SelectValue>
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
      ) : null}
      {archivedMode ? (
        <div className="min-w-[140px]">
          <label className="text-xs text-muted-foreground mb-1 block">Categoria</label>
          <Select
            value={category || "all"}
            onValueChange={(v) => {
              const nextCategory = v === "all" ? "" : v;
              setCategory(nextCategory);
              pushFilters({ tenantId, category: nextCategory, position, search, situation, availability });
            }}
          >
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
      ) : null}
      {archivedMode ? (
        <div className="min-w-[160px]">
          <label className="text-xs text-muted-foreground mb-1 block">Posição</label>
          <Select
            value={position || "all"}
            onValueChange={(v) => {
              const nextPosition = v === "all" ? "" : v;
              setPosition(nextPosition);
              pushFilters({ tenantId, category, position: nextPosition, search, situation, availability });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas">
                {position ? getPositionLabel(position) : undefined}
              </SelectValue>
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
      ) : null}
      {!archivedMode && !loanedMode ? (
        <div className="min-w-[150px]">
          <label className="text-xs text-muted-foreground mb-1 block">Vínculo</label>
          <Select
            value={situation || "all"}
            onValueChange={(v) => {
              const nextSituation = v === "all" ? "" : v;
              setSituation(nextSituation);
              pushFilters({ tenantId, category, position, search, situation: nextSituation, availability });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Ativos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Ativos (padrão)</SelectItem>
              {SPORTS_SITUATION_OPTIONS.filter(
                (o) => o.value !== "desligado" && o.value !== "emprestado",
              ).map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {!archivedMode && !loanedMode ? (
        <div className="min-w-[150px]">
          <label className="text-xs text-muted-foreground mb-1 block">Aptidão</label>
          <Select
            value={availability || "all"}
            onValueChange={(v) => {
              const nextAvailability = v === "all" ? "" : v;
              setAvailability(nextAvailability);
              pushFilters({ tenantId, category, position, search, situation, availability: nextAvailability });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="apto">Apto para jogo</SelectItem>
              <SelectItem value="nao_apto">Não apto</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <div className="min-w-[180px]">
        <label className="text-xs text-muted-foreground mb-1 block">
          Busca (nome, CPF, registro CBF…)
        </label>
        <Input
          placeholder="Nome, CPF ou registro CBF"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <Button variant="ghost" onClick={clearFilters}>
        Limpar
      </Button>
    </div>
  );
}
