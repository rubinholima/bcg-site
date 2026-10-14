"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Search, Users } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BchFilterBar } from "@/components/dashboard/boston-city-hall/BchFilterBar";
import { BchLoadingBlock } from "@/components/dashboard/boston-city-hall/BchLoadingBlock";
import { BchEmptyState } from "@/components/dashboard/boston-city-hall/BchEmptyState";
import {
  BCH_CARD,
  BCH_DIALOG_CONTENT,
  BCH_TABLE_WRAP,
  BCH_BTN_SECONDARY,
} from "@/components/dashboard/boston-city-hall/bch-ui-classes";
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
import { formatTicketingMoney } from "@/types/boston-city-hall";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { BCH_BASE } from "@/components/dashboard/boston-city-hall/bch-navigation.config";

type BuyerRow = {
  id: string;
  email: string;
  displayName: string | null;
  phone: string | null;
  marketingOptIn: boolean;
  orderCount: number;
  eventCount: number;
  lastPurchaseAt: string | null;
  spendByCurrency: Record<string, string>;
};

type BuyerDetail = {
  profile: {
    id: string;
    email: string;
    displayName: string | null;
    phone: string | null;
    marketingOptIn: boolean;
    customerId: string | null;
  };
  summary: BuyerRow;
  orders: {
    id: string;
    orderNumber: string;
    status: string;
    eventName: string;
    total: string;
    currency: string;
    createdAt: string;
  }[];
};

export function BostonCityHallTicketBuyers() {
  const [rows, setRows] = useState<BuyerRow[]>([]);
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [detail, setDetail] = useState<BuyerDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ title: string; message: string; variant: "success" | "error" } | null>(
    null,
  );

  useEffect(() => {
    const t = window.setTimeout(() => setQDebounced(q.trim()), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (qDebounced) params.set("q", qDebounced);
      const res = await api.get<BuyerRow[]>(`/boston-city-hall/buyers?${params.toString()}`);
      setRows(Array.isArray(res.data) ? res.data : []);
    } finally {
      setLoading(false);
    }
  }, [qDebounced]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = async (id: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const res = await api.get<BuyerDetail>(`/boston-city-hall/buyers/${id}`);
      setDetail(res.data);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleOptIn = async (profileId: string, next: boolean) => {
    try {
      await api.patch(`/boston-city-hall/buyers/${profileId}/marketing-opt-in`, {
        marketingOptIn: next,
        source: "bch_dashboard",
      });
      if (detail?.profile.id === profileId) {
        setDetail({
          ...detail,
          profile: { ...detail.profile, marketingOptIn: next },
        });
      }
      await load();
    } catch {
      setFeedback({
        title: "Erro",
        message: "Não foi possível atualizar o opt-in de marketing.",
        variant: "error",
      });
    }
  };

  const spendLabel = (m: Record<string, string>) => {
    const entries = Object.entries(m);
    if (entries.length === 0) return "—";
    return entries.map(([cur, val]) => formatTicketingMoney(val, cur)).join(" · ");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-amber-400/80" />
          <h1 className="text-lg font-semibold text-slate-100">Compradores de ingressos</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={BCH_BTN_SECONDARY}
            disabled={syncing}
            onClick={() => {
              setSyncing(true);
              void api
                .post("/boston-city-hall/buyers/sync-from-orders")
                .then(() => load())
                .finally(() => setSyncing(false));
            }}
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sincronizar pedidos"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={BCH_BTN_SECONDARY}
            onClick={() => {
              void api.get<{ email: string; name: string; phone: string }[]>(
                "/boston-city-hall/buyers/export/marketing-opt-in",
              ).then((res) => {
                const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "bch-marketing-opt-in.json";
                a.click();
                URL.revokeObjectURL(url);
              });
            }}
          >
            Exportar opt-in
          </Button>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        CRM de compradores (distinto de leads comerciais do venue). Opt-in de marketing só com registro explícito.
        Leads comerciais:{" "}
        <Link href={`${BCH_BASE}/crm`} className="text-amber-400/90 hover:text-amber-300">
          CRM do venue
        </Link>
        .
      </p>

      <BchFilterBar>
        <div className="min-w-[220px] flex-1 space-y-1">
          <Label>Busca</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9 text-foreground" value={q} onChange={(e) => setQ(e.target.value)} placeholder="E-mail ou nome" />
          </div>
        </div>
      </BchFilterBar>

      <div className={BCH_CARD + " p-0 overflow-hidden"}>
        {loading ? (
          <BchLoadingBlock label="Carregando compradores…" />
        ) : rows.length === 0 ? (
          <BchEmptyState message="Nenhum comprador encontrado. Sincronize a partir dos pedidos de ingresso." />
        ) : (
          <div className={BCH_TABLE_WRAP}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Pedidos</TableHead>
                  <TableHead>Eventos</TableHead>
                  <TableHead>Gasto</TableHead>
                  <TableHead>Última compra</TableHead>
                  <TableHead>Marketing</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.displayName ?? r.email}</div>
                      <div className="text-xs text-slate-400">{r.email}</div>
                    </TableCell>
                    <TableCell>{r.orderCount}</TableCell>
                    <TableCell>{r.eventCount}</TableCell>
                    <TableCell className="text-xs">{spendLabel(r.spendByCurrency)}</TableCell>
                    <TableCell className="text-xs text-slate-400">
                      {r.lastPurchaseAt ? new Date(r.lastPurchaseAt).toLocaleDateString("pt-BR") : "—"}
                    </TableCell>
                    <TableCell>{r.marketingOptIn ? "Opt-in" : "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button type="button" variant="ghost" size="sm" onClick={() => void openDetail(r.id)}>
                        Abrir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className={BCH_DIALOG_CONTENT}>
          <DialogHeader>
            <DialogTitle>{detail?.profile.displayName ?? detail?.profile.email ?? "Comprador"}</DialogTitle>
          </DialogHeader>
          {detailLoading || !detail ? (
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <div className="space-y-4 text-sm">
              <div>
                <p>{detail.profile.email}</p>
                {detail.profile.phone ? <p className="text-slate-400">{detail.profile.phone}</p> : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Label className="text-slate-300">Marketing</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={BCH_BTN_SECONDARY}
                  onClick={() => void toggleOptIn(detail.profile.id, !detail.profile.marketingOptIn)}
                >
                  {detail.profile.marketingOptIn ? "Revogar opt-in" : "Registrar opt-in"}
                </Button>
              </div>
              <div>
                <p className="mb-2 font-medium text-slate-200">Pedidos recentes</p>
                <ul className="max-h-48 space-y-2 overflow-y-auto rounded border border-slate-800 p-2">
                  {detail.orders.map((o) => (
                    <li key={o.id} className="flex justify-between gap-2 text-xs">
                      <span>
                        {o.orderNumber} · {o.eventName}
                      </span>
                      <span>{formatTicketingMoney(o.total, o.currency)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDetailOpen(false)}>
              Fechar
            </Button>
            <Button type="button" asChild variant="outline" className={BCH_BTN_SECONDARY}>
              <Link href={`${BCH_BASE}/ticketing`}>Ver pedidos</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FeedbackModal
        open={!!feedback}
        onOpenChange={(o) => !o && setFeedback(null)}
        variant={feedback?.variant ?? "error"}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
      />
    </div>
  );
}
