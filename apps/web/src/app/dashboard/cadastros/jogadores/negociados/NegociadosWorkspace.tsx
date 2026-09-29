"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Loader2, Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { KpiCard } from "@/components/dashboard/cup360/KpiCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { JogadoresSubNav } from "../JogadoresSubNav";
import {
  formatNegotiationMoney,
  NEGOTIATION_STATUS_LABELS,
  NEGOTIATION_STATUSES,
  NEGOTIATION_TYPE_LABELS,
  NEGOTIATION_TYPES,
} from "@/lib/player-negotiation-labels";
import {
  downloadNegotiationsCsv,
  exportNegotiationsXlsx,
  type NegotiationExportRow,
} from "@/lib/player-negotiations-export";
import { cn } from "@/lib/utils";

type Tenant = { id: string; name: string };
type PlayerOption = { id: string; name: string; tenantId: string };

type NegotiationRow = NegotiationExportRow & {
  id: string;
  playerId: string;
  player: { id: string; name: string; category?: string | null };
};

type Summary = {
  negotiationCount: number;
  totalNegotiatedValue: number;
  averageNegotiatedPercentage: number | null;
  averageRetainedPercentage: number | null;
  installments: {
    total: number;
    paidAmount: number;
    pendingAmount: number;
    overdueAmount: number;
    upcomingDueCount: number;
  };
  rows: NegotiationRow[];
};

const STATUS_TABS = [
  { id: "in_progress", label: "Em negociação" },
  { id: "agreed", label: "Acordada" },
  { id: "effective", label: "Efetivada" },
  { id: "history", label: "Histórico" },
] as const;

