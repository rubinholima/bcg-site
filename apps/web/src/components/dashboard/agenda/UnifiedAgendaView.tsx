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
  Home,
  Loader2,
  MapPin,
  Megaphone,
  Plane,
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
  agendaMatchSideBadgeClass,
  agendaMatchSideLabel,
} from "@/lib/agenda-match-style";
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
type ViewMode = "day" | "week" | "month";

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
  for (let i = 0; i < startPad; i++) cells.push({ dateKey: "", day: 0, inMonth: false });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ dateKey, day: d, inMonth: true });
  }
  while (cells.length % 7 !== 0) cells.push({ dateKey: "", day: 0, inMonth: false });
  return cells;
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(12, 0, 0, 0);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

function dateKeyFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function EventPill({ event, compact }: { event: UnifiedAgendaEvent; compact?: boolean }) {
  const side = agendaMatchSideLabel(event.matchSide ?? null);
  return (
    <span
      className={cn(
        "block truncate rounded-md border px-1.5 py-0.5 text-left leading-tight",
        compact ? "text-[9px] sm:text-[10px]" : "text-[10px] sm:text-xs",
        event.tone,
      )}
      title={`${side ? `${side} · ` : ""}${event.title} — ${event.typeLabel}`}
    >
      {side && compact ? (
        <span className="mr-0.5 font-bold">{side === "Casa" ? "C" : "F"}</span>
      ) : null}
      {!event.allDay && !compact ? (
        <span className="mr-1 opacity-90">{formatAgendaTime(event.startAt, false)}</span>
      ) : null}
      {event.title}
    </span>
  );
}

