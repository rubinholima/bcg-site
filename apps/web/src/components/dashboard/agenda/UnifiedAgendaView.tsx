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
  Palette,
  Plane,
  Plus,
  Search,
  Settings2,
  Shirt,
  Trophy,
} from "lucide-react";
import { DashboardDeptHeader } from "@/components/dashboard/DashboardDeptHeader";
import { AgendaColorsDialog } from "@/components/dashboard/agenda/AgendaColorsDialog";
import {
  AgendaDualToneBars,
  AgendaDualTonePill,
} from "@/components/dashboard/agenda/AgendaDualToneMark";
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
import { useFixtureCategories } from "@/hooks/useFixtureCategories";
import {
  agendaMatchSideBadgeClass,
  agendaMatchSideLabel,
} from "@/lib/agenda-match-style";
import {
  agendaSwatchStyle,
  loadAgendaColors,
  type AgendaColorKey,
  type AgendaColorSwatch,
} from "@/lib/agenda-color-prefs";
import {
  loadSquadCategoryColors,
  resolveSquadCategoryColor,
  type SquadCategoryColor,
} from "@/lib/agenda-squad-category-colors";
import {
  AGENDA_SOURCE_CREATE_HREF,
  AGENDA_SOURCE_DOT,
  AGENDA_SOURCE_LABELS,
  AGENDA_SOURCE_MANAGE_HREF,
  AGENDA_SOURCE_TONE,
  buildPermissionsFromAreas,
  eventMatchesSquadCategory,
  fetchUnifiedAgendaEvents,
  formatAgendaDateLong,
  formatAgendaTime,
  groupEventsByDate,
  todayDateKey,
  type AgendaSource,
  type UnifiedAgendaEvent,
} from "@/lib/unified-agenda";
import {
  fetchAgendaConfig,
  type AgendaAreaRow,
  type AgendaConfigPayload,
} from "@/lib/agenda-config";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { dash } from "@/lib/dashboard-theme-classes";
import { getCategoryLabel } from "@/lib/fixture-categories";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
type ViewMode = "day" | "week" | "month";

const AREA_ICONS: Record<string, LucideIcon> = {
  futebol: Shirt,
  psicologia: ClipboardList,
  consultas: ClipboardList,
  "boston-hall": Building2,
  marketing: Megaphone,
};

function areaUi(area: AgendaAreaRow) {
  const slug = area.slug;
  return {
    label: area.label,
    icon: AREA_ICONS[slug] ?? Calendar,
    tone: AGENDA_SOURCE_TONE[slug] ?? AGENDA_SOURCE_TONE.futebol,
    dotClass: AGENDA_SOURCE_DOT[slug] ?? "bg-zinc-400",
    manageHref: area.manageHref,
    createHref: area.createHref ?? area.manageHref,
  };
}

function areaLabel(slug: string, areas: AgendaAreaRow[]): string {
  const found = areas.find((a) => a.slug === slug);
  return found?.label ?? AGENDA_SOURCE_LABELS[slug] ?? slug;
}

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

function eventTypeStyle(
  event: UnifiedAgendaEvent,
  eventColors: Record<AgendaColorKey, AgendaColorSwatch>,
): { backgroundColor: string; color: string; borderColor: string } {
  if (event.source === "futebol" || event.eventType) {
    return agendaSwatchStyle(eventColors, event.eventType ?? "outro", event.matchSide);
  }
  if (event.categoryPillStyle) return event.categoryPillStyle;
  return { backgroundColor: "#52525b", color: "#ffffff", borderColor: "#a1a1aa" };
}

function EventPill({
  event,
  compact,
  squadColors,
  eventColors,
}: {
  event: UnifiedAgendaEvent;
  compact?: boolean;
  squadColors: Record<string, SquadCategoryColor>;
  eventColors: Record<AgendaColorKey, AgendaColorSwatch>;
}) {
  const side = agendaMatchSideLabel(event.matchSide ?? null);
  const squad = resolveSquadCategoryColor(squadColors, event.categoryValue);
  const squadLabel = event.categoryValue
    ? getCategoryLabel(event.categoryValue, "pt")
    : event.categoryLabel?.split(",")[0]?.trim() || null;
  const eventStyle = eventTypeStyle(event, eventColors);
  const cat = event.categoryLabel?.trim() || null;
  return (
    <AgendaDualTonePill
      compact={compact}
      squadLabel={squadLabel}
      squadColor={squad}
      eventStyle={eventStyle}
      title={`${side ? `${side} · ` : ""}${cat ? `${cat} · ` : ""}${event.title} — ${event.typeLabel}`}
    >
      {side && compact ? (
        <span className="mr-0.5 font-bold">{side === "Casa" ? "C" : "F"}</span>
      ) : null}
      {!event.allDay && !compact ? (
        <span className="mr-1 opacity-90 normal-case">{formatAgendaTime(event.startAt, false)}</span>
      ) : null}
      {event.title}
    </AgendaDualTonePill>
  );
}

