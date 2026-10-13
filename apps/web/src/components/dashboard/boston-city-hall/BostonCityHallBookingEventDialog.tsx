"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { bchEventSetupPathWithBooking } from "@/components/dashboard/boston-city-hall/bch-event-setup-path";
import type { VenueBookingEventPrefill, VenueBookingEventRef } from "@/types/boston-city-hall";
import { EVENT_STATUS_LABEL } from "@/types/boston-city-hall";

function toDateInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Props = {
  bookingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (event: VenueBookingEventRef) => void;
  onError: (message: string) => void;
};

export function BostonCityHallBookingEventDialog({
  bookingId,
  open,
  onOpenChange,
  onCreated,
  onError,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prefill, setPrefill] = useState<VenueBookingEventPrefill | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const category = "other" as const;

  const load = useCallback(async () => {
    if (!bookingId) return;
    setLoading(true);
    try {
      const res = await api.get<VenueBookingEventPrefill>(
        `/boston-city-hall/bookings/${bookingId}/event-prefill`,
      );
      setPrefill(res.data);
      setName(res.data.suggested.name);
      setDescription(res.data.suggested.description);
      setStartDate(toDateInput(res.data.suggested.startDate));
      setEndDate(toDateInput(res.data.suggested.endDate));
    } catch (e) {
      onError(e instanceof Error ? e.message : "Não foi possível carregar sugestões.");
      setPrefill(null);
    } finally {
      setLoading(false);
    }
  }, [bookingId, onError]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const submit = async () => {
    if (!name.trim()) {
      onError("Informe o nome do evento.");
      return;
    }
    setSaving(true);
    try {
      const res = await api.post<VenueBookingEventRef>(
        `/boston-city-hall/bookings/${bookingId}/event`,
        {
          name: name.trim(),
          description: description.trim() || undefined,
          startDate: startDate ? `${startDate}T12:00:00.000Z` : undefined,
          endDate: endDate ? `${endDate}T23:59:59.000Z` : undefined,
          category,
        },
      );
      onCreated(res.data);
      onOpenChange(false);
      router.push(bchEventSetupPathWithBooking(res.data.id, bookingId));
    } catch (e) {
      onError(e instanceof Error ? e.message : "Falha ao criar evento.");
    } finally {
      setSaving(false);
    }
  };

  if (prefill?.existingEvent) {
    const ev = prefill.existingEvent;
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Evento vinculado</DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            {ev.name} · {EVENT_STATUS_LABEL[ev.status] ?? ev.status}
          </p>
          <Button asChild className="min-h-[44px]">
            <Link href={bchEventSetupPathWithBooking(ev.id, bookingId)}>Preparar evento</Link>
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar evento a partir da reserva</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : prefill && !prefill.eligible ? (
          <p className="text-sm text-amber-200">
            Reserva não elegível. Apenas reservas confirmadas podem gerar evento.
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              O evento será criado como rascunho (não publicado). Local sugerido:{" "}
              {prefill?.suggested.locationLabel}
            </p>
            <div className="grid gap-3 py-2">
              <div className="space-y-2">
                <Label htmlFor="ev-name">Nome *</Label>
                <Input id="ev-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ev-start">Início</Label>
                  <Input
                    id="ev-start"
                    type="date"
                    className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ev-end">Fim</Label>
                  <Input
                    id="ev-end"
                    type="date"
                    className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ev-desc">Descrição (opcional)</Label>
                <Textarea
                  id="ev-desc"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={saving || !prefill?.eligible}
                onClick={() => void submit()}
                className="min-h-[44px]"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Criar evento
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
