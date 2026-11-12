"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, FileSpreadsheet, Printer, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectField } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { printFinanceReport } from "@/lib/finance-reports-print";
import { KpiCard } from "@/components/dashboard/cup360/KpiCard";

type Summary = {
  receitas: number;
  despesas: number;
  resultado: number;
  contasAPagar: number;
  contasAReceber: number;
  vencidoAPagar: number;
  vencidoAReceber: number;
  pagoRecebidoNoPeriodo: number;
  juros: number;
  multas: number;
  descontos: number;
  dateBasis: string;
  view: string;
  periodStart: string;
  periodEnd: string;
};

type DetailedResponse = {
  items: Array<Record<string, unknown>>;
  total: number;
  page: number;
  pageSize: number;
};

const DATE_BASES = [
  { value: "competence", label: "Competência" },
  { value: "due", label: "Vencimento" },
  { value: "scheduled", label: "Data programada" },
  { value: "settlement", label: "Data da baixa" },
  { value: "issue", label: "Emissão" },
];

const PERIODS = [
  { value: "this_week", label: "Esta semana" },
  { value: "last_week", label: "Semana passada" },
  { value: "this_month", label: "Este mês" },
  { value: "last_month", label: "Mês passado" },
  { value: "this_semester", label: "Este semestre" },
  { value: "last_semester", label: "Semestre anterior" },
  { value: "this_year", label: "Este ano" },
  { value: "last_year", label: "Ano anterior" },
  { value: "custom", label: "Período personalizado" },
];

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function FinanceReportsPanel({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [periodPreset, setPeriodPreset] = useState(searchParams.get("periodPreset") ?? "this_month");
  const [startDate, setStartDate] = useState(searchParams.get("startDate") ?? "");
  const [endDate, setEndDate] = useState(searchParams.get("endDate") ?? "");
  const [dateBasis, setDateBasis] = useState(searchParams.get("dateBasis") ?? "due");
  const [view, setView] = useState(searchParams.get("view") ?? "obligation");
  const [direction, setDirection] = useState(searchParams.get("direction") ?? "ambos");
  const [tab, setTab] = useState(searchParams.get("tab") ?? "resumido");
  const [page, setPage] = useState(Number(searchParams.get("page") ?? "1") || 1);
  const [reconciliationStatus, setReconciliationStatus] = useState(
    searchParams.get("reconciliationStatus") ?? "",
  );

  const [summary, setSummary] = useState<Summary | null>(null);
  const [detailed, setDetailed] = useState<DetailedResponse | null>(null);
  const [categories, setCategories] = useState<Array<{ label: string; amount: number; percent: number }>>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const queryBase = useMemo(() => {
    const p = new URLSearchParams({ tenantId });
    p.set("periodPreset", periodPreset);
    p.set("dateBasis", dateBasis);
    p.set("view", view);
    p.set("direction", direction);
    if (periodPreset === "custom") {
      if (startDate) p.set("startDate", startDate);
      if (endDate) p.set("endDate", endDate);
    }
    if (reconciliationStatus) p.set("reconciliationStatus", reconciliationStatus);
    return p;
  }, [tenantId, periodPreset, startDate, endDate, dateBasis, view, direction, reconciliationStatus]);

  useEffect(() => {
    const p = new URLSearchParams(queryBase);
    p.set("tab", tab);
    p.set("page", String(page));
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  }, [queryBase, tab, page, pathname, router]);

  const dateBasisLabel = DATE_BASES.find((d) => d.value === dateBasis)?.label ?? dateBasis;
  const viewLabel = view === "cash" ? "Fluxo realizado (caixa)" : "Obrigações (competência/vencimento)";

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setErr(null);
    try {
      const qs = queryBase.toString();
      const [rSum, rCat] = await Promise.all([
        api.get<Summary>(`/financeiro/relatorios/resumo?${qs}`),
        api.get<{ items: Array<{ label: string; amount: number; percent: number }> }>(
          `/financeiro/relatorios/categorias?${qs}`,
        ),
      ]);
      setSummary(rSum.data);
      setCategories(Array.isArray(rCat.data?.items) ? rCat.data.items : []);

      if (tab === "detalhado") {
        const dq = new URLSearchParams(queryBase);
        dq.set("page", String(page));
        dq.set("pageSize", "50");
        const rDet = await api.get<DetailedResponse>(`/financeiro/relatorios/detalhado?${dq.toString()}`);
        setDetailed(rDet.data);
      } else {
        setDetailed(null);
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erro ao carregar relatório.");
    } finally {
      setLoading(false);
    }
  }, [tenantId, queryBase, tab, page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function exportCsv() {
    const url = `/api/financeiro/relatorios/export/csv?${queryBase.toString()}`;
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error("Falha na exportação CSV.");
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "financeiro-relatorio.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function exportXlsx() {
    const { data } = await api.get<DetailedResponse>(
      `/financeiro/relatorios/export/dataset?${queryBase.toString()}&page=1&pageSize=5000`,
    );
    const rows = (data?.items ?? []).map((row) => ({
      Empresa: row.empresa,
      Tipo: row.tipo,
      Descrição: row.descricao,
      Fornecedor: row.fornecedor,
      Cliente: row.cliente,
      Vencimento: row.vencimento,
      "Valor original": row.valorOriginal,
      Liquidado: row.valorLiquidado,
      Saldo: row.saldo,
      Categoria: row.categoria,
      "Conta programada": row.contaProgramada,
      "Conta utilizada": row.contaUtilizada,
      Status: row.status,
      Conciliação: row.conciliacao,
      Origem: row.origem,
    }));
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, "financeiro-relatorio.xlsx");
  }

  function printReport() {
    if (!summary) return;
    const summaryRows = [
      { label: "Receitas", value: money(summary.receitas) },
      { label: "Despesas", value: money(summary.despesas) },
      { label: "Resultado", value: money(summary.resultado) },
      { label: "Realizado no período", value: money(summary.pagoRecebidoNoPeriodo) },
    ];
    const cols = [
      { key: "descricao", label: "Descrição" },
      { key: "vencimento", label: "Vencimento" },
      { key: "valorOriginal", label: "Original" },
      { key: "saldo", label: "Saldo" },
      { key: "categoria", label: "Categoria" },
    ];
    printFinanceReport(
      {
        title: "Relatório Financeiro CUP360",
        empresa: tenantId,
        period: `${summary.periodStart} — ${summary.periodEnd}`,
        dateBasis: dateBasisLabel,
        view: viewLabel,
        filtersSummary: direction,
      },
      summaryRows,
      (detailed?.items ?? []) as Array<Record<string, string | number | null>>,
      cols,
    );
  }

  const totalPages = detailed ? Math.max(1, Math.ceil(detailed.total / detailed.pageSize)) : 1;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1 sm:col-span-2 lg:col-span-1">
            <Label>Período</Label>
            <NativeSelectField
              value={periodPreset}
              onChange={(e) => setPeriodPreset(e.target.value)}
              options={PERIODS.map((p) => ({ value: p.value, label: p.label }))}
            />
          </div>
          {periodPreset === "custom" ? (
            <>
              <div className="space-y-1">
                <Label>Início</Label>
                <Input type="date" className="text-foreground" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Fim</Label>
                <Input type="date" className="text-foreground" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </>
          ) : null}
          <div className="space-y-1">
            <Label>Base temporal</Label>
            <NativeSelectField
              value={dateBasis}
              onChange={(e) => setDateBasis(e.target.value)}
              options={DATE_BASES.map((d) => ({ value: d.value, label: d.label }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Visão</Label>
            <NativeSelect value={view} onChange={(e) => setView(e.target.value)}>
              <option value="obligation">Obrigações</option>
              <option value="cash">Caixa / realizado</option>
            </NativeSelect>
          </div>
          <div className="space-y-1">
            <Label>Direção</Label>
            <NativeSelect value={direction} onChange={(e) => setDirection(e.target.value)}>
              <option value="ambos">Receitas e despesas</option>
              <option value="receitas">Receitas</option>
              <option value="despesas">Despesas</option>
            </NativeSelect>
          </div>
          <div className="space-y-1">
            <Label>Conciliação (filtro)</Label>
            <NativeSelect value={reconciliationStatus} onChange={(e) => setReconciliationStatus(e.target.value)}>
              <option value="">Todas</option>
              <option value="not_reconciled">Não conciliado</option>
              <option value="reconciled">Conciliado</option>
            </NativeSelect>
          </div>
          <div className="flex flex-wrap items-end gap-2 sm:col-span-2">
            <Button type="button" size="sm" onClick={() => void load()} disabled={loading}>
              <RefreshCw className="mr-1 h-4 w-4" />
              Atualizar
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => void exportCsv()}>
              <Download className="mr-1 h-4 w-4" />
              CSV
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => void exportXlsx()}>
              <FileSpreadsheet className="mr-1 h-4 w-4" />
              XLSX
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={printReport}>
              <Printer className="mr-1 h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Base ativa: <span className="text-foreground font-medium">{dateBasisLabel}</span> ·{" "}
        {viewLabel}
        {summary ? ` · ${summary.periodStart} a ${summary.periodEnd}` : ""}
      </p>

      {err ? (
        <Card className="border-destructive/40">
          <CardContent className="pt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-destructive">{err}</p>
            <Button type="button" size="sm" variant="outline" onClick={() => void load()}>
              Tentar de novo
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Receitas" value={money(summary.receitas)} />
          <KpiCard label="Despesas" value={money(summary.despesas)} />
          <KpiCard label="Resultado" value={money(summary.resultado)} />
          <KpiCard label="Realizado no período" value={money(summary.pagoRecebidoNoPeriodo)} />
          <KpiCard label="A pagar (aberto)" value={money(summary.contasAPagar)} />
          <KpiCard label="A receber (aberto)" value={money(summary.contasAReceber)} />
          <KpiCard label="Vencido a pagar" value={money(summary.vencidoAPagar)} />
          <KpiCard label="Vencido a receber" value={money(summary.vencidoAReceber)} />
        </div>
      ) : null}

      <div className="flex gap-2 flex-wrap">
        {[
          ["resumido", "Resumido"],
          ["detalhado", "Detalhado"],
          ["categorias", "Categorias"],
        ].map(([key, label]) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={tab === key ? "default" : "outline"}
            onClick={() => {
              setTab(key);
              setPage(1);
            }}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === "categorias" && categories.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Análise por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((c) => (
                  <TableRow key={c.label}>
                    <TableCell>{c.label}</TableCell>
                    <TableCell className="text-right">{money(c.amount)}</TableCell>
                    <TableCell className="text-right">{c.percent.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {tab === "resumido" && summary ? (
        <Card>
          <CardContent className="pt-6 text-sm space-y-2">
            <p>
              Receitas: <strong>{money(summary.receitas)}</strong> · Despesas:{" "}
              <strong>{money(summary.despesas)}</strong> · Resultado:{" "}
              <strong>{money(summary.resultado)}</strong>
            </p>
            <p className="text-muted-foreground">
              Juros {money(summary.juros)} · Multas {money(summary.multas)} · Descontos{" "}
              {money(summary.descontos)}
            </p>
            {categories.slice(0, 5).map((c) => (
              <p key={c.label}>
                {direction === "receitas" ? "Receitas" : "Despesas"} — {c.label}: {money(c.amount)}
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {tab === "detalhado" && detailed ? (
        <Card>
          <CardContent className="pt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Original</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Conta prog.</TableHead>
                  <TableHead>Conta baixa</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailed.items.map((row) => (
                  <TableRow key={String(row.id)}>
                    <TableCell>{String(row.descricao ?? "")}</TableCell>
                    <TableCell>{String(row.vencimento ?? "")}</TableCell>
                    <TableCell className="text-right">{money(Number(row.valorOriginal ?? 0))}</TableCell>
                    <TableCell className="text-right">{money(Number(row.saldo ?? 0))}</TableCell>
                    <TableCell>{String(row.categoria ?? "")}</TableCell>
                    <TableCell>{String(row.contaProgramada ?? "—")}</TableCell>
                    <TableCell>{String(row.contaUtilizada ?? "—")}</TableCell>
                    <TableCell>{String(row.status ?? "")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {detailed.total} registro(s) · página {page} de {totalPages}
              </span>
              <ApplicationPagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function ApplicationPagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  return (
    <div className="flex gap-2">
      <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Anterior
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Próxima
      </Button>
    </div>
  );
}
