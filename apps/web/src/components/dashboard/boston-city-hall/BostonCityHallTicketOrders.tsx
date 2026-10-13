"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Search } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { bchEventSetupPath } from "@/components/dashboard/boston-city-hall/bch-event-setup-path";
import type {
  EventTicketOrderDetail,
  EventTicketOrderListItem,
  EventTicketingEventListItem,
} from "@/types/boston-city-hall";
import {
  EVENT_TICKET_ORDER_STATUS_LABEL,
  EVENT_TICKET_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  formatTicketingMoney,
  type EventTicketIssued,
} from "@/types/boston-city-hall";

const MANUAL_PAYMENT_METHODS = [
  { value: "cash", label: "Dinheiro" },
  { value: "check", label: "Cheque" },
  { value: "bank_transfer", label: "Transferência bancária" },
  { value: "other", label: "Outro" },
] as const;

export function BostonCityHallTicketOrders() {
  const [events, setEvents] = useState<EventTicketingEventListItem[]>([]);
  const [orders, setOrders] = useState<EventTicketOrderListItem[]>([]);
  const [eventFilter, setEventFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<EventTicketOrderDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualMethod, setManualMethod] = useState("cash");
  const [manualReference, setManualReference] = useState("");
  const [manualExternalLabel, setManualExternalLabel] = useState("");
  const [manualSaving, setManualSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: "success" | "error";
  }>({ open: false, title: "", message: "", variant: "success" });
  const [qrTicket, setQrTicket] = useState<EventTicketIssued | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const loadEvents = useCallback(async () => {
    const res = await api.get<EventTicketingEventListItem[]>("/boston-city-hall/ticketing/events");
    setEvents(Array.isArray(res.data) ? res.data : []);
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (eventFilter) params.set("eventId", eventFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchDebounced) params.set("q", searchDebounced);
      const qs = params.toString();
      const res = await api.get<EventTicketOrderListItem[]>(
        `/boston-city-hall/ticketing/orders${qs ? `?${qs}` : ""}`,
      );
      setOrders(Array.isArray(res.data) ? res.data : []);
    } finally {
      setLoading(false);
    }
  }, [eventFilter, statusFilter, searchDebounced]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const openTicketQr = async (ticket: EventTicketIssued) => {
    setQrTicket(ticket);
    setQrOpen(true);
    setQrLoading(true);
    if (qrImageUrl) {
      URL.revokeObjectURL(qrImageUrl);
      setQrImageUrl(null);
    }
    try {
      const res = await fetch(`/api/boston-city-hall/ticketing/tickets/${ticket.id}/qr`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Não foi possível carregar o QR.");
      const blob = await res.blob();
      setQrImageUrl(URL.createObjectURL(blob));
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Falha ao carregar QR.",
        variant: "error",
      });
      setQrOpen(false);
    } finally {
      setQrLoading(false);
    }
  };

  const openDetail = async (id: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const res = await api.get<EventTicketOrderDetail>(`/boston-city-hall/ticketing/orders/${id}`);
      setDetail(res.data);
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível carregar o pedido.",
        variant: "error",
      });
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const submitManualPayment = async () => {
    if (!detail) return;
    setManualSaving(true);
    try {
      const res = await api.post<{ order: EventTicketOrderDetail; confirmation: { reconciliationRequired: boolean; outcome: string } }>(
        `/boston-city-hall/ticketing/orders/${detail.id}/manual-payment`,
        {
          paymentMethod: manualMethod,
          manualReference: manualReference.trim() || undefined,
          externalProviderLabel: manualExternalLabel.trim() || undefined,
        },
      );
      setDetail(res.data.order);
      setManualOpen(false);
      await loadOrders();
      const needsRecon = res.data.confirmation?.reconciliationRequired;
      setFeedback({
        open: true,
        title: needsRecon ? "Pagamento registrado" : "Pedido confirmado",
        message: needsRecon
          ? "Pagamento quitado, mas o hold expirou ou o pedido não pôde ser confirmado. Reconciliação necessária."
          : "Pagamento manual registrado e pedido confirmado.",
        variant: needsRecon ? "error" : "success",
      });
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível registrar o pagamento.",
        variant: "error",
      });
    } finally {
      setManualSaving(false);
    }
  };

  const cancelOrder = async () => {
    if (!detail || detail.status !== "pending") return;
    setCancelling(true);
    try {
      const res = await api.post<EventTicketOrderDetail>(
        `/boston-city-hall/ticketing/orders/${detail.id}/cancel`,
        {},
      );
      setDetail(res.data);
      await loadOrders();
      setFeedback({
        open: true,
        title: "Pedido cancelado",
        message: "O hold foi liberado.",
        variant: "success",
      });
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Cancelamento falhou.",
        variant: "error",
      });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-[200px] flex-1 space-y-1">
          <Label>Evento</Label>
          <NativeSelect value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
            <option value="">Todos</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="min-w-[160px] space-y-1">
          <Label>Status</Label>
          <NativeSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Todos</option>
            <option value="pending">Pendente</option>
            <option value="confirmed">Confirmado</option>
            <option value="cancelled">Cancelado</option>
            <option value="expired">Expirado</option>
          </NativeSelect>
        </div>
        <div className="min-w-[200px] flex-1 space-y-1">
          <Label>Busca</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pedido ou cliente"
            />
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Hold até</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Nenhum pedido.
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">{o.orderNumber}</TableCell>
                      <TableCell>{o.eventName}</TableCell>
                      <TableCell>
                        <div>{o.customerName}</div>
                        <div className="text-xs text-muted-foreground">{o.customerEmail}</div>
                      </TableCell>
                      <TableCell>{formatTicketingMoney(o.total, o.currency)}</TableCell>
                      <TableCell>{EVENT_TICKET_ORDER_STATUS_LABEL[o.status]}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {o.holdExpiresAt
                          ? new Date(o.holdExpiresAt).toLocaleString("pt-BR")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => void openDetail(o.id)}>
                          Abrir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail?.orderNumber ?? "Pedido"}</DialogTitle>
          </DialogHeader>
          {detailLoading || !detail ? (
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-medium">{detail.eventName}</p>
                <p className="text-muted-foreground">
                  Status: {EVENT_TICKET_ORDER_STATUS_LABEL[detail.status]}
                </p>
                {detail.holdExpiresAt ? (
                  <p className="text-muted-foreground">
                    Hold: {new Date(detail.holdExpiresAt).toLocaleString("pt-BR")}
                  </p>
                ) : null}
              </div>
              <div>
                <p className="font-medium">{detail.customerName}</p>
                <p>{detail.customerEmail}</p>
                {detail.customerPhone ? <p>{detail.customerPhone}</p> : null}
                {detail.customerDocument ? <p>{detail.customerDocument}</p> : null}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Preço</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>
                        {it.ticketTypeName}
                        {it.lotName ? (
                          <span className="text-muted-foreground"> · {it.lotName}</span>
                        ) : null}
                      </TableCell>
                      <TableCell>{it.quantity}</TableCell>
                      <TableCell>{formatTicketingMoney(it.totalPrice, detail.currency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-right font-semibold">
                Total: {formatTicketingMoney(detail.total, detail.currency)}
              </p>
              {detail.status === "confirmed" || detail.financeProjection ? (
                <div className="rounded-md border border-border p-3 space-y-1">
                  <p className="font-medium">Financeiro (projeção)</p>
                  {detail.financeProjection ? (
                    <>
                      <p className="text-muted-foreground">
                        Lançamento:{" "}
                        <span className="font-mono text-xs">{detail.financeProjection.id}</span>
                      </p>
                      <p className="text-muted-foreground">
                        Status: {detail.financeProjection.status}
                      </p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">Projeção ainda não gerada.</p>
                  )}
                </div>
              ) : null}
              {detail.tickets.length > 0 ? (
                <div className="space-y-2">
                  <p className="font-medium">Ingressos emitidos ({detail.tickets.length})</p>
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-border p-2">
                    {detail.tickets.map((t) => (
                      <div
                        key={t.id}
                        className="flex flex-col gap-1 border-b border-border/60 pb-2 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 text-xs sm:text-sm">
                          <p className="font-mono font-medium">{t.ticketCode}</p>
                          <p className="text-muted-foreground">
                            {t.ticketTypeName}
                            {t.lotName ? ` · ${t.lotName}` : ""}
                          </p>
                          <p className="text-muted-foreground">
                            {EVENT_TICKET_STATUS_LABEL[t.status] ?? t.status} · {t.holderName} ·{" "}
                            {new Date(t.issuedAt).toLocaleString("pt-BR")}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => void openTicketQr(t)}
                        >
                          Ver QR
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : detail.status === "confirmed" ? (
                <p className="text-sm text-muted-foreground">Nenhum ingresso emitido ainda.</p>
              ) : null}
              {detail.payment ? (
                <div className="rounded-md border border-border p-3 space-y-1">
                  <p className="font-medium">Pagamento (CUP360)</p>
                  <p className="text-muted-foreground">
                    Status: {PAYMENT_STATUS_LABEL[detail.payment.status] ?? detail.payment.status}
                  </p>
                  {detail.payment.paymentMethod ? (
                    <p className="text-muted-foreground">Método: {detail.payment.paymentMethod}</p>
                  ) : null}
                  {detail.payment.paidAt ? (
                    <p className="text-muted-foreground">
                      Pago em: {new Date(detail.payment.paidAt).toLocaleString("pt-BR")}
                    </p>
                  ) : null}
                  {detail.payment.manualReference ? (
                    <p className="text-muted-foreground">Ref.: {detail.payment.manualReference}</p>
                  ) : null}
                  {detail.payment.externalProviderLabel ? (
                    <p className="text-muted-foreground">{detail.payment.externalProviderLabel}</p>
                  ) : null}
                </div>
              ) : null}
              <Button variant="outline" size="sm" asChild>
                <Link href={bchEventSetupPath(detail.eventId)}>Event Setup</Link>
              </Button>
            </div>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:flex-wrap">
            {detail?.status === "pending" && detail.payment?.status !== "paid" ? (
              <Button type="button" disabled={manualSaving} onClick={() => setManualOpen(true)}>
                Registrar pagamento manual
              </Button>
            ) : null}
            {detail?.status === "pending" ? (
              <Button variant="destructive" disabled={cancelling} onClick={() => void cancelOrder()}>
                {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancelar pedido"}
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={qrOpen}
        onOpenChange={(open) => {
          setQrOpen(open);
          if (!open) {
            setQrTicket(null);
            if (qrImageUrl) URL.revokeObjectURL(qrImageUrl);
            setQrImageUrl(null);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{qrTicket?.ticketCode ?? "QR do ingresso"}</DialogTitle>
          </DialogHeader>
          {qrLoading ? (
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          ) : qrImageUrl ? (
            <div className="flex flex-col items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrImageUrl} alt="QR do ingresso" className="h-64 w-64 rounded-md bg-white p-2" />
              <p className="break-all text-center font-mono text-xs text-muted-foreground">
                {qrTicket?.qrPayload}
              </p>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setQrOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pagamento manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Método</Label>
              <NativeSelect value={manualMethod} onChange={(e) => setManualMethod(e.target.value)}>
                {MANUAL_PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <Label>Referência</Label>
              <Input value={manualReference} onChange={(e) => setManualReference(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Rótulo externo (Zelle, wire…)</Label>
              <Input
                value={manualExternalLabel}
                onChange={(e) => setManualExternalLabel(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setManualOpen(false)}>
              Voltar
            </Button>
            <Button type="button" disabled={manualSaving} onClick={() => void submitManualPayment()}>
              {manualSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar pagamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
