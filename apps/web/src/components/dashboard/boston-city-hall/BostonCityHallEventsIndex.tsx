"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, List, Loader2, Plus, Search } from "lucide-react";
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
import { BchDestinationPageShell } from "@/components/dashboard/boston-city-hall/BchDestinationPageShell";
import { BchEmptyState } from "@/components/dashboard/boston-city-hall/BchEmptyState";
import { BostonCityHallCreateBchEventDialog } from "@/components/dashboard/boston-city-hall/BostonCityHallCreateBchEventDialog";
import { bchEventWorkspacePath } from "@/components/dashboard/boston-city-hall/bch-app-shell.config";
import { bchEventDisplayName } from "@/components/dashboard/boston-city-hall/bch-operational-display";
import { bchEventSetupPath } from "@/components/dashboard/boston-city-hall/bch-event-setup-path";
import { BchFilterBar } from "@/components/dashboard/boston-city-hall/BchFilterBar";
import {
  bchEventCancelledKpiCount,
  classifyBchEventLifecycle,
  countBchEventLifecycle,
  dedupeEventsById,
  type BchEventLifecycleBucket,
} from "@/components/dashboard/boston-city-hall/bch-events-lifecycle";
import { BCH_BASE } from "@/components/dashboard/boston-city-hall/bch-navigation.config";
import { BCH_BTN_PRIMARY, BCH_CARD, BCH_INPUT, BCH_TABLE_WRAP } from "@/components/dashboard/boston-city-hall/bch-ui-classes";
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

const LIFECYCLE_LABEL: Record<BchEventLifecycleBucket, string> = {
  upcoming: "Próximo",
  preparation: "Preparação",
  in_progress: "Em andamento",
  completed: "Concluído",
  archived: "Arquivado",
};

const LIFECYCLE_CHIP: Record<BchEventLifecycleBucket, string> = {
  upcoming: "border-violet-500/35 bg-violet-500/10 text-violet-200",
  preparation: "border-amber-500/35 bg-amber-500/10 text-amber-100",
  in_progress: "border-emerald-500/35 bg-emerald-500/10 text-emerald-200",
  completed: "border-teal-500/35 bg-teal-500/10 text-teal-200",
  archived: "border-slate-600 bg-slate-900/60 text-slate-400",
};

