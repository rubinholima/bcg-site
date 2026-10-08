"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  BchBarEventInventory,
  BchBarEventInventorySummary,
  BchBarProduct,
} from "@/types/bch-bar";

type TicketingEvent = { id: string; name: string; slug?: string };

export function BostonCityHallBarEventInventory() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [events, setEvents] = useState<TicketingEvent[]>([]);
  const [products, setProducts] = useState<BchBarProduct[]>([]);
  const [inventories, setInventories] = useState<BchBarEventInventory[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [summary, setSummary] = useState<BchBarEventInventorySummary | null>(null);
  const [openEventId, setOpenEventId] = useState("");
  const [lineProductId, setLineProductId] = useState("");
  const [lineQty, setLineQty] = useState("1");
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: "success" | "error";
  }>({ open: false, title: "", message: "", variant: "success" });

  const selected = useMemo(
    () => inventories.find((i) => i.id === selectedId) ?? null,
    [inventories, selectedId],
  );

  const activeProducts = useMemo(() => products.filter((p) => p.active), [products]);

  const refresh = useCallback(async () => {
    const [{ data: evs }, { data: invs }, { data: prods }] = await Promise.all([
      api.get<TicketingEvent[]>("/boston-city-hall/ticketing/events"),
      api.get<BchBarEventInventory[]>("/boston-city-hall/bar/event-inventories"),
      api.get<BchBarProduct[]>("/boston-city-hall/bar/products"),
    ]);
    setEvents(Array.isArray(evs) ? evs : []);
    setInventories(Array.isArray(invs) ? invs : []);
    setProducts(Array.isArray(prods) ? prods : []);
  }, []);

  const loadSummary = useCallback(async (id: string) => {
    if (!id) {
      setSummary(null);
      return;
    }
    const { data } = await api.get<BchBarEventInventorySummary>(
      `/boston-city-hall/bar/event-inventories/${id}/summary`,
    );
    setSummary(data);
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        await refresh();
      } catch (e) {
        setFeedback({
          open: true,
          title: "Erro",
          message: e instanceof Error ? e.message : "Falha ao carregar.",
          variant: "error",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  useEffect(() => {
    if (selectedId) void loadSummary(selectedId).catch(() => setSummary(null));
  }, [selectedId, loadSummary]);

  const openInventory = async () => {
    if (!openEventId) return;
    setBusy(true);
    try {
      const { data } = await api.post<BchBarEventInventory>("/boston-city-hall/bar/event-inventories", {
        eventId: openEventId,
      });
      await refresh();
      setSelectedId(data.id);
      setFeedback({ open: true, title: "Aberto", message: "Estoque de evento ativo.", variant: "success" });
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível abrir.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const runLines = async (action: "allocate" | "replenish" | "return") => {
    if (!selected || !lineProductId || !lineQty) return;
    setBusy(true);
    try {
      const path = `/boston-city-hall/bar/event-inventories/${selected.id}/${action === "allocate" ? "allocate" : action === "replenish" ? "replenish" : "return"}`;
      await api.post(path, {
        lines: [{ productId: lineProductId, quantity: lineQty }],
      });
      await refresh();
      await loadSummary(selected.id);
      setFeedback({ open: true, title: "Registrado", message: "Movimentação concluída.", variant: "success" });
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Operação falhou.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const closeInventory = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await api.post(`/boston-city-hall/bar/event-inventories/${selected.id}/close`, {});
      await refresh();
      await loadSummary(selected.id);
      setFeedback({ open: true, title: "Fechado", message: "Estoque de evento encerrado.", variant: "success" });
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível fechar.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/eventos/boston-city-hall/bar"
        className="inline-flex min-h-[44px] items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao bar
      </Link>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Abrir estoque de evento</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Label className="text-xs">Evento</Label>
            <NativeSelect
              className="mt-1 min-h-[44px] w-full"
              value={openEventId}
              onChange={(e) => setOpenEventId(e.target.value)}
            >
              <option value="">Selecione…</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <Button type="button" className="min-h-[44px]" disabled={busy || !openEventId} onClick={() => void openInventory()}>
            Abrir
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Inventários</CardTitle>
        </CardHeader>
        <CardContent>
          <NativeSelect
            className="min-h-[44px] w-full max-w-xl"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="">Selecione um inventário…</option>
            {inventories.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.eventTitle ?? inv.eventId} — {inv.locationName} ({inv.status})
              </option>
            ))}
          </NativeSelect>
          {selected ? (
            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
              <p>
                Status: <span className="text-foreground">{selected.status}</span> · Local:{" "}
                {selected.locationName}
              </p>
              {selected.openContainersUnresolved > 0 ? (
                <p className="text-amber-400">
                  {selected.openContainersUnresolved} garrafa(s) aberta(s) pendente(s) — resolva antes de fechar.
                </p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {selected?.status === "active" ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Movimentação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Produto</Label>
                <NativeSelect
                  className="mt-1 min-h-[44px] w-full"
                  value={lineProductId}
                  onChange={(e) => setLineProductId(e.target.value)}
                >
                  <option value="">Selecione…</option>
                  {activeProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div>
                <Label className="text-xs">Quantidade</Label>
                <Input
                  className="mt-1 min-h-[44px] text-foreground"
                  value={lineQty}
                  onChange={(e) => setLineQty(e.target.value)}
                  inputMode="decimal"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" className="min-h-[44px]" disabled={busy} onClick={() => void runLines("allocate")}>
                Alocação inicial
              </Button>
              <Button type="button" variant="secondary" className="min-h-[44px]" disabled={busy} onClick={() => void runLines("replenish")}>
                Reposição
              </Button>
              <Button type="button" variant="outline" className="min-h-[44px]" disabled={busy} onClick={() => void runLines("return")}>
                Devolver fechado
              </Button>
              <Button type="button" className="min-h-[44px]" disabled={busy} onClick={() => void closeInventory()}>
                Fechar inventário
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {summary && summary.lines.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Resumo operacional</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Alocado</TableHead>
                  <TableHead>Reposição</TableHead>
                  <TableHead>Saldo fechado</TableHead>
                  <TableHead>Vendas POS</TableHead>
                  <TableHead>Devolvido</TableHead>
                  <TableHead>Abertas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.lines.map((line) => (
                  <TableRow key={line.productId}>
                    <TableCell>{line.productName}</TableCell>
                    <TableCell>{line.initiallyAllocated}</TableCell>
                    <TableCell>{line.replenished}</TableCell>
                    <TableCell>{line.currentClosedBalance}</TableCell>
                    <TableCell>{line.posSold}</TableCell>
                    <TableCell>{line.returnedClosed}</TableCell>
                    <TableCell>{line.openContainersCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.variant}
      />
    </div>
  );
}
