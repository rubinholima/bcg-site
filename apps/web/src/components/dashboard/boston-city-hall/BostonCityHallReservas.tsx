"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseDateTimeLocalBrazil, toDateTimeLocalBrazil, BRAZIL_TZ } from "@/lib/brazil-time";
import type { VenueBooking, VenueSpace } from "@/types/boston-city-hall";
import { BOOKING_STATUSES, BOOKING_STATUS_LABEL } from "@/types/boston-city-hall";

type FormState = {
  id?: string;
  spaceId: string;
  title: string;
  eventType: string;
  startAt: string;
  endAt: string;
  status: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  guestCount: string;
  notes: string;
};

const emptyForm = (): FormState => ({
  spaceId: "",
  title: "",
  eventType: "",
  startAt: "",
  endAt: "",
  status: "hold",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  guestCount: "",
  notes: "",
});

function toLocalInput(iso: string): string {
  return toDateTimeLocalBrazil(iso);
}

function formatRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const opts = { timeZone: BRAZIL_TZ } as const;
  return `${s.toLocaleString("pt-BR", opts)} — ${e.toLocaleTimeString("pt-BR", { ...opts, hour: "2-digit", minute: "2-digit" })}`;
}

export function BostonCityHallReservas() {
  const searchParams = useSearchParams();
  const editFromUrl = searchParams.get("edit");
  const openedEditRef = useRef<string | null>(null);
  const [spaces, setSpaces] = useState<VenueSpace[]>([]);
  const [bookings, setBookings] = useState<VenueBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [spacesRes, bookingsRes] = await Promise.all([
        api.get<VenueSpace[]>("/boston-city-hall/spaces"),
        api.get<VenueBooking[]>("/boston-city-hall/bookings"),
      ]);
      setSpaces(Array.isArray(spacesRes.data) ? spacesRes.data : []);
      setBookings(Array.isArray(bookingsRes.data) ? bookingsRes.data : []);
    } catch {
      setSpaces([]);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!editFromUrl || bookings.length === 0) return;
    if (openedEditRef.current === editFromUrl) return;
    const booking = bookings.find((b) => b.id === editFromUrl);
    if (booking) {
      openedEditRef.current = editFromUrl;
      openEdit(booking);
    }
  }, [editFromUrl, bookings]);

  const openCreate = () => {
    setForm(emptyForm());
    setError(null);
    setOpen(true);
  };

  const openEdit = (b: VenueBooking) => {
    setForm({
      id: b.id,
      spaceId: b.spaceId,
      title: b.title,
      eventType: b.eventType ?? "",
      startAt: toLocalInput(b.startAt),
      endAt: toLocalInput(b.endAt),
      status: b.status,
      contactName: b.contactName ?? "",
      contactEmail: b.contactEmail ?? "",
      contactPhone: b.contactPhone ?? "",
      guestCount: b.guestCount != null ? String(b.guestCount) : "",
      notes: b.notes ?? "",
    });
    setError(null);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.spaceId || !form.title.trim() || !form.startAt || !form.endAt) {
      setError("Espaço, título e datas são obrigatórios.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      spaceId: form.spaceId,
      title: form.title.trim(),
      eventType: form.eventType.trim() || undefined,
      startAt: parseDateTimeLocalBrazil(form.startAt) ?? form.startAt,
      endAt: parseDateTimeLocalBrazil(form.endAt) ?? form.endAt,
      status: form.status,
      contactName: form.contactName.trim() || undefined,
      contactEmail: form.contactEmail.trim() || undefined,
      contactPhone: form.contactPhone.trim() || undefined,
      guestCount: form.guestCount.trim() ? Number.parseInt(form.guestCount, 10) : undefined,
      notes: form.notes.trim() || undefined,
    };
    try {
      if (form.id) {
        await api.patch(`/boston-city-hall/bookings/${form.id}`, payload);
      } else {
        await api.post("/boston-city-hall/bookings", payload);
      }
      setOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta reserva?")) return;
    try {
      await api.delete(`/boston-city-hall/bookings/${id}`);
      await load();
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
          <CardTitle className="text-lg">Reservas e bloqueios</CardTitle>
          <Button onClick={openCreate} className="min-h-[44px]">
            <Plus className="mr-2 h-4 w-4" />
            Nova reserva
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : bookings.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma reserva cadastrada. Crie a primeira ou avance um lead no pipeline.
            </p>
          ) : (
            <div className="space-y-2">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{b.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {b.spaceName} · {formatRange(b.startAt, b.endAt)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {BOOKING_STATUS_LABEL[b.status] ?? b.status}
                      {b.contactName ? ` · ${b.contactName}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => openEdit(b)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-[44px] text-destructive"
                      onClick={() => handleDelete(b.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar reserva" : "Nova reserva"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label>Espaço</Label>
              <Select value={form.spaceId} onValueChange={(v) => setForm((f) => ({ ...f, spaceId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {spaces.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="b-title">Título</Label>
              <Input id="b-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="b-type">Tipo de evento</Label>
              <Input id="b-type" value={form.eventType} onChange={(e) => setForm((f) => ({ ...f, eventType: e.target.value }))} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="b-start">Início</Label>
                <Input
                  id="b-start"
                  type="datetime-local"
                  className="text-foreground"
                  value={form.startAt}
                  onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="b-end">Fim</Label>
                <Input
                  id="b-end"
                  type="datetime-local"
                  className="text-foreground"
                  value={form.endAt}
                  onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BOOKING_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {BOOKING_STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="b-contact">Contato</Label>
                <Input id="b-contact" value={form.contactName} onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="b-guests">Convidados</Label>
                <Input id="b-guests" type="number" value={form.guestCount} onChange={(e) => setForm((f) => ({ ...f, guestCount: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="b-notes">Observações</Label>
              <Input id="b-notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
