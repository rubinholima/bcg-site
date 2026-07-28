"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  Loader2,
  MapPin,
  Megaphone,
  Plus,
  Search,
  Shirt,
  Trophy,
} from "lucide-react";
import { DashboardDeptHeader } from "@/components/dashboard/DashboardDeptHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import {
  AGENDA_SOURCE_CREATE_HREF,
  AGENDA_SOURCE_DOT,
  AGENDA_SOURCE_LABELS,
  AGENDA_SOURCE_MANAGE_HREF,
  AGENDA_SOURCE_TONE,
  fetchUnifiedAgendaEvents,
  formatAgendaDateLong,
  formatAgendaTime,
  groupEventsByDate,
  todayDateKey,
  type AgendaSource,
  type UnifiedAgendaEvent,
} from "@/lib/unified-agenda";
import { cn } from "@/lib/utils";
import { dash } from "@/lib/dashboard-theme-classes";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

const SOURCE_UI: Record<
  AgendaSource,
  { label: string; icon: typeof Shirt; tone: string; dotClass: string; manageHref: string }
> = {
  futebol: {
    label: AGENDA_SOURCE_LABELS.futebol,
    icon: Shirt,
    tone: AGENDA_SOURCE_TONE.futebol,
    dotClass: AGENDA_SOURCE_DOT.futebol,
    manageHref: AGENDA_SOURCE_MANAGE_HREF.futebol,
  },
  "boston-hall": {
    label: AGENDA_SOURCE_LABELS["boston-hall"],
    icon: Building2,
    tone: AGENDA_SOURCE_TONE["boston-hall"],
    dotClass: AGENDA_SOURCE_DOT["boston-hall"],
    manageHref: AGENDA_SOURCE_MANAGE_HREF["boston-hall"],
  },
  consultas: {
    label: AGENDA_SOURCE_LABELS.consultas,
    icon: ClipboardList,
    tone: AGENDA_SOURCE_TONE.consultas,
    dotClass: AGENDA_SOURCE_DOT.consultas,
    manageHref: AGENDA_SOURCE_MANAGE_HREF.consultas,
  },
  marketing: {
    label: AGENDA_SOURCE_LABELS.marketing,
    icon: Megaphone,
    tone: AGENDA_SOURCE_TONE.marketing,
    dotClass: AGENDA_SOURCE_DOT.marketing,
    manageHref: AGENDA_SOURCE_MANAGE_HREF.marketing,
  },
};

function buildMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startPad = first.getDay();
  const cells: Array<{ dateKey: string; day: number; inMonth: boolean }> = [];

  for (let i = 0; i < startPad; i++) {
    cells.push({ dateKey: "", day: 0, inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ dateKey, day: d, inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ dateKey: "", day: 0, inMonth: false });
  }
  return cells;
}

function EventPill({ event, compact }: { event: UnifiedAgendaEvent; compact?: boolean }) {
  return (
    <span
      className={cn(
        "block truncate rounded-md border px-1.5 py-0.5 text-left font-medium leading-tight",
        compact ? "text-[9px] sm:text-[10px]" : "text-[10px] sm:text-xs",
        event.tone,
      )}
      title={`${event.title} — ${event.typeLabel}`}
    >
      {!event.allDay && !compact ? (
        <span className="mr-1 opacity-80">{formatAgendaTime(event.startAt, false)}</span>
      ) : null}
      {event.title}
    </span>
  );
}

