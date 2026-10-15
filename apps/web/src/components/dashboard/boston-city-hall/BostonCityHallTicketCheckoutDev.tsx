"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Copy, Loader2, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { EventTicketOrderDetail, EventTicketingDetail } from "@/types/boston-city-hall";
import {
  EVENT_TICKETING_SALES_STATUS_LABEL,
  EVENT_TICKET_ORDER_STATUS_LABEL,
  formatTicketingMoney,
} from "@/types/boston-city-hall";
import { useBchHubEventBinding } from "@/components/dashboard/boston-city-hall/use-bch-hub-event-binding";
import { BCH_BASE } from "@/components/dashboard/boston-city-hall/bch-navigation.config";
import { BCH_BTN_PRIMARY, BCH_BTN_SECONDARY, BCH_CARD } from "@/components/dashboard/boston-city-hall/bch-ui-classes";
import { cn } from "@/lib/utils";

type Line = { ticketTypeId: string; quantity: string };

export function BostonCityHallTicketCheckoutDev() {
  const { events, eventId, setEventId } = useBchHubEventBinding();
  const [catalog, setCatalog] = useState<EventTicketingDetail | null>(null);
  const [lines, setLines] = useState<Line[]>([{ ticketTypeId: "", quantity: "1" }]);
  const [name, setName] = useState("Comprador teste");
  const [email, setEmail] = useState("checkin-sandbox@bostoncityhall.local");
  const [phone, setPhone] = useState("");
  const [document, setDocument] = useState("");
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [result, setResult] = useState<EventTicketOrderDetail | null>(null);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: "success" | "error" | "info";
  }>({ open: false, title: "", message: "", variant: "success" });

  const loadCatalog = useCallback(async (id: string) => {
    if (!id) {
      setCatalog(null);
      return;
    }
    const res = await api.get<EventTicketingDetail>(`/boston-city-hall/ticketing/events/${id}`);
    setCatalog(res.data);
  }, []);

  const reloadOrder = useCallback(async (orderId: string) => {
    const res = await api.get<EventTicketOrderDetail>(`/boston-city-hall/ticketing/orders/${orderId}`);
    setResult(res.data);
    return res.data;
  }, []);

  useEffect(() => {
    void loadCatalog(eventId);
  }, [eventId, loadCatalog]);

  const showFeedback = (title: string, message: string, variant: "success" | "error" | "info" = "success") => {
    setFeedback({ open: true, title, message, variant });
  };

  const copyText = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showFeedback("Copiado", `${label} copiado para a área de transferência.`, "info");
    } catch {
      showFeedback("Não foi possível copiar", "Copie manualmente o texto exibido.", "error");
    }
  };

  const submit = async () => {
    if (!eventId) return;
    setLoading(true);
    setResult(null);
    try {
      const items = lines
        .filter((l) => l.ticketTypeId && Number.parseInt(l.quantity, 10) > 0)
        .map((l) => ({ ticketTypeId: l.ticketTypeId, quantity: l.quantity }));
      const res = await api.post<EventTicketOrderDetail>("/boston-city-hall/ticketing/orders", {
        eventId,
        customer: { name, email, phone: phone || undefined, document: document || undefined },
        items,
      });
      setResult(res.data);
      showFeedback(
        "Pedido criado (hold)",
        `Número ${res.data.orderNumber}. Registre o pagamento abaixo para emitir ingressos.`,
      );
    } catch (e) {
      showFeedback(
        "Erro",
        e instanceof Error ? e.message : "Não foi possível criar o pedido.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const confirmManualPayment = async () => {
    if (!result?.id) return;
    setPaying(true);
    try {
      const res = await api.post<{ order: EventTicketOrderDetail }>(
        `/boston-city-hall/ticketing/orders/${result.id}/manual-payment`,
        {
          paymentMethod: "cash",
          manualReference: "sandbox-local",
          externalProviderLabel: "Laboratório BCH",
        },
      );
      setResult(res.data.order);
      const ticketCount = res.data.order.tickets?.length ?? 0;
      showFeedback(
        "Ingressos emitidos",
        ticketCount > 0
          ? `${ticketCount} ingresso(s) prontos. Use o código ou o payload QR no check-in (ou escaneie com o leitor NETUM).`
          : "Pagamento registrado. Abra o pedido em Pedidos se não vir ingressos.",
      );
    } catch (e) {
      showFeedback(
        "Erro no pagamento",
        e instanceof Error ? e.message : "Não foi possível confirmar o pedido.",
        "error",
      );
    } finally {
      setPaying(false);
    }
  };

  const activeTypes = catalog?.types.filter((t) => t.active) ?? [];
  const checkinHref = `${BCH_BASE}/ticketing?tab=checkin${eventId ? `&eventId=${encodeURIComponent(eventId)}` : ""}`;

  return (
    <div className="space-y-4">
      <section className={cn(BCH_CARD, "space-y-2 text-sm text-slate-300")}>
        <p className="font-medium text-slate-100">Laboratório — venda + chegada no evento</p>
        <ol className="list-decimal space-y-1 pl-5 text-slate-400">
          <li>Crie o pedido e confirme com pagamento manual (emite ingressos).</li>
          <li>Copie o <strong className="text-slate-200">payload QR</strong> ou imprima o QR do pedido.</li>
          <li>
            No check-in, foque o campo <strong className="text-slate-200">Leitura QR / código</strong> e escaneie
            (leitor NETUM envia o texto + Enter).
          </li>
        </ol>
        <Button asChild variant="outline" size="sm" className={cn("min-h-[40px]", BCH_BTN_SECONDARY)}>
          <Link href={checkinHref}>Ir para check-in</Link>
        </Button>
      </section>

      <section className={cn(BCH_CARD, "space-y-4")}>
        <h2 className="text-base font-semibold text-slate-100">1. Simular venda</h2>
        <div className="space-y-1">
          <Label>Evento</Label>
          <NativeSelect value={eventId} onChange={(e) => setEventId(e.target.value)}>
            <option value="">Selecione…</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </NativeSelect>
        </div>

        {catalog && !catalog.ticketingEnabled ? (
          <p className="text-sm text-amber-200">Ingressos não habilitados neste evento.</p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Nome</Label>
            <Input className="text-foreground" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>E-mail</Label>
            <Input
              type="email"
              className="text-foreground"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Telefone</Label>
            <Input className="text-foreground" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Documento (opcional)</Label>
            <Input className="text-foreground" value={document} onChange={(e) => setDocument(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Itens</Label>
          {lines.map((line, idx) => (
            <div key={idx} className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <NativeSelect
                className="flex-1"
                value={line.ticketTypeId}
                onChange={(e) => {
                  const next = [...lines];
                  next[idx] = { ...next[idx], ticketTypeId: e.target.value };
                  setLines(next);
                }}
              >
                <option value="">Tipo…</option>
                {activeTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {formatTicketingMoney(t.currentPrice)} (
                    {EVENT_TICKETING_SALES_STATUS_LABEL[t.salesStatus]}, disp. {t.available})
                  </option>
                ))}
              </NativeSelect>
              <Input
                className="w-full text-foreground sm:w-24"
                inputMode="numeric"
                value={line.quantity}
                onChange={(e) => {
                  const next = [...lines];
                  next[idx] = { ...next[idx], quantity: e.target.value };
                  setLines(next);
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="min-h-[44px] min-w-[44px] shrink-0"
                onClick={() => setLines(lines.filter((_, i) => i !== idx))}
                disabled={lines.length <= 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={BCH_BTN_SECONDARY}
            onClick={() => setLines([...lines, { ticketTypeId: "", quantity: "1" }])}
          >
            <Plus className="mr-1 h-4 w-4" />
            Linha
          </Button>
        </div>

        <Button
          type="button"
          className={cn("min-h-[44px]", BCH_BTN_PRIMARY)}
          disabled={loading || !eventId || !name.trim() || !email.trim()}
          onClick={() => void submit()}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar pedido (hold)"}
        </Button>
      </section>

      {result ? (
        <section className={cn(BCH_CARD, "space-y-4")}>
          <h2 className="text-base font-semibold text-slate-100">2. Confirmar e emitir ingressos</h2>
          <div className="text-sm text-slate-300">
            <p className="font-medium text-slate-100">{result.orderNumber}</p>
            <p>
              Status: {EVENT_TICKET_ORDER_STATUS_LABEL[result.status] ?? result.status} · Total:{" "}
              {formatTicketingMoney(result.total)}
            </p>
            {result.holdExpiresAt ? (
              <p className="text-xs text-slate-500">
                Hold até {new Date(result.holdExpiresAt).toLocaleString("pt-BR")}
              </p>
            ) : null}
          </div>

          {result.status === "pending" ? (
            <Button
              type="button"
              className={cn("min-h-[44px]", BCH_BTN_PRIMARY)}
              disabled={paying}
              onClick={() => void confirmManualPayment()}
            >
              {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Registrar pagamento e emitir ingressos"}
            </Button>
          ) : null}

          {result.status === "confirmed" && result.tickets.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Credenciais para o leitor (3. Check-in)
              </p>
              <ul className="space-y-3">
                {result.tickets.map((t) => (
                  <li
                    key={t.id}
                    className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-3 text-sm"
                  >
                    <p className="font-medium text-slate-100">
                      {t.ticketTypeName} · {t.holderName}
                    </p>
                    <p className="mt-1 font-mono text-xs text-sky-200/90 break-all">{t.ticketCode}</p>
                    <p className="mt-2 font-mono text-[11px] text-slate-400 break-all">{t.qrPayload}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={cn("min-h-[40px] gap-1", BCH_BTN_SECONDARY)}
                        onClick={() => void copyText("Código BCH", t.ticketCode)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Código
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={cn("min-h-[40px] gap-1", BCH_BTN_SECONDARY)}
                        onClick={() => void copyText("Payload QR", t.qrPayload)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Payload QR
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-500">
                O QR impresso contém o payload <code className="text-slate-400">CUP360-T1:…</code>. O escaner NETUM
                deve digitar essa string no campo de leitura (modo teclado USB).
              </p>
            </div>
          ) : null}

          {result.status === "confirmed" && result.tickets.length === 0 ? (
            <Button type="button" variant="outline" size="sm" onClick={() => void reloadOrder(result.id)}>
              Recarregar ingressos
            </Button>
          ) : null}
        </section>
      ) : null}

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.variant === "info" ? "success" : feedback.variant}
      />
    </div>
  );
}
