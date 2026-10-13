"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FeedbackModal } from "@/components/ui/feedback-modal";
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
import type { EventTicketingDetail, EventTicketingEventListItem, EventTicketType } from "@/types/boston-city-hall";
import { COMPLIMENTARY_REASON_OPTIONS } from "@/types/boston-city-hall";
import { BchEventListDiagnostics } from "@/components/dashboard/boston-city-hall/BchEventListDiagnostics";
import { BchEventSelectField } from "@/components/dashboard/boston-city-hall/BchEventSelectField";
import { useBchHubEventBinding } from "@/components/dashboard/boston-city-hall/use-bch-hub-event-binding";

type GuestRow = {
  id: string;
  guestName: string;
  reason: string;
  ticketTypeName: string;
  quantity: number;
  ticketsIssued: number;
  usedCount: number;
  remainingCount: number;
  status: string;
  createdAt: string;
};

export function BostonCityHallTicketComplimentary() {
  const {
    events,
    eventId,
    setEventId,
    loading: loadingEvents,
    error: eventsError,
    rawCount,
    smokeHiddenCount,
    reload: reloadEvents,
  } = useBchHubEventBinding();
  const [types, setTypes] = useState<EventTicketType[]>([]);
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterQ, setFilterQ] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("guest");
  const [ticketTypeId, setTicketTypeId] = useState("");
  const [ticketLotId, setTicketLotId] = useState("");
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: "success" | "error";
  }>({ open: false, title: "", message: "", variant: "success" });

  const loadTypes = useCallback(async (ev: string) => {
    if (!ev) {
      setTypes([]);
      return;
    }
    const res = await api.get<EventTicketingDetail>(`/boston-city-hall/ticketing/events/${ev}`);
    setTypes(Array.isArray(res.data?.types) ? res.data.types : []);
  }, []);

  const loadGuests = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ eventId });
      if (filterQ.trim()) params.set("q", filterQ.trim());
      const res = await api.get<GuestRow[]>(`/boston-city-hall/ticketing/complimentary?${params}`);
      setGuests(Array.isArray(res.data) ? res.data : []);
    } finally {
      setLoading(false);
    }
  }, [eventId, filterQ]);

  useEffect(() => {
    void loadTypes(eventId);
    setTicketTypeId("");
    setTicketLotId("");
  }, [eventId, loadTypes]);

  useEffect(() => {
    void loadGuests();
  }, [loadGuests]);

  const selectedType = types.find((t) => t.id === ticketTypeId);

  const submit = async () => {
    if (!eventId || !ticketTypeId || !guestName.trim()) return;
    setSaving(true);
    try {
      await api.post("/boston-city-hall/ticketing/complimentary", {
        eventId,
        ticketTypeId,
        ticketLotId: selectedType?.usesLots ? ticketLotId || undefined : undefined,
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim() || undefined,
        quantity: Number.parseInt(quantity, 10) || 1,
        reason,
      });
      setGuestName("");
      setGuestEmail("");
      setQuantity("1");
      await loadGuests();
      setFeedback({
        open: true,
        title: "Cortesia emitida",
        message: "Ingressos individuais gerados com QR.",
        variant: "success",
      });
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Falha ao emitir cortesia.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {eventsError || (!loadingEvents && events.length === 0) ? (
        <BchEventListDiagnostics
          error={eventsError}
          rawCount={rawCount}
          operationalCount={events.length}
          smokeHiddenCount={smokeHiddenCount}
          onRetry={() => void reloadEvents()}
        />
      ) : null}
      <Card>
        <CardContent className="space-y-3 pt-6">
          <BchEventSelectField events={events} value={eventId} onChange={setEventId} placeholder="Evento…" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Convidado</Label>
              <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} className="text-foreground" />
            </div>
            <div className="space-y-1">
              <Label>E-mail</Label>
              <Input value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} className="text-foreground" />
            </div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <NativeSelect value={ticketTypeId} onChange={(e) => setTicketTypeId(e.target.value)}>
                <option value="">Selecione…</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            {selectedType?.usesLots ? (
              <div className="space-y-1">
                <Label>Lote</Label>
                <NativeSelect value={ticketLotId} onChange={(e) => setTicketLotId(e.target.value)}>
                  <option value="">Selecione…</option>
                  {selectedType.lots.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            ) : null}
            <div className="space-y-1">
              <Label>Quantidade</Label>
              <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} className="text-foreground" />
            </div>
            <div className="space-y-1">
              <Label>Motivo</Label>
              <NativeSelect value={reason} onChange={(e) => setReason(e.target.value)}>
                {COMPLIMENTARY_REASON_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
          <Button type="button" disabled={saving || !eventId} onClick={() => void submit()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Emitir cortesia"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <Label>Buscar guest list</Label>
              <Input value={filterQ} onChange={(e) => setFilterQ(e.target.value)} className="text-foreground" />
            </div>
            <Button type="button" variant="outline" onClick={() => void loadGuests()}>
              Atualizar
            </Button>
          </div>
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Convidado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Usados</TableHead>
                  <TableHead>Restantes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guests.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell>{g.guestName}</TableCell>
                    <TableCell>{g.ticketTypeName}</TableCell>
                    <TableCell>{g.reason}</TableCell>
                    <TableCell>{g.ticketsIssued}/{g.quantity}</TableCell>
                    <TableCell>{g.usedCount}</TableCell>
                    <TableCell>{g.remainingCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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