export function UnifiedAgendaView() {
  const router = useRouter();
  const { canAccessModule, canAccessDashboard, loading: authLoading } = useAuth();

  const permissions = useMemo(
    () => ({
      futebol: canAccessModule("futebol_logistica"),
      bostonHall: canAccessModule("eventos"),
      consultas: canAccessModule("saude") || canAccessDashboard,
      marketing: canAccessModule("marketing"),
    }),
    [canAccessDashboard, canAccessModule],
  );

  const availableSources = useMemo(
    () =>
      (Object.keys(SOURCE_UI) as AgendaSource[]).filter((s) => {
        if (s === "futebol") return permissions.futebol;
        if (s === "boston-hall") return permissions.bostonHall;
        if (s === "consultas") return permissions.consultas;
        return permissions.marketing;
      }),
    [permissions],
  );

  const [areaFilter, setAreaFilter] = useState<AgendaSource | "all">("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [clubFilter, setClubFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(todayDateKey());
  const [events, setEvents] = useState<UnifiedAgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const canAccessHub =
    canAccessModule("agenda") ||
    canAccessDashboard ||
    availableSources.length > 0;

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessHub) router.replace("/403");
  }, [authLoading, canAccessHub, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchUnifiedAgendaEvents(cursor.year, cursor.month, permissions);
      setEvents(data);
    } finally {
      setLoading(false);
    }
  }, [cursor.month, cursor.year, permissions]);

  useEffect(() => {
    if (!canAccessHub || authLoading) return;
    void load();
  }, [authLoading, canAccessHub, load]);

  const typeOptions = useMemo(() => {
    const labels = new Set(events.map((e) => e.typeLabel));
    return [...labels].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [events]);

  const clubOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of events) {
      if (e.tenantId && e.tenantName) map.set(e.tenantId, e.tenantName);
      else if (e.tenantName) map.set(e.tenantName, e.tenantName);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [events]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return events.filter((e) => {
      if (areaFilter !== "all" && e.source !== areaFilter) return false;
      if (typeFilter !== "all" && e.typeLabel !== typeFilter) return false;
      if (clubFilter !== "all") {
        const clubKey = e.tenantId || e.tenantName || "";
        if (clubKey !== clubFilter) return false;
      }
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.subtitle.toLowerCase().includes(q) ||
        e.typeLabel.toLowerCase().includes(q) ||
        (e.location ?? "").toLowerCase().includes(q) ||
        (e.championshipName ?? "").toLowerCase().includes(q) ||
        (e.tenantName ?? "").toLowerCase().includes(q) ||
        AGENDA_SOURCE_LABELS[e.source].toLowerCase().includes(q)
      );
    });
  }, [areaFilter, clubFilter, events, searchQuery, typeFilter]);

  const byDate = useMemo(() => groupEventsByDate(filteredEvents), [filteredEvents]);

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const grid = useMemo(
    () => buildMonthGrid(cursor.year, cursor.month),
    [cursor.month, cursor.year],
  );

  const listEvents = useMemo(() => {
    const pool = selectedDay
      ? (byDate.get(selectedDay) ?? [])
      : [...filteredEvents].sort((a, b) => a.startAt.localeCompare(b.startAt));
    return pool;
  }, [byDate, filteredEvents, selectedDay]);

  const listGrouped = useMemo(() => {
    if (selectedDay) return [{ dateKey: selectedDay, items: listEvents }];
    const keys = [...new Set(listEvents.map((e) => e.startAt.slice(0, 10)))].sort();
    return keys.map((dateKey) => ({
      dateKey,
      items: listEvents.filter((e) => e.startAt.startsWith(dateKey)),
    }));
  }, [listEvents, selectedDay]);

  const goPrev = () => {
    setCursor((c) =>
      c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 },
    );
  };

  const goNext = () => {
    setCursor((c) =>
      c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 },
    );
  };

  const goToday = () => {
    const n = new Date();
    setCursor({ year: n.getFullYear(), month: n.getMonth() });
    setSelectedDay(todayDateKey());
  };

  if (authLoading || !canAccessHub) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const today = todayDateKey();

  return (
    <div className="space-y-6">
      <DashboardDeptHeader
        section="Agenda"
        sectionIcon={Calendar}
        title="Agenda geral"
        description="Visão consolidada de todos os compromissos. Para cadastrar ou filtrar com mais detalhe, use a agenda do departamento."
        stats={[
          { value: filteredEvents.length, label: "Neste mês" },
          { value: availableSources.length, label: "Áreas" },
        ]}
        toolbar={
          <Button type="button" variant="outline" size="sm" className="min-h-[40px]" onClick={goToday}>
            Hoje
          </Button>
        }
      />

      <Card className="border-border/80">
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar título, clube, local…"
                className="min-h-[44px] pl-9 text-foreground"
              />
            </div>
            <Select
              value={areaFilter}
              onValueChange={(v) => setAreaFilter(v as AgendaSource | "all")}
            >
              <SelectTrigger className="min-h-[44px]">
                <SelectValue placeholder="Área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as áreas</SelectItem>
                {availableSources.map((source) => (
                  <SelectItem key={source} value={source}>
                    {AGENDA_SOURCE_LABELS[source]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={clubFilter} onValueChange={setClubFilter}>
              <SelectTrigger className="min-h-[44px]">
                <SelectValue placeholder="Clube" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clubes</SelectItem>
                {clubOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="min-h-[44px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {typeOptions.map((label) => (
                  <SelectItem key={label} value={label}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {availableSources.length > 0 ? (
            <div className="flex flex-col gap-2 border-t border-border/60 pt-4 sm:flex-row sm:flex-wrap sm:items-center">
              <span className="text-sm font-medium text-muted-foreground">Registrar novo:</span>
              <div className="flex flex-wrap gap-2">
                {availableSources.map((source) => {
                  const meta = SOURCE_UI[source];
                  const Icon = meta.icon;
                  return (
                    <Button key={source} variant="outline" size="sm" className="min-h-[40px] gap-2" asChild>
                      <Link href={AGENDA_SOURCE_CREATE_HREF[source]}>
                        <Plus className="h-4 w-4" />
                        <Icon className="h-4 w-4 opacity-80" />
                        {meta.label}
                      </Link>
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Calendário */}
      <Card className={dash.calendarCard}>
        <CardHeader className="flex flex-col gap-4 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="capitalize text-xl sm:text-2xl">{monthLabel}</CardTitle>
            <CardDescription>Clique em um dia para filtrar a lista de compromissos</CardDescription>
          </div>
          <div className="flex items-center gap-1 self-end sm:self-auto">
            <Button variant="outline" size="icon" className="h-10 w-10" onClick={goPrev} aria-label="Mês anterior">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="icon" className="h-10 w-10" onClick={goNext} aria-label="Próximo mês">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className={cn("h-9 w-9 animate-spin", dash.brandText)} />
            </div>
          ) : (
            <>
              <div className="mb-2 grid grid-cols-7 gap-1">
                {WEEKDAYS.map((wd) => (
                  <div
                    key={wd}
                    className="py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs"
                  >
                    {wd}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {grid.map((cell, idx) => {
                  if (!cell.inMonth) {
                    return <div key={`pad-${idx}`} className="min-h-[72px] sm:min-h-[108px]" />;
                  }
                  const dayEvents = byDate.get(cell.dateKey) ?? [];
                  const isToday = cell.dateKey === today;
                  const isSelected = cell.dateKey === selectedDay;
                  return (
                    <button
                      key={cell.dateKey}
                      type="button"
                      onClick={() => setSelectedDay(cell.dateKey === selectedDay ? null : cell.dateKey)}
                      className={cn(
                        "group flex min-h-[72px] flex-col rounded-xl border p-1.5 text-left transition-all sm:min-h-[108px] sm:p-2",
                        isSelected
                          ? dash.calendarDaySelected
                          : isToday
                            ? dash.calendarDayToday
                            : dash.calendarDay,
                      )}
                    >
                      <span
                        className={cn(
                          "mb-1 flex h-7 w-7 items-center justify-center rounded-lg text-sm font-semibold",
                          isToday && dash.calendarDayNumberToday,
                          isSelected && !isToday && dash.calendarDayNumberSelected,
                          !isToday && !isSelected && "text-foreground",
                        )}
                      >
                        {cell.day}
                      </span>
                      <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                        {dayEvents.slice(0, 3).map((ev) => (
                          <EventPill key={ev.id} event={ev} compact />
                        ))}
                        {dayEvents.length > 3 ? (
                          <span className={cn("text-[10px] font-medium", dash.calendarMore)}>
                            +{dayEvents.length - 3} mais
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Legenda */}
              <div className="mt-4 flex flex-wrap gap-3 border-t border-border/60 pt-4">
                {availableSources.map((source) => {
                  const meta = SOURCE_UI[source];
                  return (
                    <span
                      key={source}
                      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
                    >
                      <span className={cn("h-2 w-2 rounded-full", meta.dotClass)} />
                      {meta.label}
                    </span>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Lista de compromissos */}
      <Card className="border-border/80 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            {selectedDay
              ? formatAgendaDateLong(selectedDay)
              : `Compromissos de ${monthLabel}`}
          </CardTitle>
          <CardDescription>
            {listEvents.length === 0
              ? "Nenhum compromisso neste período."
              : `${listEvents.length} compromisso(s) — cores por área e tipo`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {listGrouped.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nada agendado. Ajuste a busca, os filtros ou escolha outro mês.
            </p>
          ) : (
            listGrouped.map(({ dateKey, items }) => (
              <div key={dateKey}>
                {!selectedDay ? (
                  <p className={cn("mb-3 text-xs font-semibold uppercase tracking-wider", dash.sectionLabel)}>
                    {formatAgendaDateLong(dateKey)}
                  </p>
                ) : null}
                <ul className="space-y-2">
                  {items.map((ev) => {
                    const meta = SOURCE_UI[ev.source];
                    const Icon = meta.icon;
                    return (
                      <li key={ev.id}>
                        <Link
                          href={ev.href}
                          className={cn(
                            "group flex gap-3 rounded-xl border p-3 transition-all sm:gap-4 sm:p-4",
                            dash.eventListItem,
                          )}
                        >
                          <div
                            className={cn("mt-0.5 w-1.5 shrink-0 self-stretch rounded-full", ev.dotClass)}
                            aria-hidden
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={cn("text-base font-semibold leading-snug", dash.eventListTitle)}>
                                {ev.title}
                              </span>
                              <span
                                className={cn(
                                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                  ev.tone,
                                )}
                              >
                                {ev.typeLabel}
                              </span>
                              {ev.statusLabel ? (
                                <span className="rounded-full border border-border/70 bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-foreground">
                                  {ev.statusLabel}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-sm font-medium text-foreground/90">{ev.subtitle}</p>
                            <p className={cn("mt-1.5 text-sm font-semibold", dash.eventListMeta)}>
                              {formatAgendaTime(ev.startAt, ev.allDay)}
                              {ev.endAt && !ev.allDay && ev.source === "futebol" && ev.typeLabel.toLowerCase().includes("viagem")
                                ? ` · jogo ${formatAgendaTime(ev.endAt, false)}`
                                : null}
                            </p>
                            {ev.location ? (
                              <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
                                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                <span>{ev.location}</span>
                              </p>
                            ) : null}
                            {ev.championshipName ? (
                              <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
                                <Trophy className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                <span>{ev.championshipName}</span>
                              </p>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold",
                                meta.tone,
                              )}
                            >
                              <Icon className="h-3 w-3" />
                              {meta.label}
                            </span>
                            <ExternalLink className="h-4 w-4 text-muted-foreground opacity-50 transition-opacity group-hover:opacity-100" />
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}

          {areaFilter !== "all" ? (
            <div className="border-t border-border/60 pt-4">
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <Link href={AGENDA_SOURCE_MANAGE_HREF[areaFilter]}>
                  <ExternalLink className="h-4 w-4" />
                  Abrir agenda — {SOURCE_UI[areaFilter].label}
                </Link>
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
