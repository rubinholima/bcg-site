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
  AGENDA_COLOR_LABELS,
  DEFAULT_AGENDA_COLORS,
  agendaSwatchStyle,
  loadAgendaColors,
  saveAgendaColors,
  type AgendaColorKey,
  type AgendaColorSwatch,
} from "@/lib/agenda-color-prefs";

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
  if (item.type === "viagem") return "fora";
  if (item.isOurTeamHome === true) return "casa";
  if (item.isOurTeamHome === false) return "fora";
  return null;
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

function periodLabel(focusDate: Date, mode: ViewMode): string {
  if (mode === "day") {
    return formatDateLong(`${dateKeyFromDate(focusDate)}T12:00:00`);
  }
  if (mode === "week") {
    const start = startOfWeek(focusDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const fmt = (d: Date) =>
      d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    const year =
      start.getFullYear() === end.getFullYear()
        ? String(start.getFullYear())
        : `${start.getFullYear()} – ${end.getFullYear()}`;
    return `${fmt(start)} – ${fmt(end)} · ${year}`;
  }
  return new Date(focusDate.getFullYear(), focusDate.getMonth(), 1).toLocaleDateString("pt-BR", {
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
  if (!date) return "";
  if (allDay) return new Date(`${date}T12:00:00`).toISOString();
  return new Date(`${date}T${time}:00`).toISOString();
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

function contrastTextForBg(hex: string): string {
  const raw = hex.replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return "#ffffff";
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? "#18181b" : "#ffffff";
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
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    setAgendaColors(loadAgendaColors());
  }, []);

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
      const key = item.startAt.slice(0, 10);
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
    if (mode === "day") {
      setSelectedDay(dateKeyFromDate(focusDate));
    }
  };

  /** Abre a visão diária do dia clicado (não força “hoje”). */
  const goToDayView = (dateKey: string) => {
    const [y, m, d] = dateKey.split("-").map(Number);
    setSelectedDay(dateKey);
    setFocusDate(new Date(y, m - 1, d));
    setViewMode("day");
  };

  const handleDayClick = (dateKey: string) => {
    goToDayView(dateKey);
  };

  const persistAgendaColors = (next: Record<AgendaColorKey, AgendaColorSwatch>) => {
    setAgendaColors(next);
    saveAgendaColors(next);
  };

  const updateAgendaColorBg = (key: AgendaColorKey, bg: string) => {
    const text = contrastTextForBg(bg);
    persistAgendaColors({
      ...agendaColors,
      [key]: { bg, text, border: bg },
    });
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

  const isFmfGame = (item: FootballAgendaCalendarItem) =>
    item.source === "entry" &&
    item.type === "jogo" &&
    typeof item.externalId === "string" &&
    item.externalId.startsWith("fmf-");

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
      spaceId: entry.spaceId ?? "",
      location: entry.location ?? "",
      description: entry.description ?? "",
      status: entry.status,
    });
    setError(null);
    setDialogOpen(true);
  };

  const openCalendarItem = (item: FootballAgendaCalendarItem) => {
    if (item.source === "travel" || item.source === "bch_booking") {
      router.push(item.href);
      return;
    }
    const id = item.id.replace(/^entry-/, "");
    void api.get<FootballAgendaEntry>(`/futebol-agenda/entries/${id}`).then(({ data }) => {
      if (data) openEditEntry(data);
    });
  };

  const renderAgendaItem = (item: FootballAgendaCalendarItem) => {
    const cats = categoryLine(item);
    const side = matchSideOf(item);
    const sideLabel = agendaMatchSideLabel(side);
    const swatch = agendaSwatchStyle(agendaColors, item.type, side);
    return (
    <button
      key={item.id}
      type="button"
      onClick={() => openCalendarItem(item)}
      className="w-full rounded-lg border-2 p-3 text-left text-foreground shadow-sm transition-opacity hover:opacity-95"
      style={{
        borderColor: swatch.borderColor,
        background: `linear-gradient(135deg, ${swatch.backgroundColor}33 0%, hsl(var(--card)) 55%)`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {sideLabel ? (
              <span
                className="rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                style={swatch}
              >
                {sideLabel}
              </span>
            ) : (
              <span
                className="rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={swatch}
              >
                {FOOTBALL_AGENDA_TYPE_LABEL[item.type] ?? item.type}
              </span>
            )}
            {cats !== "—" ? (
              <span className="text-xs font-medium opacity-90">{cats}</span>
            ) : null}
            {isFmfGame(item) ? (
              <span className="rounded bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                FMF
              </span>
            ) : null}
            {item.agendaLocked ? (
              <span className="rounded bg-zinc-600/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                Editado
              </span>
            ) : null}
          </div>
          {item.tenantName ? (
            <p className="mt-1 text-xs font-semibold text-foreground/90">{item.tenantName}</p>
          ) : null}
          <p className="mt-0.5 text-base font-bold leading-tight text-foreground">{item.title}</p>
          <p className="mt-1 text-sm font-semibold opacity-95">
            {formatTime(item.startAt, item.allDay)}
            {item.endAt && !item.allDay && item.source === "travel"
              ? ` · jogo ${formatTime(item.endAt, false)}`
              : item.endAt && !item.allDay
                ? ` — ${formatTime(item.endAt, false)}`
                : ""}
          </p>
          {item.location ? (
            <p className="mt-1 flex items-center gap-1 text-xs font-medium opacity-90">
              <MapPin className="h-3 w-3 shrink-0" />
              {item.location}
            </p>
          ) : null}
          {item.source === "travel" ? (
            <p className="mt-1 text-xs font-medium opacity-90">
              {TRAVEL_STATUS_LABEL[item.status] ?? item.status}
              {item.championshipName ? ` · ${item.championshipName}` : ""}
            </p>
          ) : null}
          {item.source === "bch_booking" ? (
            <p className="mt-1 text-xs font-medium opacity-90">
              {BOOKING_STATUS_LABEL[item.status] ?? item.status}
              {item.spaceName ? ` · ${item.spaceName}` : ""}
            </p>
          ) : null}
          {item.championshipName && item.source === "entry" ? (
            <p className="mt-1 text-xs font-medium opacity-90">{item.championshipName}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <span className="text-xs font-bold underline-offset-2">
          {item.source === "travel"
            ? "Abrir viagem"
            : item.source === "bch_booking"
              ? "Editar no Boston City Hall"
              : "Editar / excluir"}
        </span>
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
      spaceId: form.spaceId || undefined,
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
            <div
              className={cn(
                "grid gap-4",
                viewMode === "month" && "lg:grid-cols-[1fr_minmax(280px,360px)] lg:items-start",
              )}
            >
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
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: startWeekday }).map((_, i) => (
                        <div key={`e-${i}`} className="min-h-[92px] rounded-lg bg-muted/15 sm:min-h-[100px]" />
                      ))}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const dateKey = `${focusDate.getFullYear()}-${String(focusDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        const dayItems = byDay.get(dateKey) ?? [];
                        const isSelected = dateKey === selectedDay;
                        return (
                          <div
                            key={dateKey}
                            className={dayCellClass(dateKey, isSelected)}
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
                              {sortAgendaItems(dayItems).slice(0, 4).map((item) => {
                                const side = matchSideOf(item);
                                const style = agendaSwatchStyle(agendaColors, item.type, side);
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => openCalendarItem(item)}
                                    className="line-clamp-2 w-full rounded border px-1 py-0.5 text-left text-[10px] font-semibold leading-tight sm:text-[11px]"
                                    style={style}
                                    title={
                                      item.category
                                        ? `${getCategoryLabel(item.category, "pt", allFixtureCategories)} · ${item.title}`
                                        : item.title
                                    }
                                  >
                                    {side === "casa" ? "C · " : side === "fora" ? "F · " : ""}
                                    {item.title}
                                  </button>
                                );
                              })}
                              {dayItems.length > 4 ? (
                                <button
                                  type="button"
                                  onClick={() => handleDayClick(dateKey)}
                                  className="text-[10px] font-semibold text-muted-foreground hover:text-foreground"
                                >
                                  +{dayItems.length - 4} · ver dia
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border/80 bg-card">
                    <div className="grid min-w-[720px] grid-cols-7 divide-x divide-border/50">
                      {weekDays.map((d) => {
                        const dateKey = dateKeyFromDate(d);
                        const dayItems = byDay.get(dateKey) ?? [];
                        const isSelected = dateKey === selectedDay;
                        return (
                          <div
                            key={dateKey}
                            className={cn(
                              "flex min-h-[320px] flex-col bg-background/30",
                              dateKey === today && "bg-amber-500/5",
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => handleDayClick(dateKey)}
                              className={cn(
                                "sticky top-0 z-[1] border-b px-2 py-2.5 text-center transition-colors",
                                isSelected
                                  ? "border-primary bg-primary/15"
                                  : dateKey === today
                                    ? "border-amber-400/60 bg-amber-500/15"
                                    : "border-border/60 bg-muted/25 hover:bg-muted/40",
                              )}
                              title="Abrir visão diária deste dia"
                            >
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                {WEEKDAY_LABELS[d.getDay()]}
                              </p>
                              <p className={cn("mx-auto mt-0.5", dayNumberClass(dateKey, isSelected))}>
                                {d.getDate()}
                              </p>
                            </button>
                            <div className="flex flex-1 flex-col gap-1.5 p-1.5">
                              {sortAgendaItems(dayItems).map((item) => {
                                const side = matchSideOf(item);
                                const style = agendaSwatchStyle(agendaColors, item.type, side);
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => openCalendarItem(item)}
                                    className="rounded-md border px-1.5 py-1.5 text-left text-[11px] font-semibold leading-snug shadow-sm transition-opacity hover:opacity-90"
                                    style={style}
                                    title={
                                      item.category
                                        ? `${getCategoryLabel(item.category, "pt", allFixtureCategories)} · ${item.title}`
                                        : item.title
                                    }
                                  >
                                    {!item.allDay ? (
                                      <span className="mb-0.5 block text-[10px] font-bold opacity-90">
                                        {formatTime(item.startAt, false)}
                                      </span>
                                    ) : null}
                                    <span className="line-clamp-3 break-words">{item.title}</span>
                                  </button>
                                );
                              })}
                              {dayItems.length === 0 ? (
                                <p className="px-1 py-2 text-center text-[10px] text-muted-foreground/70">
                                  —
                                </p>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <TypeLegend
                  typeFilter={typeFilter}
                  onTypeFilterChange={setTypeFilter}
                  colors={agendaColors}
                />
              </div>

              {viewMode === "month" ? (
                <Card className="h-fit border-dashed lg:sticky lg:top-4 lg:border-solid">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      {selectedDay ? formatDateLong(`${selectedDay}T12:00:00`) : "Selecione um dia"}
                    </CardTitle>
                    {selectedDay ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-1 w-fit"
                        onClick={() => handleDayClick(selectedDay)}
                      >
                        Abrir visão diária
                      </Button>
                    ) : null}
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {!selectedDay ? (
                      <p className="text-sm text-muted-foreground">
                        Toque no número do dia para a visão diária, ou em um evento para editar.
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
                      selectedItems.map(renderAgendaItem)
                    )}
                  </CardContent>
                </Card>
              ) : null}
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

      <Dialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cores da agenda</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Escolha a cor de cada tipo de evento. As preferências ficam salvas neste navegador.
          </p>
          <div className="grid gap-3 py-2">
            {(Object.keys(AGENDA_COLOR_LABELS) as AgendaColorKey[]).map((key) => (
              <div
                key={key}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{AGENDA_COLOR_LABELS[key]}</p>
                  <span
                    className="mt-1 inline-block rounded border px-2 py-0.5 text-[10px] font-semibold"
                    style={{
                      backgroundColor: agendaColors[key].bg,
                      color: agendaColors[key].text,
                      borderColor: agendaColors[key].border,
                    }}
                  >
                    Exemplo
                  </span>
                </div>
                <Input
                  type="color"
                  className="h-10 w-14 cursor-pointer p-1"
                  value={agendaColors[key].bg}
                  onChange={(e) => updateAgendaColorBg(key, e.target.value)}
                  aria-label={`Cor de ${AGENDA_COLOR_LABELS[key]}`}
                />
              </div>
            ))}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => persistAgendaColors({ ...DEFAULT_AGENDA_COLORS })}
            >
              Restaurar padrão
            </Button>
            <Button type="button" onClick={() => setPaletteOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