type LifecycleFilter = BchEventLifecycleBucket | "all";

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
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>("all");
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

  const setLifecycle = (bucket: LifecycleFilter) => {
    setLifecycleFilter(bucket);
    if (bucket === "archived") setStatusFilter("archived");
    else if (bucket === "preparation") setStatusFilter("draft");
    else setStatusFilter("all");
  };

  const lifecycleFilters: { id: LifecycleFilter; label: string; count: number }[] = [
    { id: "all", label: "Todos", count: kpi.total },
    { id: "upcoming", label: "Próximos", count: kpi.upcoming },
    { id: "preparation", label: "Preparação", count: kpi.preparation },
    { id: "in_progress", label: "Em andamento", count: kpi.in_progress },
    { id: "completed", label: "Concluídos", count: kpi.completed },
    {
      id: "archived",
      label: "Arquivados",
      count: kpi.archived + kpi.cancelled,
    },
  ];

  const showSpaceColumn = spaceOptions.length > 0;
  const showTypeColumn = typeOptions.length > 0;

  return (
    <BchDestinationPageShell
      title="Eventos"
      breadcrumbs={[
        { href: BCH_BASE, label: "Boston City Hall" },
        { label: "Eventos" },
      ]}
      actions={
        <Button
          type="button"
          className={cn("min-h-[44px] gap-2", BCH_BTN_PRIMARY)}
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Novo evento
        </Button>
      }
    >
      <section className={cn(BCH_CARD, "space-y-3 py-3 sm:py-4")}>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Fase operacional</p>
        <div className="flex flex-wrap gap-1.5">
          {lifecycleFilters.map((item) => {
            const active = lifecycleFilter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "inline-flex min-h-[40px] items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "border-sky-500/45 bg-sky-500/10 text-sky-100"
                    : "border-slate-800 bg-slate-950/50 text-slate-300 hover:border-slate-700 hover:bg-slate-900/50",
                )}
                onClick={() => setLifecycle(item.id)}
              >
                <span>{item.label}</span>
                <span className={cn("tabular-nums text-xs", active ? "text-sky-200/80" : "text-slate-500")}>
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>
        {kpi.cancelled > 0 ? (
          <p className="text-[11px] text-slate-500">{kpi.cancelled} evento(s) com status cancelado no cadastro.</p>
        ) : null}
      </section>

      <BchFilterBar className="!p-3 sm:!p-4">
        <div className="grid w-full gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-end">
          <div className="relative min-w-0 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, slug ou espaço…"
              className={cn("min-h-[44px] w-full pl-9 text-foreground", BCH_INPUT)}
            />
          </div>
          <NativeSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={cn("min-h-[44px] w-full sm:w-[160px] text-foreground", BCH_INPUT)}
          >
            <option value="all">Publicação: todas</option>
            <option value="draft">Rascunho</option>
            <option value="published">Publicado</option>
            <option value="archived">Arquivado</option>
          </NativeSelect>
          <NativeSelect
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className={cn("min-h-[44px] w-full sm:w-[160px] text-foreground", BCH_INPUT)}
          >
            <option value="dateDesc">Data · mais recente</option>
            <option value="dateAsc">Data · mais antiga</option>
            <option value="nameAsc">Nome A–Z</option>
            <option value="status">Status</option>
          </NativeSelect>
        </div>
        <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          {showSpaceColumn ? (
            <NativeSelect
              value={spaceFilter}
              onChange={(e) => setSpaceFilter(e.target.value)}
              className={cn("min-h-[44px] w-full text-foreground", BCH_INPUT)}
            >
              <option value="all">Espaço · todos</option>
              {spaceOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </NativeSelect>
          ) : null}
          {showTypeColumn ? (
            <NativeSelect
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={cn("min-h-[44px] w-full text-foreground", BCH_INPUT)}
            >
              <option value="all">Tipo · todos</option>
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
            className={cn("min-h-[44px] text-foreground", BCH_INPUT)}
            aria-label="Data inicial"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className={cn("min-h-[44px] text-foreground", BCH_INPUT)}
            aria-label="Data final"
          />
        </div>
        <div className="flex w-full flex-wrap items-center justify-between gap-2 border-t border-slate-800/70 pt-3">
          <p className="text-xs text-slate-500">
            {loading ? "Carregando…" : `${filtered.length} de ${events.length} evento(s) na lista`}
          </p>
          <div className="flex gap-1 rounded-lg border border-slate-800 p-0.5">
            <Button
              type="button"
              size="sm"
              variant={view === "list" ? "secondary" : "ghost"}
              className="min-h-[36px] gap-1 px-2.5"
              onClick={() => setView("list")}
            >
              <List className="h-4 w-4" aria-hidden />
              Lista
            </Button>
            <Button
              type="button"
              size="sm"
              variant={view === "calendar" ? "secondary" : "ghost"}
              className="min-h-[36px] gap-1 px-2.5"
              onClick={() => setView("calendar")}
            >
              <CalendarDays className="h-4 w-4" aria-hidden />
              Calendário
            </Button>
          </div>
        </div>
      </BchFilterBar>

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
        <section className={cn(BCH_CARD, "overflow-hidden p-0")}>
          <div className="border-b border-slate-800/80 px-4 py-3 sm:px-5">
            <p className="text-sm font-semibold text-slate-100">Lista operacional</p>
            <p className="text-xs text-slate-500">Clique na linha para abrir o workspace do evento.</p>
          </div>
          <div className={cn(BCH_TABLE_WRAP, "rounded-none border-0")}>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="h-10 text-slate-400">Evento</TableHead>
                  <TableHead className="hidden h-10 text-slate-400 md:table-cell">Agenda</TableHead>
                  {showSpaceColumn ? (
                    <TableHead className="hidden h-10 text-slate-400 lg:table-cell">Espaço</TableHead>
                  ) : null}
                  {showTypeColumn ? (
                    <TableHead className="hidden h-10 text-slate-400 xl:table-cell">Tipo</TableHead>
                  ) : null}
                  <TableHead className="h-10 text-slate-400">Fase</TableHead>
                  <TableHead className="h-10 text-slate-400">Publicação</TableHead>
                  <TableHead className="hidden h-10 text-slate-400 sm:table-cell">Ingressos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((ev) => {
                  const meta = metaByEventId[ev.id];
                  const workspace = bchEventWorkspacePath(ev.id);
                  const noDate = !ev.startDate;
                  const rowHref = noDate ? bchEventSetupPath(ev.id) : workspace;
                  const lifecycle = classifyBchEventLifecycle(ev);
                  const sublineParts = [formatSchedule(ev)];
                  if (meta?.spaceName && !showSpaceColumn) sublineParts.push(meta.spaceName);
                  if (noDate) sublineParts.push("Completar cadastro");
                  return (
                    <ClickableTableRow
                      key={ev.id}
                      href={rowHref}
                      className="border-slate-800/80 hover:bg-slate-900/50"
                    >
                      <TableCell className="py-3">
                        <p className="font-medium text-slate-100">{bchEventDisplayName(ev.name)}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">{sublineParts.join(" · ")}</p>
                      </TableCell>
                      <TableCell className="hidden py-3 text-sm text-slate-400 md:table-cell">
                        {formatSchedule(ev)}
                      </TableCell>
                      {showSpaceColumn ? (
                        <TableCell className="hidden py-3 text-sm text-slate-400 lg:table-cell">
                          {meta?.spaceName ?? "—"}
                        </TableCell>
                      ) : null}
                      {showTypeColumn ? (
                        <TableCell className="hidden py-3 text-sm capitalize text-slate-400 xl:table-cell">
                          {meta?.eventType?.trim() ?? "—"}
                        </TableCell>
                      ) : null}
                      <TableCell className="py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium",
                            LIFECYCLE_CHIP[lifecycle],
                          )}
                        >
                          {LIFECYCLE_LABEL[lifecycle]}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="rounded-md border border-slate-700 bg-slate-900/50 px-2 py-0.5 text-[11px] text-slate-300">
                          {EVENT_STATUS_LABEL[ev.status] ?? ev.status}
                        </span>
                      </TableCell>
                      <TableCell className="hidden py-3 sm:table-cell">
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
        </section>
      )}

      <BostonCityHallCreateBchEventDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={load} />
    </BchDestinationPageShell>
  );
}
