"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  CalendarDays,
  CheckCircle2,
  Clock,
  LayoutGrid,
  List,
  Loader2,
  PlayCircle,
  Plus,
  Search,
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { BchPageShell } from "@/components/dashboard/boston-city-hall/BchPageShell";
import { BchEmptyState } from "@/components/dashboard/boston-city-hall/BchEmptyState";
import { BostonCityHallCreateBchEventDialog } from "@/components/dashboard/boston-city-hall/BostonCityHallCreateBchEventDialog";
import { bchEventWorkspacePath } from "@/components/dashboard/boston-city-hall/bch-app-shell.config";
import { bchEventDisplayName } from "@/components/dashboard/boston-city-hall/bch-operational-display";
import { bchEventSetupPath } from "@/components/dashboard/boston-city-hall/bch-event-setup-path";
import { BchExecutiveKpiCard } from "@/components/dashboard/boston-city-hall/bch-executive-dashboard-ui";
import {
  bchEventCancelledKpiCount,
  classifyBchEventLifecycle,
  countBchEventLifecycle,
  dedupeEventsById,
  type BchEventLifecycleBucket,
} from "@/components/dashboard/boston-city-hall/bch-events-lifecycle";
import { BCH_BTN_PRIMARY, BCH_TABLE_WRAP } from "@/components/dashboard/boston-city-hall/bch-ui-classes";
import type { EventTicketingEventListItem, VenueOperationListItem } from "@/types/boston-city-hall";
import { EVENT_STATUS_LABEL } from "@/types/boston-city-hall";
import { cn } from "@/lib/utils";

type EventMeta = {
  spaceName?: string;
  eventType?: string | null;
  bookingId?: string;
};

