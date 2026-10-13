"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, Loader2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { BchEventSelectField } from "@/components/dashboard/boston-city-hall/BchEventSelectField";
import { BchFilterBar } from "@/components/dashboard/boston-city-hall/BchFilterBar";
import { BchInlineError } from "@/components/dashboard/boston-city-hall/BchInlineError";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  EventTicketLot,
  EventTicketType,
  EventTicketingDetail,
  EventTicketingEventListItem,
  EventTicketingSalesStatus,
} from "@/types/boston-city-hall";
import {
  EVENT_STATUS_LABEL,
  EVENT_TICKETING_SALES_STATUS_LABEL,
  formatTicketingMoney,
} from "@/types/boston-city-hall";
import { cn } from "@/lib/utils";
import { bchEventSetupPath } from "@/components/dashboard/boston-city-hall/bch-event-setup-path";
import {
  bchOperationalEventList,
} from "@/components/dashboard/boston-city-hall/bch-operational-display";
import { useBchTicketingSelectionOptional } from "@/components/dashboard/boston-city-hall/bch-ticketing-selection-context";
import { BchEventListDiagnostics } from "@/components/dashboard/boston-city-hall/BchEventListDiagnostics";

function isoToDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeLocalToIso(value: string): string | null {
  if (!value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

const SALES_STATUS_CLASS: Record<EventTicketingSalesStatus, string> = {
  inactive: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
  not_started: "bg-sky-500/15 text-sky-300 border-sky-500/25",
  ended: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  sold_out: "bg-red-500/15 text-red-300 border-red-500/25",
  on_sale: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
};

type TypeForm = {
  name: string;
  description: string;
  price: string;
  quantity: string;
  purchaseLimit: string;
  active: boolean;
  sortOrder: string;
  salesStartAt: string;
  salesEndAt: string;
};

type LotForm = {
  name: string;
  price: string;
  quantity: string;
  active: boolean;
  sortOrder: string;
  salesStartAt: string;
  salesEndAt: string;
};

const emptyTypeForm = (): TypeForm => ({
  name: "",
  description: "",
  price: "0",
  quantity: "0",
  purchaseLimit: "",
  active: true,
  sortOrder: "0",
  salesStartAt: "",
  salesEndAt: "",
});

const emptyLotForm = (): LotForm => ({
  name: "",
  price: "0",
  quantity: "0",
  active: true,
  sortOrder: "0",
  salesStartAt: "",
  salesEndAt: "",
});

export function BostonCityHallTicketing({
  fixedEventId,
  embedded = false,
  onDetailChange,
}: {
  /** Evento fixo (Event Setup) — oculta seletor. */
  fixedEventId?: string;
  embedded?: boolean;
  onDetailChange?: (detail: EventTicketingDetail | null) => void;
} = {}) {
  const hubSelection = useBchTicketingSelectionOptional();
  const useHubEvents = Boolean(hubSelection && !fixedEventId);

  const [events, setEvents] = useState<EventTicketingEventListItem[]>([]);
  const [eventIdLocal, setEventIdLocal] = useState(fixedEventId ?? "");
  const [detail, setDetail] = useState<EventTicketingDetail | null>(null);
  const [loadingEventsLocal, setLoadingEvents] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [typeDialog, setTypeDialog] = useState(false);
  const [typeEditId, setTypeEditId] = useState<string | null>(null);
  const [typeForm, setTypeForm] = useState<TypeForm>(emptyTypeForm());

  const [lotDialog, setLotDialog] = useState(false);
  const [lotTypeId, setLotTypeId] = useState<string | null>(null);
  const [lotEditId, setLotEditId] = useState<string | null>(null);
  const [lotForm, setLotForm] = useState<LotForm>(emptyLotForm());

  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: "success" | "error";
  }>({ open: false, title: "", message: "", variant: "success" });

  const loadEvents = useCallback(async () => {
    if (useHubEvents) return;
    setLoadingEvents(true);
    setLoadError(null);
    try {
      const res = await api.get<EventTicketingEventListItem[]>("/boston-city-hall/ticketing/events");
      const list = bchOperationalEventList(Array.isArray(res.data) ? res.data : []);
      setEvents(list);
      setEventIdLocal((prev) => {
        if (fixedEventId) return fixedEventId;
        if (prev && list.some((e) => e.id === prev)) return prev;
        return list[0]?.id || "";
      });
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Erro ao carregar eventos.");
    } finally {
      setLoadingEvents(false);
    }
  }, [fixedEventId, useHubEvents]);

  const eventsResolved = useHubEvents ? hubSelection!.operationalEvents : events;
  const eventId = fixedEventId ?? (useHubEvents ? hubSelection!.eventId : eventIdLocal);
  const setEventId = useHubEvents ? hubSelection!.setEventId : setEventIdLocal;
  const loadingEvents = useHubEvents ? hubSelection!.loading : loadingEventsLocal;
  const eventsLoadError = useHubEvents ? hubSelection!.error : null;

  const loadDetail = useCallback(async (id: string) => {
    if (!id) {
      setDetail(null);
      return;
    }
    setLoadingDetail(true);
    setLoadError(null);
    try {
      const res = await api.get<EventTicketingDetail>(`/boston-city-hall/ticketing/events/${id}`);
      setDetail(res.data);
      onDetailChange?.(res.data);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Erro ao carregar ingressos.");
      setDetail(null);
      onDetailChange?.(null);
    } finally {
      setLoadingDetail(false);
    }
  }, [onDetailChange]);

  useEffect(() => {
    if (fixedEventId) setEventIdLocal(fixedEventId);
  }, [fixedEventId]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    void loadDetail(eventId);
  }, [eventId, loadDetail]);

  const selectedEvent = useMemo(
    () => eventsResolved.find((e) => e.id === eventId) ?? null,
    [eventsResolved, eventId],
  );

  const toggleTicketing = async (enabled: boolean) => {
    if (!eventId) return;
    setSaving(true);
    try {
      await api.patch(`/boston-city-hall/ticketing/events/${eventId}`, { enabled });
      await loadDetail(eventId);
      if (useHubEvents) await hubSelection!.reload();
      else await loadEvents();
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível atualizar.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const openNewType = () => {
    setTypeEditId(null);
    setTypeForm(emptyTypeForm());
    setDialogError(null);
    setTypeDialog(true);
  };

  const openEditType = (t: EventTicketType) => {
    setTypeEditId(t.id);
    setTypeForm({
      name: t.name,
      description: t.description ?? "",
      price: t.price ?? "",
      quantity: t.quantity != null ? String(t.quantity) : "",
      purchaseLimit: t.purchaseLimit != null ? String(t.purchaseLimit) : "",
      active: t.active,
      sortOrder: String(t.sortOrder),
      salesStartAt: isoToDatetimeLocal(t.salesStartAt),
      salesEndAt: isoToDatetimeLocal(t.salesEndAt),
    });
    setDialogError(null);
    setTypeDialog(true);
  };

  const saveType = async () => {
    if (!eventId) return;
    setSaving(true);
    setDialogError(null);
    try {
      const body = {
        name: typeForm.name,
        description: typeForm.description || undefined,
        price: typeForm.price,
        quantity: typeForm.quantity,
        purchaseLimit: typeForm.purchaseLimit || null,
        active: typeForm.active,
        sortOrder: Number.parseInt(typeForm.sortOrder, 10) || 0,
        salesStartAt: datetimeLocalToIso(typeForm.salesStartAt),
        salesEndAt: datetimeLocalToIso(typeForm.salesEndAt),
      };
      if (typeEditId) {
        await api.patch(`/boston-city-hall/ticketing/types/${typeEditId}`, body);
      } else {
        await api.post(`/boston-city-hall/ticketing/events/${eventId}/types`, body);
      }
      setTypeDialog(false);
      await loadDetail(eventId);
    } catch (e) {
      setDialogError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const openNewLot = (typeId: string) => {
    setLotTypeId(typeId);
    setLotEditId(null);
    setLotForm(emptyLotForm());
    setDialogError(null);
    setLotDialog(true);
  };

  const openEditLot = (typeId: string, lot: EventTicketLot) => {
    setLotTypeId(typeId);
    setLotEditId(lot.id);
    setLotForm({
      name: lot.name,
      price: lot.price,
      quantity: String(lot.quantity),
      active: lot.active,
      sortOrder: String(lot.sortOrder),
      salesStartAt: isoToDatetimeLocal(lot.salesStartAt),
      salesEndAt: isoToDatetimeLocal(lot.salesEndAt),
    });
    setDialogError(null);
    setLotDialog(true);
  };

  const saveLot = async () => {
    if (!lotTypeId) return;
    setSaving(true);
    setDialogError(null);
    try {
      const body = {
        name: lotForm.name,
        price: lotForm.price,
        quantity: lotForm.quantity,
        active: lotForm.active,
        sortOrder: Number.parseInt(lotForm.sortOrder, 10) || 0,
        salesStartAt: datetimeLocalToIso(lotForm.salesStartAt),
        salesEndAt: datetimeLocalToIso(lotForm.salesEndAt),
      };
      if (lotEditId) {
        await api.patch(`/boston-city-hall/ticketing/lots/${lotEditId}`, body);
      } else {
        await api.post(`/boston-city-hall/ticketing/types/${lotTypeId}/lots`, body);
      }
      setLotDialog(false);
      await loadDetail(eventId);
    } catch (e) {
      setDialogError(e instanceof Error ? e.message : "Erro ao salvar lote.");
    } finally {
      setSaving(false);
    }
  };

  const renderStatus = (status: EventTicketingSalesStatus) => (
    <span
      className={cn(
        "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium",
        SALES_STATUS_CLASS[status],
      )}
    >
      {EVENT_TICKETING_SALES_STATUS_LABEL[status]}
    </span>
  );

  return (
    <div className="space-y-4">
      {loadError ? <BchInlineError message={loadError} onRetry={() => void loadDetail(eventId)} /> : null}

      {!embedded && eventsLoadError ? (
        <BchEventListDiagnostics
          error={eventsLoadError}
          rawCount={hubSelection?.rawEvents.length ?? 0}
          operationalCount={eventsResolved.length}
          smokeHiddenCount={hubSelection?.smokeHiddenCount ?? 0}
          onRetry={() => void hubSelection?.reload()}
        />
      ) : null}

      {!embedded ? (
        <BchFilterBar>
            <div className="min-w-0 flex-1">
              {loadingEvents ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : eventsResolved.length === 0 && !eventsLoadError ? (
                <BchEventListDiagnostics
                  error={null}
                  rawCount={hubSelection?.rawEvents.length ?? 0}
                  operationalCount={0}
                  smokeHiddenCount={hubSelection?.smokeHiddenCount ?? 0}
                  onRetry={() => void hubSelection?.reload()}
                />
              ) : (
                <BchEventSelectField
                  id="bch-ticketing-event"
                  label="Evento"
                  events={eventsResolved}
                  value={eventId}
                  onChange={setEventId}
                  placeholder="Selecione o evento…"
                />
              )}
              {selectedEvent ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {EVENT_STATUS_LABEL[selectedEvent.status] ?? selectedEvent.status}
                  {selectedEvent.startDate
                    ? ` · ${new Date(selectedEvent.startDate).toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}`
                    : ""}
                </p>
              ) : null}
            </div>
            {detail ? (
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex min-h-[44px] cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={detail.ticketingEnabled}
                    disabled={saving || !eventId}
                    onCheckedChange={(v) => void toggleTicketing(v === true)}
                  />
                  <span className="text-sm">Ingressos habilitados</span>
                </label>
                <Button variant="outline" size="sm" className="min-h-[44px]" asChild>
                  <Link href={bchEventSetupPath(detail.eventId)}>
                    <ExternalLink className="mr-1 h-4 w-4" />
                    Preparar evento
                  </Link>
                </Button>
              </div>
            ) : null}
        </BchFilterBar>
      ) : detail ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800/80 bg-slate-950/40 px-3 py-2">
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2">
            <Checkbox
              checked={detail.ticketingEnabled}
              disabled={saving || !eventId}
              onCheckedChange={(v) => void toggleTicketing(v === true)}
            />
            <span className="text-sm text-slate-200">Venda de ingressos habilitada</span>
          </label>
          <p className="text-xs text-slate-400">
            Moeda: {detail.currency}
            {detail.capacityHint?.configuredTotal
              ? ` · ${detail.capacityHint.configuredTotal} lugares configurados`
              : ""}
          </p>
        </div>
      ) : null}

      {detail?.capacityHint?.message ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {detail.capacityHint.message}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        {!embedded ? <h2 className="text-lg font-semibold">Tipos de ingresso</h2> : <span className="text-sm font-medium text-slate-200">Tipos e lotes</span>}
        <Button type="button" size="sm" disabled={!eventId || loadingDetail} onClick={openNewType}>
          <Plus className="mr-1 h-4 w-4" />
          Novo tipo
        </Button>
      </div>

      {loadingDetail ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !detail ? (
        <p className="text-sm text-muted-foreground">Selecione um evento.</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Nome</TableHead>
                  <TableHead>Preço atual</TableHead>
                  <TableHead>Capacidade</TableHead>
                  <TableHead>Disponível</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.types.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Nenhum tipo cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  detail.types.map((t) => {
                    const isOpen = expanded[t.id];
                    return (
                      <Fragment key={t.id}>
                        <TableRow>
                          <TableCell>
                            {t.lots.length > 0 ? (
                              <button
                                type="button"
                                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center"
                                onClick={() =>
                                  setExpanded((prev) => ({ ...prev, [t.id]: !prev[t.id] }))
                                }
                                aria-label={isOpen ? "Recolher lotes" : "Expandir lotes"}
                              >
                                {isOpen ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                            ) : null}
                          </TableCell>
                          <TableCell className="font-medium">{t.name}</TableCell>
                          <TableCell>{formatTicketingMoney(t.currentPrice)}</TableCell>
                          <TableCell>{t.capacity}</TableCell>
                          <TableCell>{t.available}</TableCell>
                          <TableCell>{renderStatus(t.salesStatus)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => openEditType(t)}>
                              Editar
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openNewLot(t.id)}>
                              Lote
                            </Button>
                          </TableCell>
                        </TableRow>
                        {isOpen && t.lots.length > 0 ? (
                          <TableRow key={`${t.id}-lots`}>
                            <TableCell colSpan={7} className="bg-muted/20 p-0">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Lote</TableHead>
                                    <TableHead>Preço</TableHead>
                                    <TableHead>Qtd</TableHead>
                                    <TableHead>Disponível</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead />
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {t.lots.map((lot) => (
                                    <TableRow key={lot.id}>
                                      <TableCell>
                                        {lot.name}
                                        {lot.isCurrentLot ? (
                                          <span className="ml-2 text-xs text-violet-300">· vendável</span>
                                        ) : null}
                                      </TableCell>
                                      <TableCell>{formatTicketingMoney(lot.price)}</TableCell>
                                      <TableCell>{lot.quantity}</TableCell>
                                      <TableCell>{lot.available}</TableCell>
                                      <TableCell>{renderStatus(lot.salesStatus)}</TableCell>
                                      <TableCell className="text-right">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => openEditLot(t.id, lot)}
                                        >
                                          Editar
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={typeDialog} onOpenChange={setTypeDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{typeEditId ? "Editar tipo" : "Novo tipo de ingresso"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            {dialogError ? <p className="text-sm text-destructive">{dialogError}</p> : null}
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Input
                value={typeForm.description}
                onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Preço (sem lotes)</Label>
                <Input
                  inputMode="decimal"
                  value={typeForm.price}
                  onChange={(e) => setTypeForm({ ...typeForm, price: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Quantidade (sem lotes)</Label>
                <Input
                  inputMode="numeric"
                  value={typeForm.quantity}
                  onChange={(e) => setTypeForm({ ...typeForm, quantity: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Limite por compra</Label>
                <Input
                  inputMode="numeric"
                  value={typeForm.purchaseLimit}
                  onChange={(e) => setTypeForm({ ...typeForm, purchaseLimit: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Ordem</Label>
                <Input
                  inputMode="numeric"
                  value={typeForm.sortOrder}
                  onChange={(e) => setTypeForm({ ...typeForm, sortOrder: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Início vendas</Label>
                <Input
                  type="datetime-local"
                  className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  value={typeForm.salesStartAt}
                  onChange={(e) => setTypeForm({ ...typeForm, salesStartAt: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Fim vendas</Label>
                <Input
                  type="datetime-local"
                  className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  value={typeForm.salesEndAt}
                  onChange={(e) => setTypeForm({ ...typeForm, salesEndAt: e.target.value })}
                />
              </div>
            </div>
            <label className="flex min-h-[44px] cursor-pointer items-center gap-2">
              <Checkbox
                checked={typeForm.active}
                onCheckedChange={(v) => setTypeForm({ ...typeForm, active: v === true })}
              />
              <Label>Ativo</Label>
            </label>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setTypeDialog(false)}>
              Cancelar
            </Button>
            <Button disabled={saving || !typeForm.name.trim()} onClick={() => void saveType()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={lotDialog} onOpenChange={setLotDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{lotEditId ? "Editar lote" : "Novo lote"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            {dialogError ? <p className="text-sm text-destructive">{dialogError}</p> : null}
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input value={lotForm.name} onChange={(e) => setLotForm({ ...lotForm, name: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Preço</Label>
                <Input
                  inputMode="decimal"
                  value={lotForm.price}
                  onChange={(e) => setLotForm({ ...lotForm, price: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Quantidade</Label>
                <Input
                  inputMode="numeric"
                  value={lotForm.quantity}
                  onChange={(e) => setLotForm({ ...lotForm, quantity: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Ordem</Label>
              <Input
                inputMode="numeric"
                value={lotForm.sortOrder}
                onChange={(e) => setLotForm({ ...lotForm, sortOrder: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Início vendas</Label>
                <Input
                  type="datetime-local"
                  className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  value={lotForm.salesStartAt}
                  onChange={(e) => setLotForm({ ...lotForm, salesStartAt: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Fim vendas</Label>
                <Input
                  type="datetime-local"
                  className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  value={lotForm.salesEndAt}
                  onChange={(e) => setLotForm({ ...lotForm, salesEndAt: e.target.value })}
                />
              </div>
            </div>
            <label className="flex min-h-[44px] cursor-pointer items-center gap-2">
              <Checkbox
                checked={lotForm.active}
                onCheckedChange={(v) => setLotForm({ ...lotForm, active: v === true })}
              />
              <Label>Ativo</Label>
            </label>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setLotDialog(false)}>
              Cancelar
            </Button>
            <Button disabled={saving || !lotForm.name.trim()} onClick={() => void saveLot()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
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
