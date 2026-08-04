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
import { dateKeyInBrazil } from "@/lib/brazil-time";
import { isFootballKind } from "@/lib/home-data";

interface Tenant {
  id: string;
  name: string;
  slug?: string;
  kind?: { id: string; name: string };
}

/** Logística é só para clubes de futebol. Exclui construtoras, real estate, etc. */
function isClubForLogistica(kindName: string | null | undefined): boolean {
  if (!kindName) return false;
  const k = kindName.toLowerCase();
  if (!isFootballKind(kindName)) return false;
  if (k.includes("construtora") || k.includes("real estate") || k.includes("construção")) return false;
  return true;
}

const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "rascunho", label: "Rascunho" },
  { value: "planejamento", label: "Planejamento" },
  { value: "aprovado", label: "Aprovado" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluido", label: "Concluído" },
  { value: "cancelado", label: "Cancelado" },
];

const LOGISTICA_BASE = "/dashboard/futebol/logistica";

export function LogisticaFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tenants, setTenants] = useState<Tenant[]>([]);

  useEffect(() => {
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => {
      const list = Array.isArray(data) ? data : [];
      setTenants(list.filter((t) => isClubForLogistica(t.kind?.name)));
    });
  }, []);

  const tenantId = searchParams.get("tenantId") ?? "";
  const status = searchParams.get("status") ?? "";
  const fromDateParam = searchParams.get("fromDate");
  const fromDate = fromDateParam?.trim() || dateKeyInBrazil(new Date());
  const toDate = searchParams.get("toDate") ?? "";

  const handleChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    // fromDate vazio = padrão "hoje" (não listar passados)
    if (key === "fromDate" && !value) params.delete("fromDate");
    router.push(`${LOGISTICA_BASE}?${params.toString()}`);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Clube</Label>
            <Select
              value={tenantId || "all"}
              onValueChange={(v) => handleChange("tenantId", v === "all" ? "" : v)}
            >
              <SelectTrigger className="w-[220px]">
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
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Status</Label>
            <Select value={status || "all"} onValueChange={(v) => handleChange("status", v === "all" ? "" : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value || "all"} value={o.value || "all"}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">De (data jogo)</Label>
            <Input
              type="date"
              className="w-[160px] text-foreground"
              value={fromDate}
              onChange={(e) => handleChange("fromDate", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Até (data jogo)</Label>
            <Input
              type="date"
              className="w-[160px] text-foreground"
              value={toDate}
              onChange={(e) => handleChange("toDate", e.target.value)}
            />
          </div>
          {(tenantId || status || fromDateParam || toDate) && (
            <button
              type="button"
              onClick={() => router.push(LOGISTICA_BASE)}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
