"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { api } from "@/lib/api";
import { KpiCard } from "@/components/dashboard/cup360/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { VenueFinanceOverviewKpis, VenueReceivableListItem } from "@/types/boston-city-hall";
import {
  formatCatalogMoney,
  formatProposalDate,
  RECEIVABLE_STATUS_COLOR,
  RECEIVABLE_STATUS_LABEL,
} from "@/types/boston-city-hall";
import { cn } from "@/lib/utils";
import { BCH_BASE } from "./boston-city-hall-lead-shared";

const STATUS_FILTERS = ["all", "unpaid", "partial", "paid", "overdue", "cancelled"] as const;

export function BostonCityHallFinance() {
  const [kpis, setKpis] = useState<VenueFinanceOverviewKpis | null>(null);
  const [rows, setRows] = useState<VenueReceivableListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [period, setPeriod] = useState("all");
  const [overdueOnly, setOverdueOnly] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const periodRange = useMemo(() => {
    const now = new Date();
    if (period === "30d") {
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      return { updatedFrom: from.toISOString() };
    }
    if (period === "90d") {
      const from = new Date(now);
      from.setDate(from.getDate() - 90);
      return { updatedFrom: from.toISOString() };
    }
    return {};
  }, [period]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchDebounced) params.set("q", searchDebounced);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (overdueOnly) params.set("overdueOnly", "1");
      if (periodRange.updatedFrom) params.set("updatedFrom", periodRange.updatedFrom);
      const qs = params.toString();
      const [overviewRes, listRes] = await Promise.all([
        api.get<VenueFinanceOverviewKpis>("/boston-city-hall/finance/overview"),
        api.get<VenueReceivableListItem[]>(`/boston-city-hall/finance${qs ? `?${qs}` : ""}`),
      ]);
      setKpis(overviewRes.data);
      setRows(Array.isArray(listRes.data) ? listRes.data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar financeiro.");
      setRows([]);
      setKpis(null);
    } finally {
      setLoading(false);
    }
  }, [searchDebounced, statusFilter, overdueOnly, periodRange.updatedFrom]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      {kpis ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <KpiCard label="A receber (contratado)" value={formatCatalogMoney(kpis.totalContracted)} />
          <KpiCard label="Recebido" value={formatCatalogMoney(kpis.totalReceived)} tone="success" />
          <KpiCard label="Saldo em aberto" value={formatCatalogMoney(kpis.openBalance)} tone="warning" />
          <KpiCard
            label="Vencido"
            value={formatCatalogMoney(kpis.overdueBalance)}
            tone={Number.parseFloat(kpis.overdueBalance) > 0 ? "danger" : "default"}
          />
          <KpiCard label="A vencer (14 dias)" value={formatCatalogMoney(kpis.dueSoonBalance)} tone="info" />
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Contas a receber</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Cliente, contrato, evento…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "all" ? "Todos" : (RECEIVABLE_STATUS_LABEL[s] ?? s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Qualquer atualização</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={overdueOnly ? "overdue" : "all"}
              onValueChange={(v) => setOverdueOnly(v === "overdue")}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Vencimento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="overdue">Só vencidos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum financeiro encontrado. Crie a partir de um contrato assinado.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="hidden md:table-cell">Contrato</TableHead>
                    <TableHead className="hidden lg:table-cell">Evento</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Pago</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="hidden xl:table-cell">Próx. venc.</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id} className="cursor-pointer hover:bg-muted/40">
                      <TableCell>
                        <Link
                          href={`${BCH_BASE}/financeiro/${r.id}`}
                          className="block font-medium text-foreground hover:text-violet-300"
                        >
                          {r.contactName}
                          {r.companyName ? (
                            <span className="block text-xs font-normal text-muted-foreground">
                              {r.companyName}
                            </span>
                          ) : null}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Link href={`${BCH_BASE}/contratos/${r.contractId}`} className="hover:underline">
                          {r.contractNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell max-w-[160px] truncate">
                        {r.title}
                      </TableCell>
                      <TableCell className="text-right">{formatCatalogMoney(r.originalAmount)}</TableCell>
                      <TableCell className="text-right hidden sm:table-cell">
                        {formatCatalogMoney(r.totalPaid)}
                      </TableCell>
                      <TableCell className="text-right">{formatCatalogMoney(r.balance)}</TableCell>
                      <TableCell className="hidden xl:table-cell text-sm">
                        {r.nextDueDate ? (
                          <>
                            {formatProposalDate(r.nextDueDate)}
                            {r.nextDueAmount ? (
                              <span className="block text-xs text-muted-foreground">
                                {formatCatalogMoney(r.nextDueAmount)}
                              </span>
                            ) : null}
                          </>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                            RECEIVABLE_STATUS_COLOR[r.status] ?? RECEIVABLE_STATUS_COLOR.unpaid,
                          )}
                        >
                          {RECEIVABLE_STATUS_LABEL[r.status] ?? r.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
