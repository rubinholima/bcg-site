"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Palette,
  Plus,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatDateDayMonYear, formatMonthYear } from "@/lib/format-date";
import { AgendaColorsDialog } from "@/components/dashboard/agenda/AgendaColorsDialog";
import {
  AgendaDualToneBars,
  AgendaDualTonePill,
} from "@/components/dashboard/agenda/AgendaDualToneMark";
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
import { filterCategoriesForTenant, getCategoryLabel } from "@/lib/fixture-categories";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";
import { formatTravelCategoriesDisplay } from "@/lib/travel-categories-utils";
import { BOOKING_STATUS_LABEL } from "@/types/boston-city-hall";
import { isFootballKind } from "@/lib/home-data";
import type {
  FootballAgendaCalendarItem,
  FootballAgendaEntry,
  FootballAgendaOverview,
} from "@/types/futebol-agenda";
import {
  FOOTBALL_AGENDA_ENTRY_TYPES,
  FOOTBALL_AGENDA_TYPE_LABEL,
  TRAVEL_STATUS_LABEL,
} from "@/types/futebol-agenda";
import { cn } from "@/lib/utils";
import {
  agendaMatchSideLabel,
  compareAgendaEventsByPriority,
  type AgendaMatchSide,
} from "@/lib/agenda-match-style";
import {
  DEFAULT_AGENDA_COLORS,
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
import { combineDateTimeBrazil, dateKeyInBrazil, timeInBrazil } from "@/lib/brazil-time";
import {
  AGENDA_DAY_PERIOD_HOURS,
  AGENDA_DAY_PERIOD_LABEL,
  AGENDA_DAY_PERIODS,
  isAgendaDayPeriod,
  type AgendaDayPeriod,
} from "@/lib/travel-itinerary.types";
import { NativeSelect } from "@/components/ui/native-select";

interface Tenant {
  id: string;
  name: string;
  kind?: { name: string };
  categories?: string[] | null;
}

type ViewMode = "day" | "week" | "month";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

function monthRange(year: number, month: number) {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0, 23, 59, 59);
  return { from: from.toISOString(), to: to.toISOString() };
}

function dateKeyFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayKey(): string {
  return dateKeyFromDate(new Date());
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(12, 0, 0, 0);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

function viewRange(focusDate: Date, mode: ViewMode) {
  if (mode === "day") {
    const from = new Date(focusDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(focusDate);
    to.setHours(23, 59, 59, 999);
    return { from: from.toISOString(), to: to.toISOString() };
  }
  if (mode === "week") {
    const start = startOfWeek(focusDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { from: start.toISOString(), to: end.toISOString() };
  }
  return monthRange(focusDate.getFullYear(), focusDate.getMonth());
}

function sortAgendaItems(items: FootballAgendaCalendarItem[]) {
  return [...items].sort((a, b) =>
    compareAgendaEventsByPriority(
      { type: a.type, startAt: a.startAt },
      { type: b.type, startAt: b.startAt },
    ),
  );
}

function matchSideOf(item: FootballAgendaCalendarItem): AgendaMatchSide {
  if (item.isOurTeamHome === true) return "casa";
  if (item.isOurTeamHome === false) return "fora";
  if (item.type === "viagem") return "fora";
  return null;
}

function formatTime(iso: string, allDay: boolean, dayPeriod?: string | null): string {
  if (dayPeriod === "manha" || dayPeriod === "tarde" || dayPeriod === "noite") {
    return AGENDA_DAY_PERIOD_LABEL[dayPeriod];
  }
  if (allDay) return "Dia inteiro";
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDateLong(iso: string): string {
  return formatDateDayMonYear(iso);
}

function periodLabel(focusDate: Date, mode: ViewMode): string {
  if (mode === "day") {
    return formatDateLong(`${dateKeyFromDate(focusDate)}T12:00:00`);
  }
  if (mode === "week") {
    const start = startOfWeek(focusDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${formatDateDayMonYear(start)} – ${formatDateDayMonYear(end)}`;
  }
  return formatMonthYear(
    new Date(focusDate.getFullYear(), focusDate.getMonth(), 1),
  );
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
  dayPeriod: "" | AgendaDayPeriod;
  spaceId: string;
  location: string;
  description: string;
  status: string;
};

type ActivitySpace = { id: string; name: string };

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
  dayPeriod: "",
  spaceId: "",
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
  return combineDateTimeBrazil(date, time, allDay);
}

/** Select nativo — Radix Select (Portal) não funciona dentro de `<dialog showModal>`. */
const modalSelectClassName =
  "flex min-h-[44px] w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

function TypeLegend({
  typeFilter,
  onTypeFilterChange,
  colors,
}: {
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  colors: Record<AgendaColorKey, AgendaColorSwatch>;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onTypeFilterChange("all")}
        className={cn(
          "min-h-[32px] rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-all",
          typeFilter === "all"
            ? "border-primary bg-primary/15 text-foreground ring-2 ring-primary/40"
            : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/50",
        )}
      >
        Todos
      </button>
      {Object.entries(FOOTBALL_AGENDA_TYPE_LABEL).map(([key, label]) => {
        const active = typeFilter === key;
        const style = agendaSwatchStyle(
          colors,
          key === "viagem" ? "viagem" : key,
          key === "viagem" ? "fora" : null,
        );
        return (
          <button
            key={key}
            type="button"
            onClick={() => onTypeFilterChange(active ? "all" : key)}
            style={style}
            className={cn(
              "min-h-[32px] rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-all",
              active && "ring-2 ring-white/80 ring-offset-1 ring-offset-background",
              typeFilter !== "all" && !active && "opacity-45 hover:opacity-70",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function FutebolAgendaOperacional() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [focusDate, setFocusDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantFilter, setTenantFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [items, setItems] = useState<FootballAgendaCalendarItem[]>([]);
  const [overview, setOverview] = useState<FootballAgendaOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(() => todayKey());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EntryForm>(emptyForm);
  const [spaces, setSpaces] = useState<ActivitySpace[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agendaColors, setAgendaColors] = useState<Record<AgendaColorKey, AgendaColorSwatch>>(
    () => ({ ...DEFAULT_AGENDA_COLORS }),
  );
  const [squadColors, setSquadColors] = useState<Record<string, SquadCategoryColor>>(() =>
    loadSquadCategoryColors(),
  );
  const [paletteOpen, setPaletteOpen] = useState(false);

  const refreshColors = useCallback(() => {
    setAgendaColors(loadAgendaColors());
    setSquadColors(loadSquadCategoryColors());
  }, []);

  useEffect(() => {
    refreshColors();
  }, [refreshColors]);

  useEffect(() => {
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => {
      const list = (Array.isArray(data) ? data : []).filter((t) => isClubTenant(t.kind?.name));
      setTenants(list);
      if (list.length === 1 && !form.tenantId) {
        setForm((f) => ({ ...f, tenantId: list[0].id }));
      }
    });
  }, [form.tenantId]);

  const { categories: allFixtureCategories } = useFixtureCategories();

  const selectedTenant = tenants.find((t) => t.id === tenantFilter);
  const categoriesForDropdown = filterCategoriesForTenant(
    allFixtureCategories,
    selectedTenant?.categories,
  );

  const formTenant = tenants.find((t) => t.id === form.tenantId);
  const formCategories = filterCategoriesForTenant(
    allFixtureCategories,
    formTenant?.categories,
  );

  useEffect(() => {
    if (categoryFilter === "all") return;
    if (!categoriesForDropdown.some((c) => c.value === categoryFilter)) {
      setCategoryFilter("all");
    }
  }, [categoryFilter, categoriesForDropdown]);

  useEffect(() => {
    if (!form.tenantId) {
      setSpaces([]);
      return;
    }
    api
      .get<ActivitySpace[]>(`/football-activity-spaces?tenantId=${encodeURIComponent(form.tenantId)}`)
      .then(({ data }) => setSpaces(Array.isArray(data) ? data : []))
      .catch(() => setSpaces([]));
  }, [form.tenantId]);

  const load = useCallback(async () => {
    setLoading(true);
    const { from, to } = viewRange(focusDate, viewMode);
    const params = new URLSearchParams({ from, to });
    if (tenantFilter) params.set("tenantId", tenantFilter);
    if (typeFilter !== "all") params.set("types", typeFilter);
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    const overviewParams = new URLSearchParams({
      year: String(focusDate.getFullYear()),
      month: String(focusDate.getMonth()),
    });
    if (tenantFilter) overviewParams.set("tenantId", tenantFilter);
    if (categoryFilter !== "all") overviewParams.set("category", categoryFilter);
    try {
      const [calRes, ovRes] = await Promise.all([
        api.get<FootballAgendaCalendarItem[]>(`/futebol-agenda/calendar?${params}`),
        api.get<FootballAgendaOverview>(`/futebol-agenda/overview?${overviewParams}`),
      ]);
      setItems(Array.isArray(calRes.data) ? calRes.data : []);
      setOverview(ovRes.data ?? null);
    } catch {
      setItems([]);
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, [focusDate, viewMode, tenantFilter, typeFilter, categoryFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (viewMode === "day") {
      setSelectedDay(dateKeyFromDate(focusDate));
    }
  }, [viewMode, focusDate]);

  const entryIdFromUrl = searchParams.get("entry");
  const newFromUrl = searchParams.get("new");

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
      const key = dateKeyInBrazil(item.startAt);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [items]);

  const monthLabel = periodLabel(focusDate, viewMode);
  const today = todayKey();

  const daysInMonth = new Date(focusDate.getFullYear(), focusDate.getMonth() + 1, 0).getDate();
  const startWeekday = new Date(focusDate.getFullYear(), focusDate.getMonth(), 1).getDay();

  const weekDays = useMemo(() => {
    const start = startOfWeek(focusDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [focusDate]);

  const focusDayKey = dateKeyFromDate(focusDate);
  const selectedItems = sortAgendaItems(
    viewMode === "day"
      ? byDay.get(focusDayKey) ?? []
      : selectedDay
        ? byDay.get(selectedDay) ?? []
        : [],
  );

  const navigatePrev = () => {
    setFocusDate((d) => {
      const n = new Date(d);
      if (viewMode === "day") n.setDate(n.getDate() - 1);
      else if (viewMode === "week") n.setDate(n.getDate() - 7);
      else n.setMonth(n.getMonth() - 1);
      return n;
    });
  };

  const navigateNext = () => {
    setFocusDate((d) => {
      const n = new Date(d);
      if (viewMode === "day") n.setDate(n.getDate() + 1);
      else if (viewMode === "week") n.setDate(n.getDate() + 7);
      else n.setMonth(n.getMonth() + 1);
      return n;
    });
  };

  const goToToday = () => {
    const now = new Date();
    setFocusDate(now);
    setSelectedDay(todayKey());
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === "day" || mode === "week") {
      setSelectedDay(dateKeyFromDate(focusDate));
    }
  };

  /** Abre a visão diária do dia clicado (não força “hoje”). */
  const goToDayView = (dateKey: string) => {
    const parts = dateKey.split("-").map(Number);
    const y = parts[0] ?? new Date().getFullYear();
    const m = parts[1] ?? 1;
    const d = parts[2] ?? 1;
    const next = new Date(y, m - 1, d, 12, 0, 0, 0);
    setSelectedDay(dateKey);
    setFocusDate(next);
    setViewMode("day");
  };

  const handleDayClick = (dateKey: string) => {
    goToDayView(dateKey);
  };

  const dayCellClass = (dateKey: string, isSelected: boolean) =>
    cn(
      "min-h-[92px] rounded-lg border p-1.5 text-left transition-colors sm:min-h-[100px]",
      isSelected
        ? "border-primary ring-2 ring-primary/40 bg-primary/10"
        : dateKey === today
          ? "border-amber-400/80 bg-amber-500/20 ring-2 ring-amber-400/45 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.25)]"
          : "border-border/60 bg-card hover:bg-muted/30",
    );

  const dayNumberClass = (dateKey: string, isSelected: boolean) =>
    cn(
      "inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-1 text-xs font-bold",
      dateKey === today
        ? "bg-amber-500 text-amber-950"
        : isSelected
          ? "text-primary"
          : "text-foreground",
    );

  const openNewEntry = async (dateKey?: string) => {
    const base = dateKey ?? today;
    const tid = tenantFilter || tenants[0]?.id || "";
    setEditingId(null);
    setForm({
      ...emptyForm(),
      tenantId: tid,
      category: categoryFilter !== "all" ? categoryFilter : "",
      startAt: base,
      endAt: base,
    });
    setError(null);
    setDialogOpen(true);
    if (tid) {
      try {
        const { data } = await api.post<ActivitySpace[]>("/futebol-agenda/ensure-spaces", {
          tenantId: tid,
        });
        if (Array.isArray(data)) setSpaces(data);
      } catch {
        /* mantém load via useEffect */
      }
    }
  };

  useEffect(() => {
    if (newFromUrl !== "1") return;
    void openNewEntry(selectedDay ?? todayKey());
  }, [newFromUrl, selectedDay]);

  const categoryLine = (item: FootballAgendaCalendarItem) =>
    formatTravelCategoriesDisplay(item.category, item.categories ?? null, "pt");

  /** Prefixo legível na mesma linha do título (casa/fora/tipo). */
  const agendaLinePrefix = (item: FootballAgendaCalendarItem, side: AgendaMatchSide) => {
    if (side === "casa") return "Jogo em casa · ";
    if (side === "fora") return "Jogo fora · ";
    const typeLabel = FOOTBALL_AGENDA_TYPE_LABEL[item.type];
    return typeLabel ? `${typeLabel} · ` : "";
  };

  const openEditEntry = (entry: FootballAgendaEntry) => {
    const startKey = dateKeyInBrazil(entry.startAt);
    const endKey = entry.endAt ? dateKeyInBrazil(entry.endAt) : startKey;
    setEditingId(entry.id);
    setForm({
      tenantId: entry.tenantId,
      category: entry.category ?? "",
      type: entry.type,
      title: entry.title,
      startAt: startKey,
      startTime: entry.allDay ? "09:00" : timeInBrazil(entry.startAt),
      endAt: endKey,
      endTime: entry.endAt && !entry.allDay && !entry.dayPeriod ? timeInBrazil(entry.endAt) : "10:00",
      allDay: entry.allDay && !entry.dayPeriod,
      dayPeriod: isAgendaDayPeriod(entry.dayPeriod) ? entry.dayPeriod : "",
      spaceId: entry.spaceId ?? "",
      location: entry.location ?? "",
      description: entry.description ?? "",
      status: entry.status,
    });
    if (isAgendaDayPeriod(entry.dayPeriod)) {
      const hours = AGENDA_DAY_PERIOD_HOURS[entry.dayPeriod];
      setForm((f) => ({
        ...f,
        startTime: hours.start,
        endTime: hours.end,
        allDay: false,
        dayPeriod: entry.dayPeriod as AgendaDayPeriod,
      }));
    }
    setError(null);
    setDialogOpen(true);
  };

  const openCalendarItem = (item: FootballAgendaCalendarItem) => {
    if (item.source === "travel" || item.source === "bch_booking") {
      if (item.href) {
        router.push(item.href);
        return;
      }
    }
    if (item.source !== "entry") {
      const dayKey = dateKeyInBrazil(item.startAt);
      goToDayView(dayKey);
      return;
    }
    const id = item.id.replace(/^entry-/, "");
    void api
      .get<FootballAgendaEntry>(`/futebol-agenda/entries/${id}`)
      .then(({ data }) => {
        if (data) openEditEntry(data);
        else goToDayView(dateKeyInBrazil(item.startAt));
      })
      .catch(() => {
        goToDayView(dateKeyInBrazil(item.startAt));
      });
  };

  const renderAgendaItem = (item: FootballAgendaCalendarItem) => {
    const cats = categoryLine(item);
    const side = matchSideOf(item);
    const sideLabel = agendaMatchSideLabel(side);
    const swatch = agendaSwatchStyle(agendaColors, item.type, side);
    const primaryCat = item.category?.trim() || item.categories?.[0]?.trim() || null;
    const squad = resolveSquadCategoryColor(squadColors, primaryCat);
    const typeOrSide =
      sideLabel === "Casa"
        ? "JOGO EM CASA"
        : sideLabel === "Fora"
          ? "JOGO FORA"
          : FOOTBALL_AGENDA_TYPE_LABEL[item.type] ?? item.type;
    return (
    <button
      key={item.id}
      type="button"
      onClick={() => openCalendarItem(item)}
      className="flex w-full gap-3 rounded-lg border-2 p-3 text-left text-foreground shadow-sm transition-opacity hover:opacity-95"
      style={{
        borderColor: swatch.borderColor,
        background: `linear-gradient(135deg, ${swatch.backgroundColor}33 0%, hsl(var(--card)) 55%)`,
      }}
    >
      <AgendaDualToneBars squad={squad} event={swatch} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
          {primaryCat && squad ? (
            <span
              className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={{ backgroundColor: squad.bg, color: squad.text }}
            >
              {getCategoryLabel(primaryCat, "pt", allFixtureCategories)}
            </span>
          ) : null}
          <span
            className="shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            style={swatch}
          >
            {typeOrSide}
          </span>
          <p className="min-w-0 truncate text-base font-bold uppercase leading-tight tracking-wide text-foreground">
            {item.title}
          </p>
        </div>
        {(cats !== "—" || item.tenantName) ? (
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-foreground/90">
            {[item.tenantName, cats !== "—" ? cats : null].filter(Boolean).join(" · ")}
          </p>
        ) : null}
        {item.agendaLocked ? (
          <span className="inline-block rounded bg-zinc-600/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
            Editado
          </span>
        ) : null}
        <p className="text-sm font-semibold opacity-95">
          {formatTime(item.startAt, item.allDay, item.dayPeriod)}
          {item.endAt && !item.allDay && item.source === "travel"
            ? ` · jogo ${formatTime(item.endAt, false)}`
            : item.endAt && !item.allDay
              ? ` — ${formatTime(item.endAt, false)}`
              : ""}
        </p>
        {item.location ? (
          <p className="flex min-w-0 items-center gap-1 truncate text-xs font-medium opacity-90">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{item.location}</span>
          </p>
        ) : null}
        {item.source === "travel" ? (
          <p className="truncate text-xs font-medium opacity-90">
            {TRAVEL_STATUS_LABEL[item.status] ?? item.status}
            {item.championshipName ? ` · ${item.championshipName}` : ""}
          </p>
        ) : null}
        {item.source === "bch_booking" ? (
          <p className="truncate text-xs font-medium opacity-90">
            {BOOKING_STATUS_LABEL[item.status] ?? item.status}
            {item.spaceName ? ` · ${item.spaceName}` : ""}
          </p>
        ) : null}
        {item.championshipName && item.source === "entry" ? (
          <p className="truncate text-xs font-medium opacity-90">{item.championshipName}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="text-xs font-bold underline-offset-2">
            {item.source === "travel"
              ? "Abrir viagem"
              : item.source === "bch_booking"
                ? "Editar no Boston City Hall"
                : "Editar / excluir"}
          </span>
        </div>
      </div>
    </button>
    );
  };

  const handleSave = async () => {
    if (!form.tenantId || !form.title.trim() || !form.startAt) {
      setError("Clube, título e data são obrigatórios.");
      return;
    }
    setSaving(true);
    setError(null);
    const period = isAgendaDayPeriod(form.dayPeriod) ? form.dayPeriod : null;
    const hours = period ? AGENDA_DAY_PERIOD_HOURS[period] : null;
    const startTime = hours ? hours.start : form.startTime;
    const endTime = hours ? hours.end : form.endTime;
    const allDay = period ? false : form.allDay;
    const endDate = form.endAt || form.startAt;
    const payload = {
      tenantId: form.tenantId,
      category: form.category || undefined,
      type: form.type,
      title: form.title.trim().toLocaleUpperCase("pt-BR"),
      startAt: combineDateTime(form.startAt, startTime, allDay),
      endAt: endDate ? combineDateTime(endDate, endTime, allDay) : undefined,
      allDay,
      dayPeriod: period,
      spaceId: form.spaceId || undefined,
      location: form.location.trim().toLocaleUpperCase("pt-BR") || undefined,
      description: form.description.trim().toLocaleUpperCase("pt-BR") || undefined,
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
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
          : null;
      if (Array.isArray(msg)) setError(msg.join(", "));
      else if (typeof msg === "string") setError(msg);
      else setError(e instanceof Error ? e.message : "Erro ao salvar");
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
            <Button onClick={() => openNewEntry(viewMode === "day" ? focusDayKey : selectedDay ?? undefined)} className="min-h-[44px] w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Novo compromisso
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="space-y-2">
              <CardTitle className="text-lg capitalize">{monthLabel}</CardTitle>
              <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-muted/30 p-1">
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
                    onClick={() => handleViewModeChange(tab.id)}
                    className={cn(
                      "inline-flex min-h-[44px] shrink-0 items-center rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                      viewMode === tab.id
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setPaletteOpen(true)} className="min-h-[44px] shrink-0">
                <Palette className="mr-2 h-4 w-4" />
                Cores
              </Button>
            <Button variant="outline" onClick={goToToday} className="min-h-[44px] shrink-0">
                Hoje
              </Button>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-10 w-10" onClick={navigatePrev}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-10 w-10" onClick={navigateNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
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
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="min-h-[44px] w-full sm:w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categoriesForDropdown.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {getCategoryLabel(c.value, "pt", allFixtureCategories)}
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
                <SelectItem value="palco">Boston City Hall</SelectItem>
                {FOOTBALL_AGENDA_ENTRY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {FOOTBALL_AGENDA_TYPE_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : viewMode === "day" ? (
            <div className="space-y-4">
              <div
                className={cn(
                  "rounded-xl border p-4",
                  focusDayKey === today
                    ? "border-amber-400/80 bg-amber-500/10 ring-2 ring-amber-400/40"
                    : "border-border/60 bg-card",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold capitalize">{monthLabel}</h3>
                  {focusDayKey === today ? (
                    <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-amber-950">
                      Hoje
                    </span>
                  ) : null}
                </div>
              </div>
              {selectedItems.length === 0 ? (
                <div className="space-y-3 rounded-xl border border-dashed p-6 text-center">
                  <p className="text-sm text-muted-foreground">Nada agendado neste dia.</p>
                  <Button variant="outline" onClick={() => openNewEntry(focusDayKey)}>
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Adicionar compromisso
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">{selectedItems.map(renderAgendaItem)}</div>
              )}
              <TypeLegend
                typeFilter={typeFilter}
                onTypeFilterChange={setTypeFilter}
                colors={agendaColors}
              />
            </div>
          ) : (
            <div className="grid gap-4">
              <div className={viewMode === "week" ? "min-w-0" : undefined}>
                {viewMode === "month" ? (
                  <>
                    <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground">
                      {WEEKDAY_LABELS.map((d) => (
                        <div key={d} className="py-1">
                          {d}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1.5">
                      {Array.from({ length: startWeekday }).map((_, i) => (
                        <div
                          key={`e-${i}`}
                          className="min-h-[100px] rounded-lg bg-muted/15 sm:min-h-[120px] lg:min-h-[132px]"
                        />
                      ))}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const dateKey = `${focusDate.getFullYear()}-${String(focusDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        const dayItems = byDay.get(dateKey) ?? [];
                        const isSelected = dateKey === selectedDay;
                        return (
                          <div
                            key={dateKey}
                            className={cn(dayCellClass(dateKey, isSelected), "min-h-[100px] sm:min-h-[120px] lg:min-h-[132px]")}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                const [y, m, d] = dateKey.split("-").map(Number);
                                setSelectedDay(dateKey);
                                setFocusDate(new Date(y, m - 1, d));
                              }}
                              className="flex w-full items-center justify-between gap-1 text-left"
                              title="Selecionar dia"
                            >
                              <span className={dayNumberClass(dateKey, isSelected)}>{day}</span>
                            </button>
                            <div className="mt-1 space-y-0.5">
                              {sortAgendaItems(dayItems).slice(0, 5).map((item) => {
                                const side = matchSideOf(item);
                                const style = agendaSwatchStyle(agendaColors, item.type, side);
                                const primaryCat =
                                  item.category?.trim() || item.categories?.[0]?.trim() || null;
                                const squad = resolveSquadCategoryColor(squadColors, primaryCat);
                                const squadLabel = primaryCat
                                  ? getCategoryLabel(primaryCat, "pt", allFixtureCategories)
                                  : null;
                                return (
                                  <AgendaDualTonePill
                                    key={item.id}
                                    onClick={() => openCalendarItem(item)}
                                    compact
                                    squadLabel={squadLabel}
                                    squadColor={squad}
                                    eventStyle={style}
                                    title={`${squadLabel ? `${squadLabel} · ` : ""}${agendaLinePrefix(item, side)}${item.title}`}
                                  >
                                    {agendaLinePrefix(item, side)}
                                    {item.title}
                                  </AgendaDualTonePill>
                                );
                              })}
                              {dayItems.length > 5 ? (
                                <button
                                  type="button"
                                  onClick={() => handleDayClick(dateKey)}
                                  className="text-[10px] font-semibold text-muted-foreground hover:text-foreground"
                                >
                                  +{dayItems.length - 5} · ver dia
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
                      <div className="grid min-w-[560px] grid-cols-7 gap-2 p-3">
                        {weekDays.map((d) => {
                          const dateKey = dateKeyFromDate(d);
                          const dayItems = byDay.get(dateKey) ?? [];
                          const isSelected = dateKey === selectedDay;
                          const isTodayCol = dateKey === today;
                          return (
                            <button
                              key={dateKey}
                              type="button"
                              onClick={() => {
                                setSelectedDay(dateKey);
                                setFocusDate(d);
                              }}
                              onDoubleClick={() => goToDayView(dateKey)}
                              className={cn(
                                "min-h-[88px] w-full rounded-xl border px-2 py-3 text-center transition-colors",
                                isSelected &&
                                  "border-primary bg-primary/15 ring-2 ring-primary/50 shadow-md",
                                isTodayCol && !isSelected && "border-amber-400 bg-amber-500/15",
                                !isSelected && !isTodayCol && "border-border/60 bg-muted/20 hover:bg-muted/40",
                                !isSelected && "opacity-55 hover:opacity-100",
                              )}
                            >
                              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                                {WEEKDAY_LABELS[d.getDay()]}
                              </p>
                              <p
                                className={cn(
                                  "mx-auto mt-1 flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold",
                                  isSelected
                                    ? "bg-primary text-primary-foreground"
                                    : isTodayCol
                                      ? "bg-amber-500 text-amber-950"
                                      : "text-foreground",
                                )}
                              >
                                {d.getDate()}
                              </p>
                              <p className="mt-2 text-[11px] font-semibold text-muted-foreground">
                                {dayItems.length}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <Card className="border-border/80">
                      <CardHeader className="flex flex-col gap-2 space-y-0 pb-2 sm:flex-row sm:items-center sm:justify-between">
                        <CardTitle className="text-base capitalize">
                          {selectedDay
                            ? formatDateLong(`${selectedDay}T12:00:00`)
                            : "Dia selecionado"}
                        </CardTitle>
                        {selectedDay ? (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              className="min-h-[40px]"
                              onClick={() => goToDayView(selectedDay)}
                            >
                              Abrir dia
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="min-h-[40px]"
                              onClick={() => openNewEntry(selectedDay)}
                            >
                              <Plus className="mr-1 h-3.5 w-3.5" />
                              Adicionar
                            </Button>
                          </div>
                        ) : null}
                      </CardHeader>
                      <CardContent className="max-h-[min(70vh,640px)] space-y-2 overflow-y-auto overscroll-contain">
                        {!selectedDay ? null : selectedItems.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Nada agendado neste dia.</p>
                        ) : (
                          selectedItems.map(renderAgendaItem)
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
                <TypeLegend
                  typeFilter={typeFilter}
                  onTypeFilterChange={setTypeFilter}
                  colors={agendaColors}
                />
              </div>

              {viewMode === "month" ? (
                <Card className="border-dashed border-border/80">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      {selectedDay ? formatDateLong(`${selectedDay}T12:00:00`) : "Selecione um dia"}
                    </CardTitle>
                    {selectedDay ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-1 w-fit min-h-[40px]"
                        onClick={() => handleDayClick(selectedDay)}
                      >
                        Abrir dia
                      </Button>
                    ) : null}
                  </CardHeader>
                  <CardContent className="max-h-[min(70vh,640px)] space-y-2 overflow-y-auto overscroll-contain">
                    {!selectedDay ? null : selectedItems.length === 0 ? (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">Nada agendado neste dia.</p>
                        <Button variant="outline" size="sm" onClick={() => openNewEntry(selectedDay)}>
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          Adicionar
                        </Button>
                      </div>
                    ) : (
                      selectedItems.map(renderAgendaItem)
                    )}
                  </CardContent>
                </Card>
              ) : null}
            </div>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Viagens: módulo{" "}
            <Link href="/dashboard/futebol/logistica" className="text-primary hover:underline">
              Viagens
            </Link>
            .
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
              <Label htmlFor="agenda-tenant">Clube *</Label>
              <select
                id="agenda-tenant"
                className={modalSelectClassName}
                value={form.tenantId}
                onChange={(e) => setForm((f) => ({ ...f, tenantId: e.target.value }))}
              >
                <option value="" disabled>
                  Selecione o clube
                </option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="agenda-type">Tipo</Label>
                <select
                  id="agenda-type"
                  className={modalSelectClassName}
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                >
                  {FOOTBALL_AGENDA_ENTRY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {FOOTBALL_AGENDA_TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="agenda-category">Categoria</Label>
                <select
                  id="agenda-category"
                  className={modalSelectClassName}
                  value={form.category || ""}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  <option value="">—</option>
                  {formCategories.map((c) => (
                    <option key={c.value} value={c.value}>
                      {getCategoryLabel(c.value, "pt", allFixtureCategories)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Título *</Label>
              <Input
                value={form.title}
                className="uppercase"
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value.toLocaleUpperCase("pt-BR") }))
                }
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.allDay && !form.dayPeriod}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    allDay: e.target.checked,
                    dayPeriod: e.target.checked ? "" : f.dayPeriod,
                  }))
                }
                className="h-4 w-4 rounded border-border"
              />
              Dia inteiro
            </label>
            <div className="grid gap-1.5">
              <Label>Período do dia</Label>
              <NativeSelect
                value={form.dayPeriod}
                onChange={(e) => {
                  const v = e.target.value;
                  if (isAgendaDayPeriod(v)) {
                    const hours = AGENDA_DAY_PERIOD_HOURS[v];
                    setForm((f) => ({
                      ...f,
                      dayPeriod: v,
                      allDay: false,
                      startTime: hours.start,
                      endTime: hours.end,
                      endAt: f.endAt || f.startAt,
                    }));
                  } else {
                    setForm((f) => ({ ...f, dayPeriod: "" }));
                  }
                }}
              >
                <option value="">Horário específico</option>
                {AGENDA_DAY_PERIODS.map((p) => (
                  <option key={p} value={p}>
                    {AGENDA_DAY_PERIOD_LABEL[p]}
                  </option>
                ))}
              </NativeSelect>
              <p className="text-xs text-muted-foreground">
                Use para tarefas longas (ex.: descanso na tarde, noite pré-jogo).
              </p>
            </div>
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
              {!form.allDay && !form.dayPeriod ? (
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
              {!form.allDay && !form.dayPeriod ? (
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="agenda-space">Espaço / local</Label>
                <Link href="/dashboard/cadastros/espacos" className="text-xs text-primary hover:underline">
                  Cadastrar espaços
                </Link>
              </div>
              <select
                id="agenda-space"
                className={modalSelectClassName}
                value={form.spaceId}
                onChange={(e) => setForm((f) => ({ ...f, spaceId: e.target.value }))}
              >
                <option value="">— Texto livre abaixo —</option>
                {spaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <Input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Complemento ou local avulso"
              />
              <p className="text-[11px] text-muted-foreground">
                Espaços cadastrados bloqueiam horário duplicado entre categorias diferentes.
              </p>
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

      <AgendaColorsDialog
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        squadCategories={allFixtureCategories}
        onColorsChange={refreshColors}
      />
    </div>
  );
}
