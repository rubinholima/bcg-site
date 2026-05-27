"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Plus,
  Trash2,
} from "lucide-react";
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
import { FIXTURE_CATEGORIES, getCategoryLabel } from "@/lib/fixture-categories";
import { isFootballKind } from "@/lib/home-data";
import type {
  FootballAgendaCalendarItem,
  FootballAgendaEntry,
  FootballAgendaOverview,
} from "@/types/futebol-agenda";
import {
  FOOTBALL_AGENDA_ENTRY_TYPES,
  FOOTBALL_AGENDA_TYPE_COLOR,
  FOOTBALL_AGENDA_TYPE_LABEL,
  TRAVEL_STATUS_LABEL,
} from "@/types/futebol-agenda";
import { cn } from "@/lib/utils";

interface Tenant {
  id: string;
  name: string;
  kind?: { name: string };
}

function monthRange(year: number, month: number) {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0, 23, 59, 59);
  return { from: from.toISOString(), to: to.toISOString() };
}

function formatTime(iso: string, allDay: boolean): string {
  if (allDay) return "Dia inteiro";
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

type EntryForm = {
  tenantId: string;
  category: string;
  type: string;
  title: string;
  startAt: string;
  startTime: string;
  endAt: string;
  endTime: string;
  allDay: boolean;
  location: string;
  description: string;
  status: string;
};

const emptyForm = (): EntryForm => ({
  tenantId: "",
  category: "",
  type: "treino",
  title: "",
  startAt: "",
  startTime: "09:00",
  endAt: "",
  endTime: "10:00",
  allDay: false,
  location: "",
  description: "",
  status: "confirmado",
});

function isClubTenant(kindName?: string) {
  if (!kindName || !isFootballKind(kindName)) return false;
  const k = kindName.toLowerCase();
  return !k.includes("construtora") && !k.includes("real estate") && !k.includes("construção");
}

function combineDateTime(date: string, time: string, allDay: boolean): string {
  if (!date) return "";
  if (allDay) return new Date(`${date}T12:00:00`).toISOString();
  return new Date(`${date}T${time}:00`).toISOString();
}

export function FutebolAgendaOperacional() {
  const searchParams = useSearchParams();
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantFilter, setTenantFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [items, setItems] = useState<FootballAgendaCalendarItem[]>([]);
  const [overview, setOverview] = useState<FootballAgendaOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EntryForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => {
      const list = (Array.isArray(data) ? data : []).filter((t) => isClubTenant(t.kind?.name));
      setTenants(list);
      if (list.length === 1 && !form.tenantId) {
        setForm((f) => ({ ...f, tenantId: list[0].id }));
      }
    });
  }, [form.tenantId]);

  const load = useCallback(async () => {
    setLoading(true);
    const { from, to } = monthRange(cursor.year, cursor.month);
    const params = new URLSearchParams({ from, to });
    if (tenantFilter) params.set("tenantId", tenantFilter);
    if (typeFilter !== "all") params.set("types", typeFilter);
    try {
      const [calRes, ovRes] = await Promise.all([
        api.get<FootballAgendaCalendarItem[]>(`/futebol-agenda/calendar?${params}`),
        api.get<FootballAgendaOverview>(
          `/futebol-agenda/overview?year=${cursor.year}&month=${cursor.month}${tenantFilter ? `&tenantId=${tenantFilter}` : ""}`,
        ),
      ]);
      setItems(Array.isArray(calRes.data) ? calRes.data : []);
      setOverview(ovRes.data ?? null);
    } catch {
      setItems([]);
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, [cursor.year, cursor.month, tenantFilter, typeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const entryIdFromUrl = searchParams.get("entry");

  useEffect(() => {
    if (!entryIdFromUrl) return;
    api
      .get<FootballAgendaEntry>(`/futebol-agenda/entries/${entryIdFromUrl}`)
      .then(({ data }) => {
        if (!data) return;
        openEditEntry(data);
      })
      .catch(() => {});
  }, [entryIdFromUrl]);

  const byDay = useMemo(() => {
    const map = new Map<string, FootballAgendaCalendarItem[]>();
    for (const item of items) {
      const key = item.startAt.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [items]);

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const startWeekday = new Date(cursor.year, cursor.month, 1).getDay();
  const todayKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;

  const selectedItems = selectedDay ? byDay.get(selectedDay) ?? [] : [];

  const openNewEntry = (dateKey?: string) => {
    const base = dateKey ?? todayKey;
    setEditingId(null);
    setForm({
      ...emptyForm(),
      tenantId: tenantFilter || tenants[0]?.id || "",
      startAt: base,
      endAt: base,
    });
    setError(null);
    setDialogOpen(true);
  };

  const openEditEntry = (entry: FootballAgendaEntry) => {
    const start = new Date(entry.startAt);
    const end = entry.endAt ? new Date(entry.endAt) : null;
    setEditingId(entry.id);
    setForm({
      tenantId: entry.tenantId,
      category: entry.category ?? "",
      type: entry.type,
      title: entry.title,
      startAt: entry.startAt.slice(0, 10),
      startTime: entry.allDay ? "09:00" : `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`,
      endAt: end ? entry.endAt!.slice(0, 10) : entry.startAt.slice(0, 10),
      endTime: end && !entry.allDay
        ? `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`
        : "10:00",
      allDay: entry.allDay,
      location: entry.location ?? "",
      description: entry.description ?? "",
      status: entry.status,
    });
    setError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.tenantId || !form.title.trim() || !form.startAt) {
      setError("Clube, título e data são obrigatórios.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      tenantId: form.tenantId,
      category: form.category || undefined,
      type: form.type,
      title: form.title.trim(),
      startAt: combineDateTime(form.startAt, form.startTime, form.allDay),
      endAt: form.endAt
        ? combineDateTime(form.endAt, form.endTime, form.allDay)
        : undefined,
      allDay: form.allDay,
      location: form.location.trim() || undefined,
      description: form.description.trim() || undefined,
      status: form.status,
    };
    try {
      if (editingId) {
        await api.patch(`/futebol-agenda/entries/${editingId}`, payload);
      } else {
        await api.post("/futebol-agenda/entries", payload);
      }
      setDialogOpen(false);
      await load();
      if (form.startAt) setSelectedDay(form.startAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await api.delete(`/futebol-agenda/entries/${editingId}`);
      setDialogOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent">
          <CardContent className="pt-4">
            <p className="text-xs font-medium text-muted-foreground">Viagens no mês</p>
            <p className="text-2xl font-bold">{overview?.travelsInMonth ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent">
          <CardContent className="pt-4">
            <p className="text-xs font-medium text-muted-foreground">Compromissos cadastrados</p>
            <p className="text-2xl font-bold">{overview?.entriesInMonth ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-sky-500/20 bg-gradient-to-br from-sky-500/10 to-transparent">
          <CardContent className="pt-4">
            <p className="text-xs font-medium text-muted-foreground">Próximos 7 dias</p>
            <p className="text-2xl font-bold">{overview?.upcomingSevenDays ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex min-h-[72px] items-center justify-center pt-4">
            <Button onClick={() => openNewEntry(selectedDay ?? undefined)} className="min-h-[44px] w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Novo compromisso
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <CardTitle className="text-lg capitalize">{monthLabel}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={tenantFilter || "all"} onValueChange={(v) => setTenantFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="min-h-[44px] w-full sm:w-[200px]">
                <SelectValue placeholder="Clube" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clubes</SelectItem>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="min-h-[44px] w-full sm:w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="viagem">Viagens</SelectItem>
                {FOOTBALL_AGENDA_ENTRY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {FOOTBALL_AGENDA_TYPE_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10"
                onClick={() =>
                  setCursor((c) =>
                    c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 },
                  )
                }
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10"
                onClick={() =>
                  setCursor((c) =>
                    c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 },
                  )
                }
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1fr_minmax(260px,320px)]">
              <div>
                <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground">
                  {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                    <div key={d} className="py-1">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: startWeekday }).map((_, i) => (
                    <div key={`e-${i}`} className="min-h-[92px] rounded-lg bg-muted/15 sm:min-h-[100px]" />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dateKey = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const dayItems = byDay.get(dateKey) ?? [];
                    const isToday = dateKey === todayKey;
                    const isSelected = dateKey === selectedDay;
                    return (
                      <button
                        key={dateKey}
                        type="button"
                        onClick={() => setSelectedDay(dateKey)}
                        className={cn(
                          "min-h-[92px] rounded-lg border p-1.5 text-left transition-colors sm:min-h-[100px]",
                          isSelected
                            ? "border-primary ring-2 ring-primary/40 bg-primary/10"
                            : isToday
                              ? "border-primary/40 bg-primary/5"
                              : "border-border/60 bg-card hover:bg-muted/30",
                        )}
                      >
                        <span className="text-xs font-bold text-foreground">{day}</span>
                        <div className="mt-1 space-y-0.5">
                          {dayItems.slice(0, 4).map((item) => (
                            <div
                              key={item.id}
                              className={cn(
                                "truncate rounded border px-1 py-0.5 text-[10px] leading-tight sm:text-[11px]",
                                FOOTBALL_AGENDA_TYPE_COLOR[item.type] ?? FOOTBALL_AGENDA_TYPE_COLOR.outro,
                              )}
                              title={item.title}
                            >
                              {item.title}
                            </div>
                          ))}
                          {dayItems.length > 4 ? (
                            <p className="text-[10px] text-muted-foreground">+{dayItems.length - 4}</p>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {Object.entries(FOOTBALL_AGENDA_TYPE_LABEL).map(([key, label]) => (
                    <span
                      key={key}
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                        FOOTBALL_AGENDA_TYPE_COLOR[key],
                      )}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <Card className="border-dashed lg:border-solid">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {selectedDay ? formatDateLong(`${selectedDay}T12:00:00`) : "Selecione um dia"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[420px] overflow-y-auto">
                  {!selectedDay ? (
                    <p className="text-sm text-muted-foreground">
                      Toque em um dia do calendário para ver viagens e compromissos.
                    </p>
                  ) : selectedItems.length === 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">Nada agendado neste dia.</p>
                      <Button variant="outline" size="sm" onClick={() => openNewEntry(selectedDay)}>
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Adicionar
                      </Button>
                    </div>
                  ) : (
                    selectedItems.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "rounded-lg border p-3",
                          FOOTBALL_AGENDA_TYPE_COLOR[item.type] ?? "",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-medium uppercase opacity-80">
                              {FOOTBALL_AGENDA_TYPE_LABEL[item.type] ?? item.type}
                              {item.tenantName ? ` · ${item.tenantName}` : ""}
                            </p>
                            <p className="mt-0.5 font-semibold leading-tight">{item.title}</p>
                            <p className="mt-1 text-xs opacity-90">
                              {formatTime(item.startAt, item.allDay)}
                              {item.endAt && !item.allDay
                                ? ` — ${formatTime(item.endAt, false)}`
                                : ""}
                            </p>
                            {item.location ? (
                              <p className="mt-1 flex items-center gap-1 text-xs opacity-80">
                                <MapPin className="h-3 w-3 shrink-0" />
                                {item.location}
                              </p>
                            ) : null}
                            {item.source === "travel" ? (
                              <p className="mt-1 text-xs opacity-75">
                                {TRAVEL_STATUS_LABEL[item.status] ?? item.status}
                                {item.championshipName ? ` · ${item.championshipName}` : ""}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.source === "travel" ? (
                            <Link
                              href={item.href}
                              className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                            >
                              Abrir viagem
                            </Link>
                          ) : (
                            <button
                              type="button"
                              className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                              onClick={() => {
                                const id = item.id.replace(/^entry-/, "");
                                api.get<FootballAgendaEntry>(`/futebol-agenda/entries/${id}`).then(({ data }) => {
                                  if (data) openEditEntry(data);
                                });
                              }}
                            >
                              Editar
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Viagens vêm do módulo{" "}
            <Link href="/dashboard/futebol/logistica" className="text-primary hover:underline">
              Viagens
            </Link>
            ; treinos, reuniões e jogos você cadastra aqui na agenda.
          </p>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar compromisso" : "Novo compromisso"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label>Clube *</Label>
              <Select value={form.tenantId} onValueChange={(v) => setForm((f) => ({ ...f, tenantId: v }))}>
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue placeholder="Selecione o clube" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FOOTBALL_AGENDA_ENTRY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {FOOTBALL_AGENDA_TYPE_LABEL[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Categoria</Label>
                <Select
                  value={form.category || "__none__"}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v === "__none__" ? "" : v }))}
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {FIXTURE_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {getCategoryLabel(c.value, "pt")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Título *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.allDay}
                onChange={(e) => setForm((f) => ({ ...f, allDay: e.target.checked }))}
                className="h-4 w-4 rounded border-border"
              />
              Dia inteiro
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Início *</Label>
                <Input
                  type="date"
                  className="text-foreground"
                  value={form.startAt}
                  onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
                />
              </div>
              {!form.allDay ? (
                <div className="grid gap-1.5">
                  <Label>Hora início</Label>
                  <Input
                    type="time"
                    className="text-foreground"
                    value={form.startTime}
                    onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                  />
                </div>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Fim</Label>
                <Input
                  type="date"
                  className="text-foreground"
                  value={form.endAt}
                  onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))}
                />
              </div>
              {!form.allDay ? (
                <div className="grid gap-1.5">
                  <Label>Hora fim</Label>
                  <Input
                    type="time"
                    className="text-foreground"
                    value={form.endTime}
                    onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                  />
                </div>
              ) : null}
            </div>
            <div className="grid gap-1.5">
              <Label>Local</Label>
              <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
            </div>
            <div className="grid gap-1.5">
              <Label>Observações</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            {editingId ? (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={saving} className="w-full sm:mr-auto sm:w-auto">
                <Trash2 className="mr-1 h-4 w-4" />
                Excluir
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="min-h-[44px]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