function EventDetailCard({ ev }: { ev: UnifiedAgendaEvent }) {
  const meta = SOURCE_UI[ev.source];
  const Icon = meta.icon;
  const sideLabel = agendaMatchSideLabel(ev.matchSide ?? null);
  const SideIcon = ev.matchSide === "casa" ? Home : ev.matchSide === "fora" ? Plane : null;

  return (
    <Link
      href={ev.href}
      className={cn(
        "group flex gap-3 rounded-xl border-2 p-3 shadow-sm transition-all sm:gap-4 sm:p-4",
        ev.matchSide === "casa" &&
          "border-emerald-500/50 bg-gradient-to-br from-emerald-500/15 via-card to-card hover:border-emerald-400",
        ev.matchSide === "fora" &&
          "border-amber-500/50 bg-gradient-to-br from-amber-500/15 via-card to-card hover:border-amber-400",
        !ev.matchSide && cn(dash.eventListItem, "border"),
      )}
    >
      <div
        className={cn("mt-0.5 w-1.5 shrink-0 self-stretch rounded-full", ev.dotClass)}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("text-base font-bold leading-snug sm:text-lg", dash.eventListTitle)}>
            {ev.title}
          </span>
          {sideLabel && SideIcon ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                agendaMatchSideBadgeClass(ev.matchSide ?? null),
              )}
            >
              <SideIcon className="h-3 w-3" />
              {sideLabel}
            </span>
          ) : (
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                ev.tone,
              )}
            >
              {ev.typeLabel}
            </span>
          )}
          {ev.statusLabel ? (
            <span className="rounded-full border border-border/70 bg-background/80 px-2 py-0.5 text-[10px] font-semibold text-foreground">
              {ev.statusLabel}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm font-semibold text-foreground">{ev.subtitle}</p>
        <p className={cn("mt-2 text-sm font-bold", dash.eventListMeta)}>
          {formatAgendaTime(ev.startAt, ev.allDay)}
          {ev.endAt && !ev.allDay && ev.matchSide === "fora"
            ? ` · jogo ${formatAgendaTime(ev.endAt, false)}`
            : null}
        </p>
        {ev.location ? (
          <p className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-foreground/80">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
            <span>{ev.location}</span>
          </p>
        ) : null}
        {ev.championshipName ? (
          <p className="mt-1 flex items-start gap-1.5 text-xs font-medium text-foreground/80">
            <Trophy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
            <span>{ev.championshipName}</span>
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold",
            meta.tone,
          )}
        >
          <Icon className="h-3 w-3" />
          {meta.label}
        </span>
        <ExternalLink className="h-4 w-4 text-muted-foreground opacity-60 transition-opacity group-hover:opacity-100" />
      </div>
    </Link>
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

  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [areaFilter, setAreaFilter] = useState<AgendaSource | "all">("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [clubFilter, setClubFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [focusDate, setFocusDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(todayDateKey());
  const [events, setEvents] = useState<UnifiedAgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const canAccessHub =
    canAccessModule("agenda") || canAccessDashboard || availableSources.length > 0;

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessHub) router.replace("/403");
  }, [authLoading, canAccessHub, router]);

  const loadCursor = useMemo(() => {
    if (viewMode === "day" || viewMode === "week") {
      const d = selectedDay ? new Date(`${selectedDay}T12:00:00`) : focusDate;
      return { year: d.getFullYear(), month: d.getMonth() };
    }
    return { year: focusDate.getFullYear(), month: focusDate.getMonth() };
  }, [focusDate, selectedDay, viewMode]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Carrega mês do foco (+ vizinho na semana se cruzar)
      const months = new Set<string>();
      months.add(`${loadCursor.year}-${loadCursor.month}`);
      if (viewMode === "week" && selectedDay) {
        const start = startOfWeek(new Date(`${selectedDay}T12:00:00`));
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        months.add(`${start.getFullYear()}-${start.getMonth()}`);
        months.add(`${end.getFullYear()}-${end.getMonth()}`);
      }
      const chunks = await Promise.all(
        [...months].map(async (key) => {
          const [y, m] = key.split("-").map(Number);
          return fetchUnifiedAgendaEvents(y!, m!, permissions);
        }),
      );
      const byId = new Map<string, UnifiedAgendaEvent>();
      for (const list of chunks) {
        for (const ev of list) byId.set(ev.id, ev);
      }
      setEvents([...byId.values()]);
    } finally {
      setLoading(false);
    }
  }, [loadCursor.month, loadCursor.year, permissions, selectedDay, viewMode]);

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

  const focusDayKey = selectedDay ?? todayDateKey();

  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date(`${focusDayKey}T12:00:00`));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [focusDayKey]);

  const listEvents = useMemo(() => {
    if (viewMode === "day") return byDate.get(focusDayKey) ?? [];
    if (viewMode === "week") return byDate.get(focusDayKey) ?? [];
    if (selectedDay) return byDate.get(selectedDay) ?? [];
    return [...filteredEvents];
  }, [byDate, filteredEvents, focusDayKey, selectedDay, viewMode]);

  const listGrouped = useMemo(() => {
    if (viewMode === "day" || viewMode === "week") {
      return [{ dateKey: focusDayKey, items: listEvents }];
    }
    const keys = [...new Set(listEvents.map((e) => e.startAt.slice(0, 10)))].sort();
    return keys.map((dateKey) => ({
      dateKey,
      items: listEvents.filter((e) => e.startAt.startsWith(dateKey)),
    }));
  }, [focusDayKey, listEvents, viewMode]);

  const periodLabel = useMemo(() => {
    if (viewMode === "day") return formatAgendaDateLong(focusDayKey);
    if (viewMode === "week") {
      const a = weekDays[0]!;
      const b = weekDays[6]!;
      const fmt = (d: Date) =>
        d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
      return `${fmt(a)} – ${fmt(b)} · ${a.getFullYear()}`;
    }
    return focusDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }, [focusDate, focusDayKey, viewMode, weekDays]);

  const goPrev = () => {
    if (viewMode === "day") {
      const d = new Date(`${focusDayKey}T12:00:00`);
      d.setDate(d.getDate() - 1);
      const key = dateKeyFromDate(d);
      setSelectedDay(key);
      setFocusDate(d);
      return;
    }
    if (viewMode === "week") {
      const d = new Date(`${focusDayKey}T12:00:00`);
      d.setDate(d.getDate() - 7);
      const key = dateKeyFromDate(d);
      setSelectedDay(key);
      setFocusDate(d);
      return;
    }
    setFocusDate((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
  };

  const goNext = () => {
    if (viewMode === "day") {
      const d = new Date(`${focusDayKey}T12:00:00`);
      d.setDate(d.getDate() + 1);
      const key = dateKeyFromDate(d);
      setSelectedDay(key);
      setFocusDate(d);
      return;
    }
    if (viewMode === "week") {
      const d = new Date(`${focusDayKey}T12:00:00`);
      d.setDate(d.getDate() + 7);
      const key = dateKeyFromDate(d);
      setSelectedDay(key);
      setFocusDate(d);
      return;
    }
    setFocusDate((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
  };

  const goToday = () => {
    const n = new Date();
    setFocusDate(n);
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
  const grid = buildMonthGrid(focusDate.getFullYear(), focusDate.getMonth());
  const createHref =
    areaFilter !== "all"
      ? AGENDA_SOURCE_CREATE_HREF[areaFilter]
      : AGENDA_SOURCE_CREATE_HREF.futebol;

  return (
    <div className="space-y-6">
      <DashboardDeptHeader
        section="Agenda"
        sectionIcon={Calendar}
        title="Agenda geral"
        description="Compromissos de futebol, Hall, consultas e comunicação."
        stats={[
          { value: filteredEvents.length, label: "No período" },
          {
            value: filteredEvents.filter((e) => e.matchSide === "casa" || e.matchSide === "fora")
              .length,
            label: "Jogos",
          },
        ]}
        toolbar={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="min-h-[40px]" onClick={goToday}>
              Hoje
            </Button>
            <Button type="button" size="sm" className="min-h-[40px]" asChild>
              <Link href={createHref}>
                <Plus className="mr-1 h-4 w-4" />
                Novo
              </Link>
            </Button>
          </div>
        }
      />

      <Card className="border-border/80">
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="inline-flex rounded-xl border border-border/80 bg-muted/30 p-1">
              {(
                [
                  { id: "day" as const, label: "Dia" },
                  { id: "week" as const, label: "Semana" },
                  { id: "month" as const, label: "Mês" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setViewMode(tab.id)}
                  className={cn(
                    "min-h-[40px] rounded-lg px-4 text-sm font-semibold transition-colors",
                    viewMode === tab.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-10 w-10" onClick={goPrev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <p className="min-w-[160px] text-center text-sm font-bold capitalize sm:min-w-[220px]">
                {periodLabel}
              </p>
              <Button variant="outline" size="icon" className="h-10 w-10" onClick={goNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

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
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div
          className={cn(
            "grid gap-4",
            viewMode === "month" && "lg:grid-cols-[1fr_minmax(280px,360px)]",
          )}
        >
          {viewMode === "month" ? (
            <Card className={cn("border-border/80 shadow-md", dash.calendarCard)}>
              <CardContent className="pt-6">
                <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted-foreground">
                  {WEEKDAYS.map((d) => (
                    <div key={d} className="py-1">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {grid.map((cell, idx) => {
                    if (!cell.inMonth) {
                      return (
                        <div
                          key={`e-${idx}`}
                          className="min-h-[88px] rounded-lg bg-muted/10 sm:min-h-[100px]"
                        />
                      );
                    }
                    const dayEvents = byDate.get(cell.dateKey) ?? [];
                    const isToday = cell.dateKey === today;
                    const isSelected = cell.dateKey === selectedDay;
                    return (
                      <button
                        key={cell.dateKey}
                        type="button"
                        onClick={() => setSelectedDay(cell.dateKey)}
                        className={cn(
                          "flex min-h-[88px] flex-col rounded-lg border p-1 text-left transition-colors sm:min-h-[100px] sm:p-1.5",
                          isToday && dash.calendarDayToday,
                          isSelected && !isToday && dash.calendarDaySelected,
                          !isToday && !isSelected && dash.calendarDay,
                        )}
                      >
                        <span
                          className={cn(
                            "mb-1 flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold",
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
                            <span className={cn("text-[10px] font-bold", dash.calendarMore)}>
                              +{dayEvents.length - 3} mais
                            </span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : viewMode === "week" ? (
            <Card className="border-border/80 shadow-md overflow-x-auto">
              <CardContent className="pt-6">
                <div className="grid min-w-[560px] grid-cols-7 gap-2">
                  {weekDays.map((d) => {
                    const key = dateKeyFromDate(d);
                    const dayEvents = byDate.get(key) ?? [];
                    const isToday = key === today;
                    const isSelected = key === selectedDay;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setSelectedDay(key);
                          setFocusDate(d);
                        }}
                        className={cn(
                          "min-h-[88px] w-full rounded-xl border px-2 py-3 text-center transition-colors",
                          isSelected &&
                            "border-primary bg-primary/15 ring-2 ring-primary/50 shadow-md",
                          isToday && !isSelected && "border-amber-400 bg-amber-500/15",
                          !isSelected && !isToday && "border-border/60 bg-muted/20 hover:bg-muted/40",
                          !isSelected && "opacity-55 hover:opacity-100",
                        )}
                      >
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">
                          {WEEKDAYS[d.getDay()]}
                        </p>
                        <p
                          className={cn(
                            "mx-auto mt-1 flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : isToday
                                ? "bg-amber-500 text-amber-950"
                                : "text-foreground",
                          )}
                        >
                          {d.getDate()}
                        </p>
                        <p className="mt-2 text-[11px] font-semibold text-muted-foreground">
                          {dayEvents.length}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-border/80 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg capitalize">
                {viewMode === "month" && selectedDay
                  ? formatAgendaDateLong(selectedDay)
                  : viewMode === "day" || viewMode === "week"
                    ? formatAgendaDateLong(focusDayKey)
                    : "Compromissos"}
              </CardTitle>
              {listEvents.length > 0 ? (
                <CardDescription>
                  {listEvents.length} compromisso{listEvents.length === 1 ? "" : "s"}
                </CardDescription>
              ) : (
                <CardDescription>Nenhum compromisso neste dia.</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {listGrouped.length === 0 || listEvents.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Nada agendado neste dia.
                </p>
              ) : (
                listGrouped.map(({ dateKey, items }) => (
                  <div key={dateKey}>
                    {viewMode === "month" ? (
                      <p
                        className={cn(
                          "mb-3 text-xs font-bold uppercase tracking-wider",
                          dash.sectionLabel,
                        )}
                      >
                        {formatAgendaDateLong(dateKey)}
                      </p>
                    ) : null}
                    <ul className="space-y-3">
                      {items.map((ev) => (
                        <li key={ev.id}>
                          <EventDetailCard ev={ev} />
                        </li>
                      ))}
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
      )}
    </div>
  );
}