export function NegociadosWorkspace() {
  const { canAccessModule, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState(searchParams.get("tenantId") ?? "");
  const [statusTab, setStatusTab] = useState(searchParams.get("status") ?? "in_progress");
  const [negotiationType, setNegotiationType] = useState(searchParams.get("type") ?? "");
  const [counterparty, setCounterparty] = useState(searchParams.get("counterparty") ?? "");
  const [playerFilter, setPlayerFilter] = useState(searchParams.get("playerId") ?? "");
  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");

  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    playerId: "",
    negotiationType: "transfer_permanent",
    status: "in_progress",
    counterpartyName: "",
    totalValue: "",
    negotiatedPercentage: "",
    retainedPercentage: "",
    negotiatedAt: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    if (!authLoading && !canAccessModule("cad_jogadores_negociados")) {
      router.replace("/403");
    }
  }, [authLoading, canAccessModule, router]);

  useEffect(() => {
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => {
      const list = Array.isArray(data) ? data : [];
      setTenants(list);
      if (!tenantId && list[0]) setTenantId(list[0].id);
    });
  }, [tenantId]);

  const queryStatus = useMemo(() => {
    if (statusTab === "history") return undefined;
    return statusTab;
  }, [statusTab]);

  const loadSummary = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ tenantId });
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (negotiationType) params.set("negotiationType", negotiationType);
      if (queryStatus) params.set("status", queryStatus);
      if (counterparty.trim()) params.set("counterparty", counterparty.trim());

      const { data } = await api.get<Summary>(`/player-negotiations/summary?${params}`);
      let rows = data?.rows ?? [];
      if (statusTab === "history") {
        rows = rows.filter((r) => r.status === "cancelled" || r.status === "expired");
      }
      if (playerFilter) {
        rows = rows.filter((r) => r.playerId === playerFilter);
      }
      setSummary({ ...(data as Summary), rows });
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Falha ao carregar indicadores.",
      });
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId, from, to, negotiationType, queryStatus, counterparty, statusTab, playerFilter]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (!tenantId || !createOpen) return;
    api
      .get<PlayerOption[]>(`/players?tenantId=${tenantId}`)
      .then(({ data }) => setPlayers(Array.isArray(data) ? data : []));
  }, [tenantId, createOpen]);

  const pushUrl = useCallback(() => {
    const p = new URLSearchParams();
    if (tenantId) p.set("tenantId", tenantId);
    if (statusTab) p.set("status", statusTab);
    if (negotiationType) p.set("type", negotiationType);
    if (counterparty.trim()) p.set("counterparty", counterparty.trim());
    if (playerFilter) p.set("playerId", playerFilter);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    router.replace(`/dashboard/cadastros/jogadores/negociados?${p.toString()}`);
  }, [tenantId, statusTab, negotiationType, counterparty, playerFilter, from, to, router]);

  const handleCreate = async () => {
    if (!tenantId || !form.playerId || !form.counterpartyName.trim()) {
      setFeedback({ open: true, title: "Campos obrigatórios", message: "Atleta e contraparte." });
      return;
    }
    setCreating(true);
    try {
      await api.post("/player-negotiations", {
        tenantId,
        playerId: form.playerId,
        negotiationType: form.negotiationType,
        status: form.status,
        counterpartyName: form.counterpartyName.trim(),
        totalValue: form.totalValue ? Number(form.totalValue) : undefined,
        negotiatedPercentage: form.negotiatedPercentage
          ? Number(form.negotiatedPercentage)
          : undefined,
        retainedPercentage: form.retainedPercentage ? Number(form.retainedPercentage) : undefined,
        negotiatedAt: form.negotiatedAt,
      });
      setCreateOpen(false);
      await loadSummary();
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro ao salvar",
        message: e instanceof Error ? e.message : "Não foi possível criar a negociação.",
      });
    } finally {
      setCreating(false);
    }
  };

  const exportCsv = async () => {
    if (!tenantId) return;
    const params = new URLSearchParams({ tenantId });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (negotiationType) params.set("negotiationType", negotiationType);
    if (queryStatus) params.set("status", queryStatus);
    if (counterparty.trim()) params.set("counterparty", counterparty.trim());
    const res = await fetch(`/api/player-negotiations/export/csv?${params}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Falha ao exportar CSV.");
    const text = await res.text();
    downloadNegotiationsCsv(text, `negociacoes-${tenantId.slice(0, 6)}`);
  };

  const exportXlsx = () => {
    if (!summary?.rows.length) return;
    exportNegotiationsXlsx(summary.rows, `negociacoes-${tenantId.slice(0, 6)}`);
  };

  if (authLoading || !canAccessModule("cad_jogadores_negociados")) {
    return (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const rows = summary?.rows ?? [];

  return (
    <div className="space-y-6">
      <JogadoresSubNav active="/dashboard/cadastros/jogadores/negociados" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <Button
              key={tab.id}
              type="button"
              variant={statusTab === tab.id ? "default" : "outline"}
              size="sm"
              className="min-h-[44px]"
              onClick={() => setStatusTab(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="min-h-[44px]" onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[44px]"
            onClick={exportXlsx}
            disabled={!rows.length}
          >
            <Download className="mr-2 h-4 w-4" />
            XLSX
          </Button>
          <Button type="button" className="min-h-[44px]" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova negociação
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Negociações" value={String(summary?.negotiationCount ?? 0)} />
        <KpiCard
          label="Valor negociado"
          value={formatNegotiationMoney(summary?.totalNegotiatedValue ?? 0)}
        />
        <KpiCard
          label="Parcelas pendentes"
          value={formatNegotiationMoney(summary?.installments.pendingAmount ?? 0)}
        />
        <KpiCard
          label="Parcelas vencidas"
          value={formatNegotiationMoney(summary?.installments.overdueAmount ?? 0)}
        />
      </div>

      <div className="grid gap-3 rounded-xl border border-border/60 bg-card/40 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="space-y-1">
          <Label className="text-xs">Clube</Label>
          <NativeSelect value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
            <option value="">Selecione…</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Tipo</Label>
          <NativeSelect
            value={negotiationType}
            onChange={(e) => setNegotiationType(e.target.value)}
          >
            <option value="">Todos</option>
            {NEGOTIATION_TYPES.map((t) => (
              <option key={t} value={t}>
                {NEGOTIATION_TYPE_LABELS[t]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Contraparte</Label>
          <Input value={counterparty} onChange={(e) => setCounterparty(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Atleta (ID)</Label>
          <Input
            value={playerFilter}
            onChange={(e) => setPlayerFilter(e.target.value)}
            placeholder="Filtrar por ID"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">De</Label>
          <Input
            type="date"
            className="text-foreground"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Até</Label>
          <Input
            type="date"
            className="text-foreground"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div className="flex items-end sm:col-span-2 lg:col-span-3 xl:col-span-6">
          <Button type="button" variant="secondary" className="min-h-[44px]" onClick={pushUrl}>
            Aplicar filtros
          </Button>
        </div>
      </div>

      {summary && (
        <p className="text-sm text-muted-foreground">
          Média % negociada:{" "}
          {summary.averageNegotiatedPercentage != null
            ? `${summary.averageNegotiatedPercentage.toFixed(1)}%`
            : "—"}{" "}
          · retida:{" "}
          {summary.averageRetainedPercentage != null
            ? `${summary.averageRetainedPercentage.toFixed(1)}%`
            : "—"}{" "}
          · recebido/pago: {formatNegotiationMoney(summary.installments.paidAmount)} · próximos
          vencimentos (30d): {summary.installments.upcomingDueCount}
        </p>
      )}

      <div className={cn("overflow-x-auto rounded-xl border border-border/80", loading && "opacity-60")}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Atleta</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Contraparte</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="hidden md:table-cell">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Nenhuma negociação neste filtro.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((n) => (
                <TableRow key={n.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/cadastros/jogadores/${n.player.id}/edit?tab=negociacoes`}
                      className="font-medium text-violet-400 hover:underline"
                    >
                      {n.player.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">
                    {NEGOTIATION_TYPE_LABELS[n.negotiationType] ?? n.negotiationType}
                  </TableCell>
                  <TableCell className="text-sm">
                    {NEGOTIATION_STATUS_LABELS[n.status] ?? n.status}
                  </TableCell>
                  <TableCell className="max-w-[120px] truncate sm:max-w-none">
                    {n.counterpartyName}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {formatNegotiationMoney(n.totalValue, n.currency)}
                  </TableCell>
                  <TableCell className="hidden text-sm md:table-cell">
                    {n.negotiatedPercentage ?? "—"} / {n.retainedPercentage ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova negociação</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label>Atleta</Label>
              <NativeSelect
                value={form.playerId}
                onChange={(e) => setForm((f) => ({ ...f, playerId: e.target.value }))}
              >
                <option value="">Selecione…</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <NativeSelect
                value={form.negotiationType}
                onChange={(e) => setForm((f) => ({ ...f, negotiationType: e.target.value }))}
              >
                {NEGOTIATION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {NEGOTIATION_TYPE_LABELS[t]}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <NativeSelect
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {NEGOTIATION_STATUSES.filter((s) => s !== "expired").map((s) => (
                  <option key={s} value={s}>
                    {NEGOTIATION_STATUS_LABELS[s]}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <Label>Contraparte (clube/entidade)</Label>
              <Input
                value={form.counterpartyName}
                onChange={(e) => setForm((f) => ({ ...f, counterpartyName: e.target.value }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Valor total</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.totalValue}
                  onChange={(e) => setForm((f) => ({ ...f, totalValue: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Data negociação</Label>
                <Input
                  type="date"
                  className="text-foreground"
                  value={form.negotiatedAt}
                  onChange={(e) => setForm((f) => ({ ...f, negotiatedAt: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>% negociada</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.negotiatedPercentage}
                  onChange={(e) => setForm((f) => ({ ...f, negotiatedPercentage: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>% retida</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.retainedPercentage}
                  onChange={(e) => setForm((f) => ({ ...f, retainedPercentage: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={creating} onClick={handleCreate}>
              {creating ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
      />
    </div>
  );
}
