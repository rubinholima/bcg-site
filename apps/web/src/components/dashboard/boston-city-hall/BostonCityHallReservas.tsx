"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarDays,
  ExternalLink,
  Loader2,
  Plus,
  Search,
  UserRound,
} from "lucide-react";
import { api } from "@/lib/api";
import { parseDateTimeLocalBrazil, toDateTimeLocalBrazil, BRAZIL_TZ } from "@/lib/brazil-time";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BostonCityHallBookingEventDialog } from "@/components/dashboard/boston-city-hall/BostonCityHallBookingEventDialog";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
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
import type { VenueBooking, VenuePipelineLead, VenueSpace } from "@/types/boston-city-hall";
import {
  BOOKING_STATUSES,
  BOOKING_STATUS_COLOR,
  BOOKING_STATUS_LABEL,
  EVENT_STATUS_LABEL,
} from "@/types/boston-city-hall";
import { cn } from "@/lib/utils";
import { BCH_BASE } from "./boston-city-hall-lead-shared";

function bookingPeriodRange(period: string): { from?: string; to?: string } {
  const now = new Date();
  if (period === "7d") {
    const to = new Date(now);
    to.setDate(to.getDate() + 7);
    to.setHours(23, 59, 59, 999);
    return { from: now.toISOString(), to: to.toISOString() };
  }
  if (period === "30d") {
    const to = new Date(now);
    to.setDate(to.getDate() + 30);
    to.setHours(23, 59, 59, 999);
    return { from: now.toISOString(), to: to.toISOString() };
  }
  if (period === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { from: from.toISOString(), to: to.toISOString() };
  }
  return {};
}

type FormState = {
  id?: string;
  spaceId: string;
  title: string;
  eventType: string;
  startAt: string;
  endAt: string;
  status: string;
  pipelineLeadId: string;
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
  pipelineLeadId: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  guestCount: "",
  notes: "",
});

function toLocalInput(iso: string): string {
  return toDateTimeLocalBrazil(iso);
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: BRAZIL_TZ,
  });
}

function formatRange(start: string, end: string): string {
  return `${formatDateTime(start)} — ${formatDateTime(end)}`;
}

function companyLabel(b: VenueBooking): string {
  return b.pipelineLead?.companyName?.trim() || "—";
}