function EventDetailCard({
  ev,
  areas,
  squadColors,
  eventColors,
}: {
  ev: UnifiedAgendaEvent;
  areas: AgendaAreaRow[];
  squadColors: Record<string, SquadCategoryColor>;
  eventColors: Record<AgendaColorKey, AgendaColorSwatch>;
}) {
  const area = areas.find((a) => a.slug === ev.source);
  const meta = area ? areaUi(area) : {
    label: areaLabel(ev.source, areas),
    icon: Calendar,
    tone: AGENDA_SOURCE_TONE.futebol,
    dotClass: "bg-zinc-400",
    manageHref: AGENDA_SOURCE_MANAGE_HREF.futebol,
  };
  const Icon = meta.icon;
  const sideLabel = agendaMatchSideLabel(ev.matchSide ?? null);
  const SideIcon = ev.matchSide === "casa" ? Home : ev.matchSide === "fora" ? Plane : null;
  const squad = resolveSquadCategoryColor(squadColors, ev.categoryValue);
  const eventStyle = eventTypeStyle(ev, eventColors);

  return (
    <Link
      href={ev.href}
      className={cn(
        "group flex gap-3 rounded-xl border-2 p-3 shadow-sm transition-all sm:gap-4 sm:p-4",
        "border-border/80 bg-card hover:border-primary/40",
      )}
      style={{
        borderColor: eventStyle.borderColor,
        background: `linear-gradient(135deg, ${eventStyle.backgroundColor}28 0%, hsl(var(--card)) 55%)`,
      }}
    >
      <AgendaDualToneBars squad={squad} event={eventStyle} className="w-auto" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "text-base font-bold uppercase leading-snug tracking-wide sm:text-lg",
              dash.eventListTitle,
            )}
          >
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
              className="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={eventStyle}
            >
              {ev.typeLabel}
            </span>
          )}
          {ev.statusLabel ? (
            <span className="rounded-full border border-border/70 bg-background/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-foreground">
              {ev.statusLabel}
            </span>
          ) : null}
          {ev.categoryLabel ? (
            <span
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={
                squad
                  ? { backgroundColor: squad.bg, color: squad.text, borderColor: squad.bg }
                  : undefined
              }
            >
              <Shirt className="h-3 w-3" />
              {ev.categoryLabel}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-foreground">{ev.subtitle}</p>
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
            "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-wide",
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
  const { canAccessModule, canAccessDashboard, loading: authLoading, isSuperAdmin } = useAuth();

  const [agendaConfig, setAgendaConfig] = useState<AgendaConfigPayload | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(() => {
    fetchAgendaConfig()
      .then(setAgendaConfig)
      .catch(() => setAgendaConfig({ areas: [], categories: [] }))
      .finally(() => setConfigLoading(false));
  }, []);

  const visibleAreas = agendaConfig?.areas ?? [];

  const permissions = useMemo(
    () => (agendaConfig ? buildPermissionsFromAreas(agendaConfig.areas) : {
      futebol: canAccessModule("futebol_logistica"),
      "boston-hall": canAccessModule("eventos"),
      consultas: canAccessModule("psicologia") || canAccessModule("saude") || canAccessDashboard,
      marketing: canAccessModule("marketing"),
    }),
    [agendaConfig, canAccessDashboard, canAccessModule],
  );

  const availableSources = useMemo(
    () => visibleAreas.map((a) => a.slug),
    [visibleAreas],
  );

  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [areaFilter, setAreaFilter] = useState<AgendaSource | "all">("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [clubFilter, setClubFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [focusDate, setFocusDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(todayDateKey());
  const [events, setEvents] = useState<UnifiedAgendaEvent[]>([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [colorTick, setColorTick] = useState(0);
  const eventColors = useMemo(() => loadAgendaColors(), [colorTick]);
  const squadColors = useMemo(() => loadSquadCategoryColors(), [colorTick]);
  const [loading, setLoading] = useState(true);

  const { categories: fixtureCategories } = useFixtureCategories({ activeOnly: true });

  const canAccessHub =
    canAccessModule("agenda") || canAccessDashboard || availableSources.length > 0;

  const categoriesForDropdown = useMemo(() => {
    const merged = [...fixtureCategories];
    const seen = new Set(merged.map((c) => c.value));
    for (const e of events) {
      for (const slug of e.squadCategories ?? []) {
        if (!seen.has(slug)) {
          seen.add(slug);
          merged.push({
            value: slug,
            labelPT: slug,
            labelEN: slug,
            active: true,
          });
        }
      }
    }
    return merged.sort((a, b) =>
      (a.labelPT || a.value).localeCompare(b.labelPT || b.value, "pt-BR"),
    );
  }, [events, fixtureCategories]);

  useEffect(() => {
    if (categoryFilter === "all") return;
    if (!categoriesForDropdown.some((c) => c.value === categoryFilter)) {
      setCategoryFilter("all");
    }
  }, [categoryFilter, categoriesForDropdown]);

  useEffect(() => {
    if (authLoading || configLoading) return;
    if (!canAccessHub) router.replace("/403");
  }, [authLoading, configLoading, canAccessHub, router]);

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
          return fetchUnifiedAgendaEvents(y!, m!, permissions, agendaConfig ?? undefined);
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
  }, [loadCursor.month, loadCursor.year, permissions, selectedDay, viewMode, agendaConfig]);

  useEffect(() => {
    if (!canAccessHub || authLoading || configLoading) return;
    void load();
  }, [authLoading, configLoading, canAccessHub, load]);

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
      if (!eventMatchesSquadCategory(e, categoryFilter)) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.subtitle.toLowerCase().includes(q) ||
        e.typeLabel.toLowerCase().includes(q) ||
        (e.categoryLabel ?? "").toLowerCase().includes(q) ||
        (e.location ?? "").toLowerCase().includes(q) ||
        (e.championshipName ?? "").toLowerCase().includes(q) ||
        (e.tenantName ?? "").toLowerCase().includes(q) ||
        areaLabel(e.source, visibleAreas).toLowerCase().includes(q)
      );
    });
  }, [areaFilter, categoryFilter, clubFilter, events, searchQuery, typeFilter, visibleAreas]);

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

  if (authLoading || configLoading || !canAccessHub) {
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
      ? visibleAreas.find((a) => a.slug === areaFilter)?.createHref ??
        visibleAreas.find((a) => a.slug === areaFilter)?.manageHref ??
        AGENDA_SOURCE_CREATE_HREF[areaFilter] ??
        "/dashboard/agenda"
      : visibleAreas[0]?.createHref ?? visibleAreas[0]?.manageHref ?? "/dashboard/futebol/logistica/agenda?new=1";

  return (
    <div className="space-y-6">
      <DashboardDeptHeader
        section="Agenda"
        sectionIcon={Calendar}
        title="Agenda geral"
        description="Cada compromisso mostra duas cores: faixa do elenco (Sub-15…) e fundo do tipo (treino, jogo…). Use o botão Cores para alterar."
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-[40px]"
              onClick={() => setPaletteOpen(true)}
            >
              <Palette className="mr-1 h-4 w-4" />
              Cores
            </Button>
            {isSuperAdmin ? (
              <Button type="button" variant="outline" size="sm" className="min-h-[40px]" asChild>
                <Link href="/dashboard/agenda/configuracao">
                  <Settings2 className="mr-1 h-4 w-4" />
                  Áreas (admin)
                </Link>
              </Button>
            ) : null}
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

          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar título, clube, categoria, local…"
                className="min-h-[44px] pl-9 text-foreground"
              />
            </div>
            <div className="grid gap-3 grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
                    {areaLabel(source, visibleAreas)}
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
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="min-h-[44px]">
                <SelectValue placeholder="Categoria (elenco)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categoriesForDropdown.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.labelPT || c.value}
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
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4">
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
                <div className="grid grid-cols-7 gap-1.5">
                  {grid.map((cell, idx) => {
                    if (!cell.inMonth) {
                      return (
                        <div
                          key={`e-${idx}`}
                          className="min-h-[100px] rounded-lg bg-muted/10 sm:min-h-[120px] lg:min-h-[132px]"
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
                          "flex min-h-[100px] flex-col rounded-lg border p-1 text-left transition-colors sm:min-h-[120px] sm:p-1.5 lg:min-h-[132px]",
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
                          {dayEvents.slice(0, 4).map((ev) => (
                            <EventPill
                              key={ev.id}
                              event={ev}
                              compact
                              squadColors={squadColors}
                              eventColors={eventColors}
                            />
                          ))}
                          {dayEvents.length > 4 ? (
                            <span className={cn("text-[10px] font-bold", dash.calendarMore)}>
                              +{dayEvents.length - 4} mais
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
            <CardContent className="max-h-[min(70vh,640px)] space-y-6 overflow-y-auto overscroll-contain">
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
                          <EventDetailCard
                            ev={ev}
                            areas={visibleAreas}
                            squadColors={squadColors}
                            eventColors={eventColors}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}

              {areaFilter !== "all" ? (
                <div className="border-t border-border/60 pt-4">
                  <Button variant="outline" size="sm" className="gap-2" asChild>
                    <Link
                      href={
                        visibleAreas.find((a) => a.slug === areaFilter)?.manageHref ??
                        AGENDA_SOURCE_MANAGE_HREF[areaFilter] ??
                        "/dashboard/agenda"
                      }
                    >
                      <ExternalLink className="h-4 w-4" />
                      Abrir agenda — {areaLabel(areaFilter, visibleAreas)}
                    </Link>
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}

      <AgendaColorsDialog
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        squadCategories={fixtureCategories}
        onColorsChange={() => setColorTick((n) => n + 1)}
      />
    </div>
  );
}
