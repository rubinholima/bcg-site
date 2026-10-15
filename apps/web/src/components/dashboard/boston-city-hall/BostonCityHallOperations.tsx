"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { BchCard } from "@/components/dashboard/boston-city-hall/BchCard";
import { BchEmptyState } from "@/components/dashboard/boston-city-hall/BchEmptyState";
import { BchFilterBar } from "@/components/dashboard/boston-city-hall/BchFilterBar";
import { BchInlineError } from "@/components/dashboard/boston-city-hall/BchInlineError";
import { BchLoadingBlock } from "@/components/dashboard/boston-city-hall/BchLoadingBlock";
import { BchDestinationPageShell } from "@/components/dashboard/boston-city-hall/BchDestinationPageShell";
import { BchMetricsStrip } from "@/components/dashboard/boston-city-hall/BchMetricsStrip";
import { BCH_BASE as BCH_NAV_BASE } from "@/components/dashboard/boston-city-hall/bch-navigation.config";
import { BCH_BTN_SECONDARY, BCH_TABLE_WRAP } from "@/components/dashboard/boston-city-hall/bch-ui-classes";
import { Button } from "@/components/ui/button";
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
import type { VenueOperationListItem, VenueSpace } from "@/types/boston-city-hall";
import {
  BOOKING_STATUS_LABEL,
  formatCatalogMoney,
  RECEIVABLE_STATUS_LABEL,
  VENUE_CONTRACT_STATUS_LABEL,
  VENUE_PROPOSAL_STATUS_LABEL,
} from "@/types/boston-city-hall";
import { cn } from "@/lib/utils";
import { BCH_BASE } from "./boston-city-hall-lead-shared";

const VIEWS = [
  { value: "upcoming", label: "Próximos" },
  { value: "today", label: "Hoje" },
  { value: "past", label: "Passados" },
  { value: "all", label: "Ampliado" },
] as const;

function formatWhen(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const date = start.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  const t1 = start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const t2 = end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${t1}–${t2}`;
}

function alertClass(severity: string): string {
  if (severity === "danger") return "bg-red-500/15 text-red-200 ring-red-500/30";
  if (severity === "warning") return "bg-amber-500/15 text-amber-200 ring-amber-500/30";
  return "bg-sky-500/15 text-sky-200 ring-sky-500/30";
}

export function BostonCityHallOperations() {
  const [rows, setRows] = useState<VenueOperationListItem[]>([]);
  const [spaces, setSpaces] = useState<VenueSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [view, setView] = useState<string>("upcoming");
  const [spaceId, setSpaceId] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [financeFilter, setFinanceFilter] = useState("all");

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    void api.get<VenueSpace[]>("/boston-city-hall/spaces").then((res) => {
      setSpaces(Array.isArray(res.data) ? res.data : []);
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("view", view);
      if (searchDebounced) params.set("q", searchDebounced);
      if (spaceId !== "all") params.set("spaceId", spaceId);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (financeFilter !== "all") params.set("financeStatus", financeFilter);
      const res = await api.get<VenueOperationListItem[]>(
        `/boston-city-hall/operations?${params.toString()}`,
      );
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar operação.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [searchDebounced, view, spaceId, statusFilter, financeFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <BchDestinationPageShell
      title="Equipe e operação"
      actions={
        <>
          <Button asChild variant="outline" className={cn("min-h-[44px]", BCH_BTN_SECONDARY)}>
            <Link href={`${BCH_NAV_BASE}/agenda`}>Calendário</Link>
          </Button>
          <Button asChild variant="outline" className={cn("min-h-[44px]", BCH_BTN_SECONDARY)}>
            <Link href={`${BCH_NAV_BASE}/reservas`}>Reservas</Link>
          </Button>
        </>
      }
    >
      <BchMetricsStrip
        title="Operação"
        items={[
          { label: "Registros", value: loading ? "…" : rows.length },
          { label: "Espaços", value: spaces.length },
        ]}
      />

    <BchCard contentClassName="space-y-4">
        <BchFilterBar>
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Evento, cliente, proposta…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={view} onValueChange={setView}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {VIEWS.map((v) => (
                <SelectItem key={v.value} value={v.value}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={spaceId} onValueChange={setSpaceId}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Espaço" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os espaços</SelectItem>
              {spaces.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Reserva" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas reservas</SelectItem>
              <SelectItem value="hold">Pré-reserva</SelectItem>
              <SelectItem value="confirmed">Confirmado</SelectItem>
              <SelectItem value="blocked">Bloqueio</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={financeFilter} onValueChange={setFinanceFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Financeiro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Qualquer financeiro</SelectItem>
              <SelectItem value="none">Sem financeiro</SelectItem>
              <SelectItem value="overdue">Vencido</SelectItem>
              <SelectItem value="partial">Parcial</SelectItem>
              <SelectItem value="unpaid">Em aberto</SelectItem>
              <SelectItem value="paid">Quitado</SelectItem>
            </SelectContent>
          </Select>
        </BchFilterBar>

        {loading ? (
          <BchLoadingBlock />
        ) : error ? (
          <BchInlineError message={error} onRetry={() => void load()} />
        ) : rows.length === 0 ? (
          <BchEmptyState message="Nenhuma operação neste filtro. Ajuste o período ou a busca." />
        ) : (
          <div className={BCH_TABLE_WRAP}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Evento / cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Espaço</TableHead>
                  <TableHead className="hidden lg:table-cell">Contrato</TableHead>
                  <TableHead className="hidden sm:table-cell">Financeiro</TableHead>
                  <TableHead className="hidden xl:table-cell">Alertas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const client = r.contactName ?? r.title;
                  return (
                    <TableRow
                      key={r.bookingId}
                      className={cn(
                        "cursor-pointer hover:bg-muted/40",
                        r.bookingStatus === "cancelled" && "opacity-60",
                      )}
                    >
                      <TableCell className="whitespace-nowrap text-sm">
                        <Link
                          href={`${BCH_BASE}/operacao/${r.bookingId}`}
                          className="hover:text-violet-300"
                        >
                          {formatWhen(r.startAt, r.endAt)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`${BCH_BASE}/operacao/${r.bookingId}`} className="block min-w-0">
                          <span className="font-medium">{r.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {client}
                            {r.companyName ? ` · ${r.companyName}` : ""}
                            {r.guestCount != null ? ` · ${r.guestCount} conv.` : ""}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {BOOKING_STATUS_LABEL[r.bookingStatus] ?? r.bookingStatus}
                            {r.proposal
                              ? ` · Prop. ${VENUE_PROPOSAL_STATUS_LABEL[r.proposal.status] ?? r.proposal.status}`
                              : " · Sem proposta"}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{r.spaceName}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {r.contract ? (
                          <>
                            {r.contract.contractNumber}
                            <span className="block text-xs text-muted-foreground">
                              {VENUE_CONTRACT_STATUS_LABEL[r.contract.status] ?? r.contract.status}
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
                        {r.finance ? (
                          <>
                            {formatCatalogMoney(r.finance.balance)} saldo
                            <span className="block text-xs text-muted-foreground">
                              {RECEIVABLE_STATUS_LABEL[r.finance.status] ?? r.finance.status}
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">Não criado</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {r.alerts.slice(0, 3).map((a) => (
                            <span
                              key={a.code}
                              className={cn(
                                "inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset",
                                alertClass(a.severity),
                              )}
                            >
                              {a.label}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
    </BchCard>
    </BchDestinationPageShell>
  );
}
