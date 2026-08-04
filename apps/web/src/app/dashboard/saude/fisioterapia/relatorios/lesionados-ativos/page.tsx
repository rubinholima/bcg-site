"use client";

import { formatDateDayMonYear } from "@/lib/format-date";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, Loader2 } from "lucide-react";
import { PhysioReportPrintToolbar } from "@/components/dashboard/fisioterapia/PhysioReportPrintToolbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PhysioReportFilters } from "@/components/dashboard/fisioterapia/PhysioReportFilters";
import type { PhysioReportsDashboard } from "@/types/fisioterapia";
import { getCategoryLabel } from "@/lib/fixture-categories";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";

export default function FisioterapiaLesionadosReportPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const { categories: allCats } = useFixtureCategories();
  const [tenantId, setTenantId] = useState("");
  const [category, setCategory] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<PhysioReportsDashboard | null>(null);
  const rows = data?.activeInjured ?? [];
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tenantId) params.set("tenantId", tenantId);
      if (category) params.set("category", category);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const { data: res } = await api.get<PhysioReportsDashboard>(`/fisioterapia/reports/dashboard?${params}`);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId, category, from, to]);

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessModule("saude")) {
      router.replace("/403");
      return;
    }
    void load();
  }, [authLoading, canAccessModule, load, router]);

  if (authLoading || !canAccessModule("saude")) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between print:hidden">
        <div>
          <Link href="/dashboard/saude/fisioterapia" className="mb-2 inline-block text-sm text-muted-foreground hover:text-foreground">
            ← Atendimentos
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
            <ClipboardList className="h-8 w-8" />
            Lesionados em tratamento
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Atletas com atendimento ativo — use filtros opcionais de período de início.
          </p>
        </div>
        <PhysioReportPrintToolbar
          kind="lesionados"
          tenantId={tenantId}
          category={category}
          from={from}
          to={to}
          data={data}
          previewTitle="Pré-visualização — Lesionados"
        />
      </div>

      <div className="print:hidden">
        <PhysioReportFilters
          tenantId={tenantId}
          category={category}
          from={from}
          to={to}
          onTenantChange={setTenantId}
          onCategoryChange={setCategory}
          onFromChange={setFrom}
          onToChange={setTo}
          onApply={() => void load()}
          loading={loading}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{loading ? "Carregando…" : `${rows.length} atleta(s) em tratamento`}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Nenhum lesionado ativo neste filtro.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Atleta</TableHead>
                  <TableHead>Clube</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Locais / Dx</TableHead>
                  <TableHead>Dor</TableHead>
                  <TableHead>Previsão alta</TableHead>
                  <TableHead>Fisio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.playerName}</TableCell>
                    <TableCell>{r.tenantName}</TableCell>
                    <TableCell>{r.category ? getCategoryLabel(r.category, "pt", allCats) : "—"}</TableCell>
                    <TableCell className="max-w-[220px] text-sm">
                      {r.regions.map((x) => x.name + (x.side === "E" ? " E" : x.side === "D" ? " D" : "")).join(" · ")}
                      {r.diagnoses.length ? (
                        <span className="block text-muted-foreground">{r.diagnoses.join(" · ")}</span>
                      ) : null}
                    </TableCell>
                    <TableCell>{r.painScore != null ? `${r.painScore}/10` : "—"}</TableCell>
                    <TableCell>
                      {r.estimatedEndDate
                        ? formatDateDayMonYear(`${r.estimatedEndDate}T12:00:00`)
                        : "—"}
                    </TableCell>
                    <TableCell>{r.staffName ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
