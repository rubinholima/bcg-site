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
import { FIXTURE_CATEGORIES } from "@/lib/fixture-categories";
import { getEmployeeTypeLabel } from "@/lib/employee-types";

interface Tenant {
  id: string;
  name: string;
  slug?: string;
  categories?: string[] | null;
}

export interface PersonOption {
  id: string;
  name: string;
  type?: string;
  playerId?: string | null;
  tenantName?: string;
  category?: string | null;
}

interface JuridicoFiltersProps {
  persons: PersonOption[];
  selectedPersonId: string;
  onSelectPerson: (id: string) => void;
}

export function JuridicoFilters({
  persons,
  selectedPersonId,
  onSelectPerson,
}: JuridicoFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState(searchParams.get("tenantId") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [docType, setDocType] = useState(searchParams.get("docType") ?? "");
  const [docStatus, setDocStatus] = useState(searchParams.get("docStatus") ?? "");

  useEffect(() => {
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => {
      setTenants(Array.isArray(data) ? data : []);
    });
  }, []);

  useEffect(() => {
    setTenantId(searchParams.get("tenantId") ?? "");
    setCategory(searchParams.get("category") ?? "");
    setSearch(searchParams.get("search") ?? "");
    setDocType(searchParams.get("docType") ?? "");
    setDocStatus(searchParams.get("docStatus") ?? "");
  }, [searchParams]);

  const selectedTenant = tenants.find((t) => t.id === tenantId);
  const categoriesForDropdown = selectedTenant?.categories?.length
    ? FIXTURE_CATEGORIES.filter((c) =>
        selectedTenant.categories!.includes(c.value)
      )
    : FIXTURE_CATEGORIES;

  const applyFilters = useCallback(
    (updates?: {
      tenantId?: string;
      category?: string;
      search?: string;
      docType?: string;
      docStatus?: string;
    }) => {
      const t = updates?.tenantId !== undefined ? updates.tenantId : tenantId;
      const c = updates?.category !== undefined ? updates.category : category;
      const s = updates?.search !== undefined ? updates.search : search;
      const dt = updates?.docType !== undefined ? updates.docType : docType;
      const dst = updates?.docStatus !== undefined ? updates.docStatus : docStatus;
      const params = new URLSearchParams();
      if (t) params.set("tenantId", t);
      if (c) params.set("category", c);
      if (s.trim()) params.set("search", s.trim());
      if (dt) params.set("docType", dt);
      if (dst) params.set("docStatus", dst);
      router.push(`/dashboard/juridico?${params.toString()}`);
    },
    [router, tenantId, category, search, docType, docStatus]
  );

  const clearFilters = useCallback(() => {
    setTenantId("");
    setCategory("");
    setSearch("");
    setDocType("");
    setDocStatus("");
    onSelectPerson("");
    router.push("/dashboard/juridico");
  }, [router, onSelectPerson]);

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
                onSelectPerson("");
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
                onSelectPerson("");
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
              Nome
            </label>
            <Select
              value={selectedPersonId || "none"}
              onValueChange={(v) => onSelectPerson(v === "none" ? "" : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um nome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Selecione um nome</SelectItem>
                {persons.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                    {p.type ? ` · ${getEmployeeTypeLabel(p.type)}` : ""}
                    {!tenantId && p.tenantName ? ` · ${p.tenantName}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[180px]">
            <label className="text-xs text-muted-foreground mb-1 block">
              Tipo de documento
            </label>
            <Select
              value={docType || "all"}
              onValueChange={(v) => applyFilters({ docType: v === "all" ? "" : v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="contrato_trabalho">Contrato de trabalho</SelectItem>
                <SelectItem value="contrato_imagem">Contrato de imagem</SelectItem>
                <SelectItem value="formacao">Contrato de formação</SelectItem>
                <SelectItem value="rescisao">Termo de rescisão</SelectItem>
                <SelectItem value="transferencia">Termo de transferência</SelectItem>
                <SelectItem value="aditivo">Aditivo contratual</SelectItem>
                <SelectItem value="procuração">Procuração</SelectItem>
                <SelectItem value="nda">NDA / Confidencialidade</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[160px]">
            <label className="text-xs text-muted-foreground mb-1 block">
              Status
            </label>
            <Select
              value={docStatus || "all"}
              onValueChange={(v) => applyFilters({ docStatus: v === "all" ? "" : v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="pending_signature">Aguardando assinatura</SelectItem>
                <SelectItem value="signed">Assinado</SelectItem>
                <SelectItem value="expired">Expirado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
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
