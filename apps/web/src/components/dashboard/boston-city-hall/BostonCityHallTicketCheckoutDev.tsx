"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { EventTicketOrderDetail, EventTicketingDetail } from "@/types/boston-city-hall";
import { EVENT_TICKETING_SALES_STATUS_LABEL, formatTicketingMoney } from "@/types/boston-city-hall";
import { useBchHubEventBinding } from "@/components/dashboard/boston-city-hall/use-bch-hub-event-binding";

type Line = { ticketTypeId: string; quantity: string };

export function BostonCityHallTicketCheckoutDev() {
  const { events, eventId, setEventId } = useBchHubEventBinding();
  const [catalog, setCatalog] = useState<EventTicketingDetail | null>(null);
  const [lines, setLines] = useState<Line[]>([{ ticketTypeId: "", quantity: "1" }]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [document, setDocument] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EventTicketOrderDetail | null>(null);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: "success" | "error";
  }>({ open: false, title: "", message: "", variant: "success" });

  const loadCatalog = useCallback(async (id: string) => {
    if (!id) {
      setCatalog(null);
      return;
    }
    const res = await api.get<EventTicketingDetail>(`/boston-city-hall/ticketing/events/${id}`);
    setCatalog(res.data);
  }, []);

  useEffect(() => {
    void loadCatalog(eventId);
  }, [eventId, loadCatalog]);

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
      setFeedback({
        open: true,
        title: "Pedido criado",
        message: `Hold até ${res.data.holdExpiresAt ? new Date(res.data.holdExpiresAt).toLocaleString("pt-BR") : "—"}`,
        variant: "success",
      });
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível criar o pedido.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const activeTypes = catalog?.types.filter((t) => t.active) ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Checkout</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Documento (opcional)</Label>
              <Input value={document} onChange={(e) => setDocument(e.target.value)} />
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
                  className="w-full sm:w-24"
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
              onClick={() => setLines([...lines, { ticketTypeId: "", quantity: "1" }])}
            >
              <Plus className="mr-1 h-4 w-4" />
              Linha
            </Button>
          </div>

          <Button
            type="button"
            disabled={loading || !eventId || !name.trim() || !email.trim()}
            onClick={() => void submit()}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar pedido (hold)"}
          </Button>

          {result ? (
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
              <p className="font-medium">{result.orderNumber}</p>
              <p>Total: {formatTicketingMoney(result.total)}</p>
              <p className="text-muted-foreground">ID: {result.id}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

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