function formatSchedule(ev: EventTicketingEventListItem): string {
  if (!ev.startDate) return "Data a definir";
  const s = new Date(ev.startDate);
  if (Number.isNaN(s.getTime())) return "Data a definir";
  let text = s.toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" });
  if (ev.endDate) {
    const e = new Date(ev.endDate);
    if (!Number.isNaN(e.getTime())) {
      text += ` – ${e.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    }
  }
  return text;
}

function parseDateInput(isoDay: string): Date | null {
  if (!isoDay) return null;
  const d = new Date(`${isoDay}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function BostonCityHallEventsIndex() {
  const [rawEvents, setRawEvents] = useState<EventTicketingEventListItem[]>([]);
  const [metaByEventId, setMetaByEventId] = useState<Record<string, EventMeta>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [spaceFilter, setSpaceFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState("dateDesc");
  const [lifecycleFilter, setLifecycleFilter] = useState<BchEventLifecycleBucket | "all">("all");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });

  const load = () => {
    setLoading(true);
    setError(null);
    void Promise.all([
      api.get<EventTicketingEventListItem[]>("/boston-city-hall/ticketing/events"),
      api.get<VenueOperationListItem[]>("/boston-city-hall/operations"),
    ])
      .then(([evRes, opsRes]) => {
        setRawEvents(dedupeEventsById(Array.isArray(evRes.data) ? evRes.data : []));
        const map: Record<string, EventMeta> = {};
        for (const op of Array.isArray(opsRes.data) ? opsRes.data : []) {
          if (!op.event?.id) continue;
          map[op.event.id] = {
            spaceName: op.spaceName?.trim() || undefined,
            eventType: op.eventType,
            bookingId: op.bookingId,
          };
        }
        setMetaByEventId(map);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar eventos."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const events = rawEvents;

  const kpi = useMemo(() => {
    const c = countBchEventLifecycle(events);
    return { ...c, cancelled: bchEventCancelledKpiCount(events) };
  }, [events]);

  const spaceOptions = useMemo(() => {
    const set = new Set<string>();
    for (const ev of events) {
      const s = metaByEventId[ev.id]?.spaceName;
      if (s) set.add(s);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [events, metaByEventId]);

  const typeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const ev of events) {
      const t = metaByEventId[ev.id]?.eventType?.trim();
      if (t) set.add(t);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [events, metaByEventId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = parseDateInput(dateFrom);
    const to = parseDateInput(dateTo);
    if (to) to.setHours(23, 59, 59, 999);

    let list = events.filter((ev) => {
      if (statusFilter !== "all" && ev.status !== statusFilter) return false;
      if (lifecycleFilter !== "all" && classifyBchEventLifecycle(ev) !== lifecycleFilter) return false;
      const meta = metaByEventId[ev.id];
      if (spaceFilter !== "all" && meta?.spaceName !== spaceFilter) return false;
      if (typeFilter !== "all" && (meta?.eventType ?? "") !== typeFilter) return false;
      if (q) {
        const hay = [ev.name, ev.slug, meta?.spaceName, meta?.eventType, EVENT_STATUS_LABEL[ev.status]]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (from || to) {
        if (!ev.startDate) return false;
        const start = new Date(ev.startDate);
        if (Number.isNaN(start.getTime())) return false;
        if (from && start < from) return false;
        if (to && start > to) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sort === "nameAsc") return a.name.localeCompare(b.name, "pt-BR");
      if (sort === "status") return a.status.localeCompare(b.status) || a.name.localeCompare(b.name, "pt-BR");
      const ta = a.startDate ? new Date(a.startDate).getTime() : 0;
      const tb = b.startDate ? new Date(b.startDate).getTime() : 0;
      if (sort === "dateAsc") return ta - tb || a.name.localeCompare(b.name, "pt-BR");
      return tb - ta || a.name.localeCompare(b.name, "pt-BR");
    });
    return list;
  }, [
    events,
    search,
    statusFilter,
    spaceFilter,
    typeFilter,
    dateFrom,
    dateTo,
    sort,
    lifecycleFilter,
    metaByEventId,
  ]);

  const calendarCells = useMemo(() => {
    const { year, month } = calendarMonth;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startWeekday = new Date(year, month, 1).getDay();
    const byDay = new Map<string, EventTicketingEventListItem[]>();
    for (const ev of filtered) {
      if (!ev.startDate) continue;
      const key = ev.startDate.slice(0, 10);
      const list = byDay.get(key) ?? [];
      list.push(ev);
      byDay.set(key, list);
    }
    return {
      daysInMonth,
      startWeekday,
      byDay,
      label: new Date(year, month, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
    };
  }, [filtered, calendarMonth]);

  const setLifecycle = (bucket: BchEventLifecycleBucket | "all") => {
    setLifecycleFilter(bucket);
    if (bucket === "archived") setStatusFilter("archived");
    else if (bucket === "preparation") setStatusFilter("draft");
    else setStatusFilter("all");
  };

  return (
    <BchPageShell>
      <header className="flex flex-col gap-3 rounded-xl border border-slate-800/80 bg-gradient-to-r from-[#0a101c] via-[#0c1222] to-[#0a101c] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src="/boston-city-hall-logo.png"
            alt=""
            className="h-11 w-11 shrink-0 rounded-full object-contain ring-2 ring-amber-500/25"
          />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-500/90">
              Boston City Hall
            </p>
            <h1 className="text-xl font-bold text-slate-50 sm:text-2xl">Eventos</h1>
            <p className="text-sm text-slate-400">Gestão operacional de eventos do venue</p>
          </div>
        </div>
        <Button
          type="button"
          className={cn("min-h-[44px] shrink-0 gap-2", BCH_BTN_PRIMARY)}
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Novo evento
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <BchExecutiveKpiCard
          onFilterClick={() => setLifecycle("all")}
          navHint="Mostrar todos os eventos"
          label="Total"
          value={kpi.total}
          icon={LayoutGrid}
          accent="sky"
        />
        <BchExecutiveKpiCard
          onFilterClick={() => setLifecycle("upcoming")}
          navHint="Eventos com data futura"
          label="Próximos"
          value={kpi.upcoming}
          icon={CalendarDays}
          accent="violet"
        />
        <BchExecutiveKpiCard
          onFilterClick={() => setLifecycle("preparation")}
          navHint="Rascunhos e sem data"
          label="Em preparação"
          value={kpi.preparation}
          icon={Clock}
          accent="amber"
        />
        <BchExecutiveKpiCard
          onFilterClick={() => setLifecycle("in_progress")}
          navHint="Em andamento agora"
          label="Em progresso"
          value={kpi.in_progress}
          icon={PlayCircle}
          accent="emerald"
        />
        <BchExecutiveKpiCard
          onFilterClick={() => setLifecycle("completed")}
          navHint="Data encerrada"
          label="Concluídos"
          value={kpi.completed}
          icon={CheckCircle2}
          accent="teal"
        />
        <BchExecutiveKpiCard
          onFilterClick={() => setLifecycle("archived")}
          navHint="Status arquivado (não há cancelado no cadastro)"
          label="Arquivados"
          value={kpi.archived + kpi.cancelled}
          icon={Archive}
          accent="rose"
          footerStatus={kpi.cancelled > 0 ? `${kpi.cancelled} cancelado(s)` : undefined}
        />
      </div>

      <div className="rounded-xl border border-slate-800/80 bg-[#0c1222]/55 p-3 xl:p-3">
        <div
          className={cn(
            "grid grid-cols-1 gap-2",
            "md:grid-cols-2 md:gap-2.5",
            "xl:flex xl:flex-nowrap xl:items-center xl:gap-2.5",
          )}
        >
          <div className="relative min-w-0 md:col-span-2 xl:col-auto xl:w-[min(100%,280px)] xl:min-w-[240px] xl:max-w-[300px] xl:shrink-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar evento…"
              className="h-10 min-h-0 w-full border-slate-700 bg-slate-950/50 pl-9 text-foreground"
            />
          </div>
          <NativeSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 min-h-0 w-full border-slate-700 bg-slate-950/50 text-foreground md:w-auto xl:w-[150px] xl:max-w-[170px] xl:shrink-0"
          >
            <option value="all">Status: todos</option>
            <option value="draft">Rascunho</option>
            <option value="published">Publicado</option>
            <option value="archived">Arquivado</option>
          </NativeSelect>
          <NativeSelect
            value={spaceFilter}
            onChange={(e) => setSpaceFilter(e.target.value)}
            className="h-10 min-h-0 w-full border-slate-700 bg-slate-950/50 text-foreground md:w-auto xl:w-[150px] xl:max-w-[170px] xl:shrink-0"
          >
            <option value="all">Espaço: todos</option>
            {spaceOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </NativeSelect>
          {typeOptions.length > 0 ? (
            <NativeSelect
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-10 min-h-0 w-full border-slate-700 bg-slate-950/50 text-foreground md:w-auto xl:w-[150px] xl:max-w-[170px] xl:shrink-0"
            >
              <option value="all">Tipo: todos</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </NativeSelect>
          ) : null}
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-10 min-h-0 w-full border-slate-700 bg-slate-950/50 text-foreground md:w-auto xl:w-[145px] xl:shrink-0"
            aria-label="Data inicial"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-10 min-h-0 w-full border-slate-700 bg-slate-950/50 text-foreground md:w-auto xl:w-[145px] xl:shrink-0"
            aria-label="Data final"
          />
          <NativeSelect
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-10 min-h-0 w-full border-slate-700 bg-slate-950/50 text-foreground md:w-auto xl:w-[150px] xl:shrink-0"
          >
            <option value="dateDesc">Ordenar: data ↓</option>
            <option value="dateAsc">Ordenar: data ↑</option>
            <option value="nameAsc">Ordenar: nome</option>
            <option value="status">Ordenar: status</option>
          </NativeSelect>
          <div className="flex shrink-0 gap-1 rounded-lg border border-slate-800 p-0.5 md:col-span-2 md:justify-self-start xl:col-auto xl:ml-auto xl:justify-self-auto">
            <Button
              type="button"
              size="sm"
              variant={view === "list" ? "secondary" : "ghost"}
              className="h-9 min-h-0 gap-1 px-2.5"
              onClick={() => setView("list")}
            >
              <List className="h-4 w-4" aria-hidden />
              Lista
            </Button>
            <Button
              type="button"
              size="sm"
              variant={view === "calendar" ? "secondary" : "ghost"}
              className="h-9 min-h-0 gap-1 px-2.5"
              onClick={() => setView("calendar")}
            >
              <CalendarDays className="h-4 w-4" aria-hidden />
              Calendário
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-sky-400/80" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          <p>{error}</p>
          <Button type="button" variant="outline" size="sm" className="mt-3 min-h-[40px]" onClick={load}>
            Tentar novamente
          </Button>
        </div>
      ) : events.length === 0 ? (
        <BchEmptyState message="Nenhum evento cadastrado." action={
          <Button type="button" className={cn("min-h-[44px]", BCH_BTN_PRIMARY)} onClick={() => setCreateOpen(true)}>
            Novo evento
          </Button>
        } />
      ) : view === "calendar" ? (
        <div className="rounded-xl border border-slate-800/80 bg-[#0c1222]/55 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold capitalize text-slate-100">{calendarCells.label}</h2>
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-slate-700"
                onClick={() =>
                  setCalendarMonth((c) =>
                    c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 },
                  )
                }
              >
                ‹
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-slate-700"
                onClick={() =>
                  setCalendarMonth((c) =>
                    c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 },
                  )
                }
              >
                ›
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-slate-500">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: calendarCells.startWeekday }).map((_, i) => (
              <div key={`e-${i}`} className="min-h-[72px] rounded-md bg-slate-950/20" />
            ))}
            {Array.from({ length: calendarCells.daysInMonth }).map((_, i) => {
              const day = i + 1;
              const key = `${calendarMonth.year}-${String(calendarMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const items = calendarCells.byDay.get(key) ?? [];
              return (
                <div
                  key={key}
                  className="min-h-[72px] rounded-md border border-slate-800/70 bg-slate-950/30 p-1"
                >
                  <span className="text-[10px] font-semibold text-slate-500">{day}</span>
                  <div className="mt-0.5 space-y-0.5">
                    {items.slice(0, 2).map((ev) => (
                      <Link
                        key={ev.id}
                        href={bchEventWorkspacePath(ev.id)}
                        className="block truncate rounded bg-sky-500/15 px-1 py-0.5 text-[9px] text-sky-200 hover:bg-sky-500/25"
                        title={ev.name}
                      >
                        {bchEventDisplayName(ev.name)}
                      </Link>
                    ))}
                    {items.length > 2 ? (
                      <span className="text-[9px] text-slate-600">+{items.length - 2}</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <BchEmptyState message="Nenhum evento corresponde aos filtros." />
      ) : (
        <div className={BCH_TABLE_WRAP}>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-400">Evento</TableHead>
                <TableHead className="hidden text-slate-400 md:table-cell">Data / horário</TableHead>
                <TableHead className="hidden text-slate-400 lg:table-cell">Espaço</TableHead>
                <TableHead className="hidden text-slate-400 xl:table-cell">Tipo</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="hidden text-slate-400 sm:table-cell">Bilheteria</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((ev) => {
                const meta = metaByEventId[ev.id];
                const workspace = bchEventWorkspacePath(ev.id);
                const noDate = !ev.startDate;
                const rowHref = noDate ? bchEventSetupPath(ev.id) : workspace;
                return (
                  <ClickableTableRow
                    key={ev.id}
                    href={rowHref}
                    className="border-slate-800/80 hover:bg-slate-900/50"
                  >
                    <TableCell className="max-w-[200px] font-medium text-slate-100 sm:max-w-none">
                      {bchEventDisplayName(ev.name)}
                      <p className="mt-0.5 text-xs text-slate-500 md:hidden">{formatSchedule(ev)}</p>
                    </TableCell>
                    <TableCell className="hidden text-sm text-slate-400 md:table-cell">
                      {formatSchedule(ev)}
                    </TableCell>
                    <TableCell className="hidden text-sm text-slate-400 lg:table-cell">
                      {meta?.spaceName ?? "—"}
                    </TableCell>
                    <TableCell className="hidden text-sm capitalize text-slate-400 xl:table-cell">
                      {meta?.eventType?.trim() ?? "—"}
                    </TableCell>
                    <TableCell>
                      <span className="rounded-md border border-slate-700 bg-slate-900/50 px-2 py-0.5 text-[11px] text-slate-300">
                        {EVENT_STATUS_LABEL[ev.status] ?? ev.status}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span
                        className={cn(
                          "rounded-md border px-2 py-0.5 text-[11px]",
                          ev.ticketingEnabled
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                            : "border-slate-700 text-slate-500",
                        )}
                      >
                        {ev.ticketingEnabled ? "Ativa" : "Off"}
                      </span>
                    </TableCell>
                  </ClickableTableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <BostonCityHallCreateBchEventDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={load} />
    </BchPageShell>
  );
}