export function BostonCityHallReservas() {
  const searchParams = useSearchParams();
  const editFromUrl = searchParams.get("edit");
  const openedEditRef = useRef<string | null>(null);

  const [spaces, setSpaces] = useState<VenueSpace[]>([]);
  const [bookings, setBookings] = useState<VenueBooking[]>([]);
  const [leads, setLeads] = useState<VenuePipelineLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [spaceFilter, setSpaceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [sort, setSort] = useState("startAsc");

  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: "success" | "error";
  }>({ open: false, title: "", message: "", variant: "success" });

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const loadSpacesAndLeads = useCallback(async () => {
    try {
      const [spacesRes, leadsRes] = await Promise.all([
        api.get<VenueSpace[]>("/boston-city-hall/spaces"),
        api.get<VenuePipelineLead[]>("/boston-city-hall/pipeline?sort=updatedDesc"),
      ]);
      setSpaces(Array.isArray(spacesRes.data) ? spacesRes.data : []);
      setLeads(Array.isArray(leadsRes.data) ? leadsRes.data : []);
    } catch {
      setSpaces([]);
      setLeads([]);
    }
  }, []);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams();
      if (spaceFilter !== "all") params.set("spaceId", spaceFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchDebounced) params.set("q", searchDebounced);
      if (sort) params.set("sort", sort);
      const et = eventTypeFilter.trim();
      if (et) params.set("eventType", et);
      const period = bookingPeriodRange(periodFilter);
      if (period.from) params.set("from", period.from);
      if (period.to) params.set("to", period.to);
      const qs = params.toString();
      const res = await api.get<VenueBooking[]>(
        `/boston-city-hall/bookings${qs ? `?${qs}` : ""}`,
      );
      setBookings(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setBookings([]);
      setLoadError(e instanceof Error ? e.message : "Não foi possível carregar as reservas.");
    } finally {
      setLoading(false);
    }
  }, [spaceFilter, statusFilter, periodFilter, searchDebounced, eventTypeFilter, sort]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    loadSpacesAndLeads();
  }, [loadSpacesAndLeads]);

  useEffect(() => {
    if (!editFromUrl || bookings.length === 0) return;
    if (openedEditRef.current === editFromUrl) return;
    const booking = bookings.find((b) => b.id === editFromUrl);
    if (booking) {
      openedEditRef.current = editFromUrl;
      openEdit(booking);
    }
  }, [editFromUrl, bookings]);

  const linkableLeads = useMemo(() => {
    return leads.filter((l) => !l.booking || l.booking.id === form.id);
  }, [leads, form.id]);

  const applyLeadPrefill = (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) {
      setForm((f) => ({ ...f, pipelineLeadId: leadId }));
      return;
    }
    setForm((f) => ({
      ...f,
      pipelineLeadId: leadId,
      contactName: lead.contactName,
      contactEmail: lead.contactEmail,
      contactPhone: lead.contactPhone ?? "",
      eventType: lead.eventType ?? f.eventType,
      guestCount: lead.guestCount != null ? String(lead.guestCount) : f.guestCount,
      title:
        f.title.trim() ||
        lead.companyName?.trim() ||
        `${lead.contactName}${lead.eventType ? ` — ${lead.eventType}` : ""}`,
      startAt:
        f.startAt ||
        (lead.preferredDate
          ? toLocalInput(`${lead.preferredDate.slice(0, 10)}T09:00:00.000Z`)
          : f.startAt),
      endAt:
        f.endAt ||
        (lead.preferredDate
          ? toLocalInput(`${lead.preferredDate.slice(0, 10)}T18:00:00.000Z`)
          : f.endAt),
    }));
  };

  const openCreate = () => {
    setForm(emptyForm());
    setFormError(null);
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
      pipelineLeadId: b.pipelineLeadId ?? "",
      contactName: b.contactName ?? "",
      contactEmail: b.contactEmail ?? "",
      contactPhone: b.contactPhone ?? "",
      guestCount: b.guestCount != null ? String(b.guestCount) : "",
      notes: b.notes ?? "",
    });
    setFormError(null);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.spaceId || !form.title.trim() || !form.startAt || !form.endAt) {
      setFormError("Espaço, título e datas são obrigatórios.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      spaceId: form.spaceId,
      title: form.title.trim(),
      eventType: form.eventType.trim() || undefined,
      startAt: parseDateTimeLocalBrazil(form.startAt) ?? form.startAt,
      endAt: parseDateTimeLocalBrazil(form.endAt) ?? form.endAt,
      status: form.status,
      pipelineLeadId: form.pipelineLeadId || undefined,
      contactName: form.contactName.trim() || undefined,
      contactEmail: form.contactEmail.trim() || undefined,
      contactPhone: form.contactPhone.trim() || undefined,
      guestCount: form.guestCount.trim() ? Number.parseInt(form.guestCount, 10) : undefined,
      notes: form.notes.trim() || undefined,
    };
    try {
      if (form.id) {
        await api.patch(`/boston-city-hall/bookings/${form.id}`, {
          ...payload,
          pipelineLeadId: form.pipelineLeadId || null,
        });
      } else {
        await api.post("/boston-city-hall/bookings", payload);
      }
      setOpen(false);
      await loadBookings();
      setFeedback({
        open: true,
        title: form.id ? "Reserva atualizada" : "Reserva criada",
        message: "Operação concluída com sucesso.",
        variant: "success",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar";
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const confirmCancel = async () => {
    if (!cancelId) return;
    setCancelling(true);
    try {
      await api.patch(`/boston-city-hall/bookings/${cancelId}`, { status: "cancelled" });
      setCancelId(null);
      await loadBookings();
      setFeedback({
        open: true,
        title: "Reserva cancelada",
        message: "O status foi alterado para cancelado. O histórico foi preservado.",
        variant: "success",
      });
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro ao cancelar",
        message: e instanceof Error ? e.message : "Não foi possível cancelar.",
        variant: "error",
      });
    } finally {
      setCancelling(false);
    }
  };

  const selectedBooking = form.id ? bookings.find((b) => b.id === form.id) : null;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg">Reservas e bloqueios</CardTitle>
          <Button onClick={openCreate} className="min-h-[44px] w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nova reserva
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
            <div className="relative min-w-0 flex-1 lg:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar contato, empresa, título…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-h-[44px] pl-9"
              />
            </div>
            <Input
              placeholder="Tipo de evento"
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="min-h-[44px] w-full lg:w-[150px]"
            />
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="min-h-[44px] w-full lg:w-[190px]">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="startAsc">Data/hora ↑ (próximas)</SelectItem>
                <SelectItem value="startDesc">Data/hora ↓</SelectItem>
                <SelectItem value="updatedDesc">Última atualização</SelectItem>
                <SelectItem value="createdDesc">Mais recentes (criação)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="min-h-[44px] w-full lg:w-[160px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo período</SelectItem>
                <SelectItem value="7d">Próx. 7 dias</SelectItem>
                <SelectItem value="30d">Próx. 30 dias</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="min-h-[44px] w-full lg:w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                {BOOKING_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {BOOKING_STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={spaceFilter} onValueChange={setSpaceFilter}>
              <SelectTrigger className="min-h-[44px] w-full lg:w-[180px]">
                <SelectValue placeholder="Espaço" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos espaços</SelectItem>
                {spaces.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-destructive">{loadError}</p>
              <Button variant="outline" onClick={() => loadBookings()} className="min-h-[44px]">
                Tentar novamente
              </Button>
            </div>
          ) : bookings.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma reserva com os filtros atuais.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Espaço</TableHead>
                    <TableHead className="hidden md:table-cell">Contato / empresa</TableHead>
                    <TableHead className="hidden lg:table-cell">Evento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden xl:table-cell">Atualizado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((b) => (
                    <TableRow
                      key={b.id}
                      className={cn(
                        "cursor-pointer hover:bg-muted/40",
                        b.status === "cancelled" && "opacity-60",
                      )}
                      onClick={() => openEdit(b)}
                    >
                      <TableCell>
                        <p className="text-sm font-medium">{b.title}</p>
                        <p className="text-xs text-muted-foreground">{formatRange(b.startAt, b.endAt)}</p>
                      </TableCell>
                      <TableCell className="text-sm">{b.spaceName ?? "—"}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <p className="text-sm">{b.contactName ?? b.pipelineLead?.contactName ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{companyLabel(b)}</p>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {b.eventType ?? "—"}
                        {b.guestCount != null ? ` · ${b.guestCount} conv.` : ""}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-block rounded-full border px-2 py-0.5 text-xs font-medium",
                            BOOKING_STATUS_COLOR[b.status] ?? "bg-muted text-muted-foreground",
                          )}
                        >
                          {BOOKING_STATUS_LABEL[b.status] ?? b.status}
                        </span>
                        {b.pipelineLeadId ? (
                          <span className="mt-1 block text-[10px] text-violet-300">Lead vinculado</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">
                        {formatDateTime(b.updatedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {!loading && !loadError ? (
            <p className="text-xs text-muted-foreground">
              {bookings.length} reserva(s) · clique na linha para ver ou editar · conflitos de horário
              são bloqueados ao salvar
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Reserva" : "Nova reserva"}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-wrap gap-2 border-b border-border pb-3">
            <Button variant="outline" size="sm" className="min-h-[40px] gap-1" asChild>
              <Link href={`${BCH_BASE}/agenda`}>
                <CalendarDays className="h-4 w-4" />
                Agenda
              </Link>
            </Button>
            {form.pipelineLeadId ? (
              <Button variant="outline" size="sm" className="min-h-[40px] gap-1" asChild>
                <Link href={`${BCH_BASE}/crm`}>
                  <UserRound className="h-4 w-4" />
                  CRM
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
            ) : null}
            {form.id && form.status !== "cancelled" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-[40px] text-destructive"
                onClick={() => setCancelId(form.id!)}
              >
                Cancelar reserva
              </Button>
            ) : null}
          </div>

          {form.id ? (
            <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
              <p className="text-sm font-medium">Evento (plataforma)</p>
              {selectedBooking?.event ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    {selectedBooking.event.name} ·{" "}
                    {EVENT_STATUS_LABEL[selectedBooking.event.status] ??
                      selectedBooking.event.status}
                  </p>
                  <Button variant="outline" size="sm" className="min-h-[40px]" asChild>
                    <Link href={`/dashboard/eventos/${selectedBooking.event.id}/editar`}>
                      Abrir evento
                    </Link>
                  </Button>
                </>
              ) : form.status === "confirmed" ? (
                <Button
                  type="button"
                  size="sm"
                  className="min-h-[40px]"
                  onClick={() => setEventDialogOpen(true)}
                >
                  Criar evento a partir da reserva
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Disponível quando a reserva estiver confirmada.
                </p>
              )}
            </div>
          ) : null}

          <div className="grid gap-3 py-1">
            <div className="grid gap-1.5">
              <Label htmlFor="b-space">Espaço *</Label>
              <NativeSelect
                id="b-space"
                value={form.spaceId}
                onChange={(e) => setForm((f) => ({ ...f, spaceId: e.target.value }))}
              >
                <option value="">Selecione…</option>
                {spaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="b-lead">Lead (opcional)</Label>
              <NativeSelect
                id="b-lead"
                value={form.pipelineLeadId}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) setForm((f) => ({ ...f, pipelineLeadId: "" }));
                  else applyLeadPrefill(v);
                }}
              >
                <option value="">Sem lead</option>
                {linkableLeads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.companyName || l.contactName}
                    {l.eventType ? ` · ${l.eventType}` : ""}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="b-title">Título *</Label>
              <Input
                id="b-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="b-type">Tipo de evento</Label>
              <Input
                id="b-type"
                value={form.eventType}
                onChange={(e) => setForm((f) => ({ ...f, eventType: e.target.value }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="b-start">Início *</Label>
                <Input
                  id="b-start"
                  type="datetime-local"
                  className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  value={form.startAt}
                  onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="b-end">Fim *</Label>
                <Input
                  id="b-end"
                  type="datetime-local"
                  className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  value={form.endAt}
                  onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="b-status">Status</Label>
              <NativeSelect
                id="b-status"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {BOOKING_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {BOOKING_STATUS_LABEL[s]}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="b-contact">Contato</Label>
                <Input
                  id="b-contact"
                  value={form.contactName}
                  onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="b-email">E-mail</Label>
                <Input
                  id="b-email"
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="b-phone">Telefone</Label>
                <Input
                  id="b-phone"
                  value={form.contactPhone}
                  onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="b-guests">Convidados</Label>
                <Input
                  id="b-guests"
                  inputMode="numeric"
                  value={form.guestCount}
                  onChange={(e) => setForm((f) => ({ ...f, guestCount: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="b-notes">Observações</Label>
              <textarea
                id="b-notes"
                rows={3}
                className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            {selectedBooking ? (
              <p className="text-xs text-muted-foreground">
                Criado em {formatDateTime(selectedBooking.createdAt)} · Atualizado em{" "}
                {formatDateTime(selectedBooking.updatedAt)}
                {selectedBooking.pipelineLead?.companyName
                  ? ` · Empresa (lead): ${selectedBooking.pipelineLead.companyName}`
                  : null}
              </p>
            ) : null}
            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)} className="min-h-[44px]">
              Fechar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="min-h-[44px]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!cancelId} onOpenChange={(o) => !o && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              A reserva será marcada como cancelada. O registro permanece no histórico e na agenda.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              disabled={cancelling}
              onClick={(e) => {
                e.preventDefault();
                void confirmCancel();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar cancelamento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {form.id ? (
        <BostonCityHallBookingEventDialog
          bookingId={form.id}
          open={eventDialogOpen}
          onOpenChange={setEventDialogOpen}
          onCreated={async () => {
            await loadBookings();
            setFeedback({
              open: true,
              title: "Evento criado",
              message: "Rascunho vinculado à reserva. Publique depois em Eventos.",
              variant: "success",
            });
          }}
          onError={(message) =>
            setFeedback({
              open: true,
              title: "Evento",
              message,
              variant: "error",
            })
          }
        />
      ) : null}

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.variant}
      />
    </>
  );
}
