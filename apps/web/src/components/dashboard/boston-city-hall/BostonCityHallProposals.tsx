"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { BchEmptyState } from "@/components/dashboard/boston-city-hall/BchEmptyState";
import { BchFilterBar } from "@/components/dashboard/boston-city-hall/BchFilterBar";
import { BchInlineError } from "@/components/dashboard/boston-city-hall/BchInlineError";
import { BchLoadingBlock } from "@/components/dashboard/boston-city-hall/BchLoadingBlock";
import { BchDestinationPageShell } from "@/components/dashboard/boston-city-hall/BchDestinationPageShell";
import { BchMetricsStrip } from "@/components/dashboard/boston-city-hall/BchMetricsStrip";
import { BchModuleSubNav } from "@/components/dashboard/boston-city-hall/BchModuleSubNav";
import { BCH_COMMERCIAL_SUBNAV } from "@/components/dashboard/boston-city-hall/bch-subnav.config";
import { BCH_BASE as BCH_NAV_BASE } from "@/components/dashboard/boston-city-hall/bch-navigation.config";
import { BCH_BTN_PRIMARY, BCH_CARD, BCH_TABLE_WRAP } from "@/components/dashboard/boston-city-hall/bch-ui-classes";
import { cn } from "@/lib/utils";
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
import type { VenueProposal } from "@/types/boston-city-hall";
import {
  formatCatalogMoney,
  formatProposalDate,
  VENUE_PROPOSAL_STATUSES,
  VENUE_PROPOSAL_STATUS_COLOR,
  VENUE_PROPOSAL_STATUS_LABEL,
} from "@/types/boston-city-hall";
import { BCH_BASE } from "./boston-city-hall-lead-shared";

export function BostonCityHallProposals() {
  const [rows, setRows] = useState<VenueProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [period, setPeriod] = useState("all");

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
      if (periodRange.updatedFrom) params.set("updatedFrom", periodRange.updatedFrom);
      const qs = params.toString();
      const res = await api.get<VenueProposal[]>(
        `/boston-city-hall/proposals${qs ? `?${qs}` : ""}`,
      );
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar propostas.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [searchDebounced, statusFilter, periodRange.updatedFrom]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <BchDestinationPageShell
      title="Propostas"
      breadcrumbs={[
        { href: BCH_NAV_BASE, label: "Boston City Hall" },
        { label: "Comercial" },
        { label: "Propostas" },
      ]}
      subNav={<BchModuleSubNav items={BCH_COMMERCIAL_SUBNAV} ariaLabel="Comercial" />}
      actions={
        <Button asChild className={cn("min-h-[44px] gap-2", BCH_BTN_PRIMARY)}>
          <Link href={`${BCH_BASE}/propostas/new`}>
            <Plus className="h-4 w-4" />
            Nova proposta
          </Link>
        </Button>
      }
    >
      <BchMetricsStrip
        title="Lista"
        items={[{ label: "Propostas (filtro)", value: rows.length }]}
      />

    <div className={cn(BCH_CARD, "space-y-4 p-4 sm:p-5")}>
        <BchFilterBar className="mb-4 border-0 bg-transparent p-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap w-full">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar número, cliente…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {VENUE_PROPOSAL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {VENUE_PROPOSAL_STATUS_LABEL[s] ?? s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Qualquer data</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
        </BchFilterBar>

        {loading ? (
          <BchLoadingBlock label="Carregando propostas…" />
        ) : error ? (
          <BchInlineError message={error} onRetry={() => void load()} />
        ) : rows.length === 0 ? (
          <BchEmptyState
            message="Nenhuma proposta com estes filtros."
            action={
              <Button asChild className={cn("min-h-[44px]", BCH_BTN_PRIMARY)}>
                <Link href={`${BCH_BASE}/propostas/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova proposta
                </Link>
              </Button>
            }
          />
        ) : (
          <div className={BCH_TABLE_WRAP}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Evento</TableHead>
                  <TableHead className="hidden lg:table-cell">Data</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Validade</TableHead>
                  <TableHead className="hidden xl:table-cell">Atualização</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-muted/40">
                    <TableCell>
                      <Link
                        href={`${BCH_BASE}/propostas/${p.id}`}
                        className="font-medium text-violet-300 hover:underline"
                      >
                        {p.proposalNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{p.contactName}</div>
                      {p.companyName ? (
                        <div className="text-xs text-muted-foreground">{p.companyName}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="hidden max-w-[200px] truncate md:table-cell">
                      {p.title}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {formatProposalDate(p.eventDate)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {formatCatalogMoney(p.total)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium",
                          VENUE_PROPOSAL_STATUS_COLOR[p.status] ??
                            "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
                        )}
                      >
                        {VENUE_PROPOSAL_STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {formatProposalDate(p.validUntil)}
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground xl:table-cell">
                      {formatProposalDate(p.updatedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
    </div>
    </BchDestinationPageShell>
  );
}
