"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Printer, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DashboardDeptSection,
  DashboardEmptyState,
  DashboardListRow,
  DashboardLoadingState,
} from "@/components/dashboard/DashboardDeptHeader";
import { NativeSelectField } from "@/components/ui/native-select";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import { filterCategoriesForTenant, getCategoryLabel } from "@/lib/fixture-categories";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";
import { listPsychologyAbsentAttendance } from "@/lib/psychology-attendance.util";
import {
  printPsychologyGroupAbsentReport,
  type PsychologyGroupAbsentPrintInput,
} from "@/lib/print-psychology-group-absent";
import type { PsychologySession } from "@/types/psychology-session";

type TenantOption = { id: string; name: string; categories?: string[] | null };

function monthRangeKeys(): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const from = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const last = new Date(y, m + 1, 0).getDate();
  const to = `${y}-${String(m + 1).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { from, to };
}

function sessionToPrintInput(
  session: PsychologySession,
  categoryLabel: string,
): PsychologyGroupAbsentPrintInput {
  const attendance = Array.isArray(session.attendance) ? session.attendance : [];
  const absent = listPsychologyAbsentAttendance(attendance);
  return {
    date: session.date,
    time: session.time,
    categoryLabel,
    tenantName: session.tenant?.name,
    psychologistName: session.psychologistName,
    estagiarioName: session.estagiarioName,
    location: session.location,
    groupSummary: session.groupSummary,
    absent,
    totalRoster: attendance.length,
  };
}

export function PsicologiaGrupoAusentesReport() {
  const { categories: allFixtureCategories } = useFixtureCategories();
  const defaultRange = monthRangeKeys();
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [category, setCategory] = useState("");
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [rows, setRows] = useState<PsychologySession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<TenantOption[]>("/tenants?clubsOnly=1").then(({ data }) => {
      setTenants(Array.isArray(data) ? data : []);
    });
  }, []);

  const selectedTenant = tenants.find((t) => t.id === tenantId);
  const categoryOptions = useMemo(() => {
    const list = filterCategoriesForTenant(allFixtureCategories, selectedTenant?.categories);
    return [{ value: "", label: "Todas as categorias" }, ...list.map((c) => ({ value: c.value, label: c.labelPT }))];
  }, [allFixtureCategories, selectedTenant?.categories]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sessionType: "grupo",
        from,
        to,
      });
      if (tenantId) params.set("tenantId", tenantId);
      if (category) params.set("category", category);
      const { data } = await api.get<PsychologySession[]>(`/psychology-sessions?${params.toString()}`);
      const list = (Array.isArray(data) ? data : []).filter((s) => s.status === "completed");
      list.sort((a, b) => `${b.date}${b.time ?? ""}`.localeCompare(`${a.date}${a.time ?? ""}`));
      setRows(list);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [from, to, tenantId, category]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" className="min-h-[44px]" asChild>
          <Link href="/dashboard/psicologia/relatorios">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Relatórios semanais
          </Link>
        </Button>
      </div>

      <DashboardDeptSection
        title="Ausentes — atendimento em grupo"
        description="Sessões em grupo finalizadas com lista de presença."
        aside={
          <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Atualizar
          </Button>
        }
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Clube</Label>
            <NativeSelectField
              value={tenantId}
              onChange={(e) => {
                setTenantId(e.target.value);
                setCategory("");
              }}
              placeholder="Todos os clubes"
              options={tenants.map((t) => ({ value: t.id, label: t.name }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Categoria</Label>
            <NativeSelectField
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={categoryOptions}
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">De</Label>
            <Input type="date" className="text-foreground" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Até</Label>
            <Input type="date" className="text-foreground" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <DashboardLoadingState label="Carregando sessões…" />
        ) : rows.length === 0 ? (
          <DashboardEmptyState>
            Nenhuma sessão em grupo no período. Registre em Consultas ou Agenda Psicologia → aba Grupo.
          </DashboardEmptyState>
        ) : (
          <ul className="space-y-2">
            {rows.map((session) => {
              const attendance = Array.isArray(session.attendance) ? session.attendance : [];
              const absent = listPsychologyAbsentAttendance(attendance);
              const catLabel = getCategoryLabel(session.category ?? "", allFixtureCategories, "pt");
              const printInput = sessionToPrintInput(session, catLabel);
              return (
                <li key={session.id}>
                  <DashboardListRow>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="font-semibold text-foreground">
                        {catLabel} · {formatDateDayMonYear(session.date)}
                        {session.time ? ` · ${session.time}` : ""}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {session.tenant?.name ?? "Clube"} · {absent.length} ausente
                        {absent.length !== 1 ? "s" : ""} · {attendance.length} na chamada
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-[40px] shrink-0"
                      onClick={() => printPsychologyGroupAbsentReport(printInput)}
                    >
                      <Printer className="mr-1.5 h-3.5 w-3.5" />
                      Imprimir
                    </Button>
                  </DashboardListRow>
                </li>
              );
            })}
          </ul>
        )}
      </DashboardDeptSection>
    </div>
  );
}
