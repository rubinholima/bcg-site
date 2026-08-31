"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NativeSelectField } from "@/components/ui/native-select";
import {
  DashboardFieldLabel,
  DashboardFilterBox,
} from "@/components/dashboard/DashboardDeptHeader";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import { filterCategoriesForTenant, getCategoryLabel } from "@/lib/fixture-categories";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";
import { isFootballKind } from "@/lib/home-data";
import type { PhysioTransitionProgramListItem } from "@/lib/fisiologia-transition-types";
import { transitionWorkTypeLabel } from "@/lib/physio-transition-labels";
import { FisiologiaTransitionNotifications } from "@/components/dashboard/fisiologia/FisiologiaTransitionNotifications";
import { cn } from "@/lib/utils";

type Tenant = {
  id: string;
  name: string;
  categories?: string[] | null;
  kind?: { name?: string };
};

type ViewMode = "active" | "history";

const STATUS_LABEL: Record<string, string> = {
  completed: "Concluída",
  cancelled: "Cancelada",
  active: "Ativa",
};

export function FisiologiaTransicoesPanel() {
  const { categories: allCats } = useFixtureCategories();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [category, setCategory] = useState("");
  const [view, setView] = useState<ViewMode>("active");
  const [rows, setRows] = useState<PhysioTransitionProgramListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const footballTenants = useMemo(
    () => tenants.filter((t) => isFootballKind(t.kind?.name ?? "")),
    [tenants],
  );

  const categoryOptions = useMemo(() => {
    const tenant = footballTenants.find((t) => t.id === tenantId);
    return filterCategoriesForTenant(allCats, tenant?.categories ?? null);
  }, [allCats, footballTenants, tenantId]);

  const loadTenants = useCallback(async () => {
    const { data } = await api.get<Tenant[]>("/tenants?clubsOnly=1");
    const football = (Array.isArray(data) ? data : []).filter((t) =>
      isFootballKind(t.kind?.name ?? ""),
    );
    setTenants(football);
    if (football.length === 1) setTenantId(football[0]!.id);
  }, []);

  const loadRows = useCallback(async () => {
    if (!tenantId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tenantId,
        status: view === "history" ? "history" : "active",
      });
      if (category) params.set("category", category);
      const { data } = await api.get<PhysioTransitionProgramListItem[]>(
        `/fisiologia/transition-programs?${params}`,
      );
      setRows(data ?? []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, category, view]);

  useEffect(() => {
    void loadTenants();
  }, [loadTenants]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  return (
    <div className="space-y-4">
      <FisiologiaTransitionNotifications tenantId={tenantId || undefined} />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={view === "active" ? "default" : "outline"}
          className="min-h-[44px]"
          onClick={() => setView("active")}
        >
          Ativos
        </Button>
        <Button
          type="button"
          variant={view === "history" ? "default" : "outline"}
          className="min-h-[44px]"
          onClick={() => setView("history")}
        >
          Histórico
        </Button>
        <Button asChild variant="outline" className="min-h-[44px] ml-auto">
          <Link href="/dashboard/futebol/fisiologia/relatorios?kind=transicoes">
            <Printer className="mr-2 h-4 w-4" />
            Relatório mensal
          </Link>
        </Button>
      </div>

      <DashboardFilterBox accent="sky" className="sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <DashboardFieldLabel accent="sky">Clube</DashboardFieldLabel>
          <NativeSelectField
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            placeholder="Selecione…"
            options={footballTenants.map((t) => ({ value: t.id, label: t.name }))}
          />
        </div>
        <div className="space-y-2">
          <DashboardFieldLabel accent="sky">Categoria</DashboardFieldLabel>
          <NativeSelectField
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Todas"
            options={[
              { value: "", label: "Todas" },
              ...categoryOptions.map((c) => ({
                value: c.value,
                label: getCategoryLabel(c.value, "pt", allCats),
              })),
            ]}
          />
        </div>
      </DashboardFilterBox>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {view === "active" ? "Atletas em transição" : "Histórico de transições"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {view === "active"
                ? "Nenhum atleta em transição ativa."
                : "Nenhum programa concluído ou cancelado no filtro."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Atleta</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Início</TableHead>
                    {view === "history" ? <TableHead>Conclusão</TableHead> : null}
                    <TableHead>Origem fisio</TableHead>
                    <TableHead>Sessões</TableHead>
                    <TableHead>{view === "active" ? "Última evolução" : "Status"}</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const origin = row.originSession;
                    const latest = row.latestEntry;
                    return (
                      <TableRow
                        key={row.id}
                        className={cn(row.isNewReferral && view === "active" && "bg-amber-500/5")}
                      >
                        <TableCell className="font-medium">
                          {row.player?.name ?? "—"}
                          {row.isNewReferral && view === "active" ? (
                            <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-300">
                              Novo
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          {row.player?.category ? getCategoryLabel(row.player.category, "pt", allCats) : "—"}
                        </TableCell>
                        <TableCell>{formatDateDayMonYear(row.startedAt)}</TableCell>
                        {view === "history" ? (
                          <TableCell>
                            {row.completedAt ? formatDateDayMonYear(row.completedAt) : "—"}
                          </TableCell>
                        ) : null}
                        <TableCell className="max-w-[200px] truncate text-sm">
                          {origin?.region?.namePt ?? origin?.diagnosisLabel ?? "—"}
                        </TableCell>
                        <TableCell>{row.sessionCount}</TableCell>
                        <TableCell className="max-w-[220px] truncate text-sm">
                          {view === "history" ? (
                            STATUS_LABEL[row.status] ?? row.status
                          ) : latest ? (
                            `${formatDateDayMonYear(latest.sessionDate)} · ${transitionWorkTypeLabel(latest.workType, latest.workTypeLabel)}`
                          ) : (
                            "Aguardando 1ª sessão"
                          )}
                        </TableCell>
                        <TableCell>
                          <Button asChild variant="ghost" size="sm" className="min-h-[44px]">
                            <Link href={`/dashboard/futebol/fisiologia/transicoes/${row.id}`}>
                              Abrir
                              <ChevronRight className="ml-1 h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
