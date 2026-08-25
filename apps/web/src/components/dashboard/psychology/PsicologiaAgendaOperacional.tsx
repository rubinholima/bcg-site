"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  Lock,
  MapPin,
  Users,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { FeedbackModal, type FeedbackVariant } from "@/components/ui/feedback-modal";
import { PsychologySchedulingCard } from "@/components/dashboard/psychology/PsychologySchedulingCard";
import { BostonTvDashboardTabs } from "@/components/boston-tv/BostonTvDashboardTabs";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatDateDayMonYear, formatDateTimeDayMonYear, formatMonthYear } from "@/lib/format-date";
import { FIXTURE_CATEGORIES, filterCategoriesForTenant } from "@/lib/fixture-categories";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";
import { getConsultationModality, playerPsychologyProfileHref } from "@/lib/consultation-display";
import {
  appendCarePersonOnlineConsultation,
  fetchCarePersonClinical,
  parsePsychologyPersonKey,
  psychologyPersonProfileHref,
  psychologyPersonSelectLabel,
  type PsychologyCarePerson,
} from "@/lib/psychology-care-person";
import type { Psychologist } from "@/types/psychologist";
import type { PsychologySession } from "@/types/psychology-session";
import { PSYCH_SESSION_TYPE_LABEL } from "@/types/psychology-session";

type ViewMode = "month" | "week" | "list";

type AgendaEvent = {
  id: string;
  source: "session" | "online";
  sessionType: string;
  date: string;
  time?: string;
  endTime?: string | null;
  title: string;
  subtitle?: string;
  tenantId: string;
  tenantName?: string;
  playerId?: string;
  personKey?: string;
  category?: string;
  status: string;
  location?: string | null;
  notes?: string | null;
  link?: string;
  psychologist?: string;
  isPrivate: boolean;
};

interface TenantOption {
  id: string;
  name: string;
  categories?: string[] | null;
}

interface PlayerOption {
  id: string;
  name: string;
  tenantId?: string;
  category?: string | null;
  registrationProfile?: unknown;
}

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
const STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendada",
  completed: "Realizada",
  cancelled: "Cancelada",
};

const TYPE_COLORS: Record<string, string> = {
  presencial: "bg-violet-500/20 text-violet-300 border-violet-500/40",
  grupo: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  relatorio_semanal: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  meet: "bg-sky-500/20 text-sky-300 border-sky-500/40",
  online: "bg-sky-500/20 text-sky-300 border-sky-500/40",
};

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

function monthRange(year: number, month: number) {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0);
  return { from: dateKeyFromDate(from), to: dateKeyFromDate(to) };
}

function viewRange(focusDate: Date, mode: ViewMode) {
  const focusKey = dateKeyFromDate(focusDate);
  if (mode === "list") {
    const start = new Date(focusDate);
    start.setDate(start.getDate() - 14);
    const end = new Date(focusDate);
    end.setDate(end.getDate() + 45);
    return { from: dateKeyFromDate(start), to: dateKeyFromDate(end) };
  }
  if (mode === "week") {
    const start = startOfWeek(focusDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { from: dateKeyFromDate(start), to: dateKeyFromDate(end) };
  }
  return monthRange(focusDate.getFullYear(), focusDate.getMonth());
}

function sessionToEvent(session: PsychologySession, carePersons: PsychologyCarePerson[]): AgendaEvent {
  const personKey =
    session.personType === "employee" && session.employeeId
      ? `employee:${session.employeeId}`
      : session.personType === "staff" && session.staffId
        ? `staff:${session.staffId}`
        : session.playerId
          ? `player:${session.playerId}`
          : undefined;
  const person = personKey ? carePersons.find((p) => p.key === personKey) : undefined;
  const attendance = Array.isArray(session.attendance) ? session.attendance : [];
  const title =
    session.sessionType === "grupo"
      ? `Grupo — ${session.category ?? session.categoriesLabel ?? "categoria"}`
      : session.sessionType === "relatorio_semanal"
        ? "Relatório semanal"
        : person?.name ?? "Atendimento presencial";
  return {
    id: `session-${session.id}`,
    source: "session",
    sessionType: session.sessionType,
    date: session.date,
    time: session.time ?? undefined,
    endTime: session.endTime,
    title,
    subtitle: session.psychologistName ?? session.estagiarioName ?? undefined,
    tenantId: session.tenantId,
    tenantName: session.tenant?.name,
    playerId: session.playerId ?? undefined,
    personKey,
    category: session.category ?? undefined,
    status: session.status,
    location: session.location,
    notes: session.notes ?? session.groupSummary,
    psychologist: session.estagiarioName ?? session.psychologistName ?? undefined,
    isPrivate: session.isPrivate === true,
  };
}

function formatEventTime(event: AgendaEvent): string {
  if (!event.time) return "—";
  return event.endTime ? `${event.time} – ${event.endTime}` : event.time;
}

export function PsicologiaAgendaOperacional() {
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [focusDate, setFocusDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(todayKey());
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [carePersons, setCarePersons] = useState<PsychologyCarePerson[]>([]);
  const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
  const [filterClube, setFilterClube] = useState("");
  const [filterAtleta, setFilterAtleta] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("");
  const [filterPsychologist, setFilterPsychologist] = useState("");
  const [showPrivateOnly, setShowPrivateOnly] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [detailEvent, setDetailEvent] = useState<AgendaEvent | null>(null);
  const [deleteEvent, setDeleteEvent] = useState<AgendaEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [meetAvailable, setMeetAvailable] = useState<boolean | null>(null);
  const [meetCreating, setMeetCreating] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("09:00");
  const [newNotes, setNewNotes] = useState("");
  const [newPsychologist, setNewPsychologist] = useState("");
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: FeedbackVariant;
  }>({ open: false, title: "", message: "", variant: "info" });

  const showFeedback = useCallback(
    (title: string, message: string, variant: FeedbackVariant = "info") => {
      setFeedback({ open: true, title, message, variant });
    },
    [],
  );

  const { categories: allFixtureCategories } = useFixtureCategories();
  const range = useMemo(() => viewRange(focusDate, viewMode), [focusDate, viewMode]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from: range.from, to: range.to });
      if (filterClube) params.set("tenantId", filterClube);
      if (filterCategoria) params.set("category", filterCategoria);
      const [sessionsRes, consultRes] = await Promise.all([
        api.get<PsychologySession[]>(`/psychology-sessions?${params.toString()}`),
        api.get<Array<Record<string, unknown>>>(`/consultations?includePrivate=1`),
      ]);
      const sessions = Array.isArray(sessionsRes.data) ? sessionsRes.data : [];
      const consults = Array.isArray(consultRes.data) ? consultRes.data : [];
      const mappedSessions = sessions.map((s) => sessionToEvent(s, carePersons));
      const onlineEvents: AgendaEvent[] = consults
        .filter((c) => {
          const type = String(c.type ?? "");
          return type === "meet" || Boolean(c.link);
        })
        .filter((c) => {
          const date = String(c.date ?? "");
          return date >= range.from && date <= range.to;
        })
        .map((c) => ({
          id: String(c.id),
          source: "online" as const,
          sessionType: String(c.type ?? "meet"),
          date: String(c.date ?? ""),
          time: c.time ? String(c.time) : undefined,
          title: String(c.playerName ?? "Consulta online"),
          subtitle: c.psychologist ? String(c.psychologist) : undefined,
          tenantId: String(c.tenantId ?? ""),
          tenantName: c.tenantName ? String(c.tenantName) : undefined,
          playerId: c.playerId ? String(c.playerId) : undefined,
          personKey: c.personKey ? String(c.personKey) : undefined,
          category: c.category ? String(c.category) : undefined,
          status: String(c.status ?? "scheduled"),
          notes: c.notes ? String(c.notes) : undefined,
          link: c.link ? String(c.link) : undefined,
          psychologist: c.psychologist ? String(c.psychologist) : undefined,
          isPrivate: c.isPrivate === true,
        }));
      const merged = [...mappedSessions, ...onlineEvents].filter((ev) => {
        if (filterClube && ev.tenantId !== filterClube) return false;
        if (filterAtleta) {
          const matches =
            ev.personKey === filterAtleta ||
            (filterAtleta.startsWith("player:") &&
              ev.playerId === filterAtleta.slice("player:".length)) ||
            ev.playerId === filterAtleta;
          if (!matches) return false;
        }
        if (filterCategoria && (ev.category ?? "") !== filterCategoria) return false;
        if (filterPsychologist) {
          const psych = ev.psychologist ?? ev.subtitle ?? "";
          const selected = psychologists.find((p) => p.id === filterPsychologist)?.name ?? "";
          if (selected && !psych.toLowerCase().includes(selected.toLowerCase())) return false;
        }
        if (showPrivateOnly && !ev.isPrivate) return false;
        return true;
      });
      merged.sort((a, b) => {
        const da = `${a.date}T${a.time ?? "00:00"}`;
        const db = `${b.date}T${b.time ?? "00:00"}`;
        return da.localeCompare(db);
      });
      setEvents(merged);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [
    range.from,
    range.to,
    filterClube,
    filterAtleta,
    filterCategoria,
    filterPsychologist,
    showPrivateOnly,
    carePersons,
    psychologists,
  ]);

  useEffect(() => {
    api.get<TenantOption[]>("/tenants?clubsOnly=1").then(({ data }) => {
      setTenants(Array.isArray(data) ? data : []);
    });
    api.get<Psychologist[]>("/psychologists").then(({ data }) => {
      setPsychologists(Array.isArray(data) ? data : []);
    }).catch(() => setPsychologists([]));
    api
      .get<{ available: boolean }>("/consultations/meet-available")
      .then(({ data }) => setMeetAvailable(data?.available ?? false))
      .catch(() => setMeetAvailable(false));
  }, []);

  useEffect(() => {
    if (!filterClube) {
      setCarePersons([]);
      return;
    }
    api
      .get<PsychologyCarePerson[]>(
        `/psychology-sessions/care-persons?tenantId=${encodeURIComponent(filterClube)}`,
      )
      .then(({ data }) => setCarePersons(Array.isArray(data) ? data : []))
      .catch(() => setCarePersons([]));
  }, [filterClube, refreshTrigger]);

  useEffect(() => {
    if (tenants.length === 1 && !filterClube) setFilterClube(tenants[0].id);
  }, [tenants, filterClube]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents, refreshTrigger]);

  const carePersonsByClube = filterClube
    ? carePersons.filter((p) => p.tenantId === filterClube)
    : carePersons;
  const selectedTenantForFilter = tenants.find((t) => t.id === filterClube);
  const categoriesForFilter = filterClube
    ? filterCategoriesForTenant(allFixtureCategories, selectedTenantForFilter?.categories)
    : FIXTURE_CATEGORIES;
  const selectedPlayerName = filterAtleta
    ? (carePersons.find((p) => p.key === filterAtleta)?.name ?? "")
    : "";

  const eventsByDate = useMemo(() => {
    const map: Record<string, AgendaEvent[]> = {};
    for (const ev of events) {
      if (!map[ev.date]) map[ev.date] = [];
      map[ev.date].push(ev);
    }
    return map;
  }, [events]);

  const monthDays = useMemo(() => {
    const year = focusDate.getFullYear();
    const month = focusDate.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const padStart = first.getDay();
    const cells: Array<{ date: string; day: number; inMonth: boolean }> = [];
    for (let i = 0; i < padStart; i++) {
      const d = new Date(year, month, -padStart + i + 1);
      cells.push({ date: dateKeyFromDate(d), day: d.getDate(), inMonth: false });
    }
    for (let d = 1; d <= last.getDate(); d++) {
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ date, day: d, inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      const lastCell = cells[cells.length - 1];
      const d = new Date(lastCell.date);
      d.setDate(d.getDate() + 1);
      cells.push({ date: dateKeyFromDate(d), day: d.getDate(), inMonth: false });
    }
    return cells;
  }, [focusDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(focusDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return dateKeyFromDate(d);
    });
  }, [focusDate]);

  const stats = useMemo(() => {
    const today = todayKey();
    const weekStart = dateKeyFromDate(startOfWeek(new Date()));
    const weekEnd = weekDays[6] ?? today;
    const todayCount = (eventsByDate[today] ?? []).filter((e) => e.status === "scheduled").length;
    const weekCount = events.filter(
      (e) => e.date >= weekStart && e.date <= weekEnd && e.status === "scheduled",
    ).length;
    const privateCount = events.filter((e) => e.isPrivate).length;
    return { todayCount, weekCount, privateCount };
  }, [events, eventsByDate, weekDays]);

  const selectedDayEvents = eventsByDate[selectedDay] ?? [];

  const handleNavigate = (delta: number) => {
    const next = new Date(focusDate);
    if (viewMode === "month") next.setMonth(next.getMonth() + delta);
    else next.setDate(next.getDate() + delta * 7);
    setFocusDate(next);
    setSelectedDay(dateKeyFromDate(next));
  };

  const handleCreateMeet = async (performerName?: string, options?: { isPrivate?: boolean }) => {
    if (!filterAtleta?.trim() || !newDate.trim()) {
      showFeedback("Atenção", "Selecione a pessoa e informe a data.", "warning");
      return;
    }
    const person = carePersons.find((p) => p.key === filterAtleta);
    if (!person) return;
    setMeetCreating(true);
    try {
      const { data } = await api.post<{ meetLink: string }>("/consultations/create-meet", {
        summary: `Consulta: ${person.name}`,
        description: newNotes.trim() || undefined,
        startDate: newDate,
        startTime: newTime,
      });
      if (!data?.meetLink) return;
      await appendCarePersonOnlineConsultation(filterAtleta, {
        type: "meet",
        status: "scheduled",
        date: newDate,
        time: newTime,
        link: data.meetLink,
        notes: newNotes.trim() || undefined,
        psychologist: performerName?.trim() || newPsychologist.trim() || undefined,
        isPrivate: options?.isPrivate === true,
      });
      setNewDate("");
      setNewTime("09:00");
      setNewNotes("");
      setNewPsychologist("");
      setRefreshTrigger((t) => t + 1);
      showFeedback("Agendado", "Consulta online registrada na agenda.", "success");
    } catch (e: unknown) {
      showFeedback("Erro", e instanceof Error ? e.message : "Erro ao criar consulta.", "error");
    } finally {
      setMeetCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteEvent) return;
    setSaving(true);
    try {
      if (deleteEvent.source === "session") {
        const sessionId = deleteEvent.id.replace(/^session-/, "");
        await api.delete(`/psychology-sessions/${sessionId}`);
      } else {
        await api.delete(`/consultations/${encodeURIComponent(deleteEvent.id)}`);
      }
      setDeleteEvent(null);
      setDetailEvent(null);
      setRefreshTrigger((t) => t + 1);
    } catch {
      showFeedback("Erro", "Não foi possível apagar o atendimento.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePrivate = async (event: AgendaEvent) => {
    if (event.source !== "session") {
      showFeedback("Aviso", "Privacidade de consultas online é definida no agendamento.", "info");
      return;
    }
    setSaving(true);
    try {
      const sessionId = event.id.replace(/^session-/, "");
      await api.patch(`/psychology-sessions/${sessionId}`, { isPrivate: !event.isPrivate });
      setDetailEvent(null);
      setRefreshTrigger((t) => t + 1);
    } catch {
      showFeedback("Erro", "Não foi possível alterar a privacidade.", "error");
    } finally {
      setSaving(false);
    }
  };

  const renderEventChip = (event: AgendaEvent, compact = false) => {
    const typeKey = event.sessionType === "meet" ? "meet" : event.sessionType;
    const modality = getConsultationModality(event.sessionType, event.link);
    return (
      <button
        key={event.id}
        type="button"
        onClick={() => setDetailEvent(event)}
        className={cn(
          "w-full rounded-md border px-2 py-1.5 text-left text-xs transition hover:opacity-90",
          TYPE_COLORS[typeKey] ?? "bg-secondary/40 text-foreground border-border/60",
          event.isPrivate && "border-dashed",
          compact ? "truncate" : "",
        )}
      >
        <div className="flex items-center gap-1">
          {event.isPrivate ? <Lock className="h-3 w-3 shrink-0 opacity-80" /> : null}
          <span className="truncate font-medium">
            {compact ? formatEventTime(event) : event.title}
          </span>
        </div>
        {!compact ? (
          <p className="truncate text-[11px] opacity-80">
            {formatEventTime(event)} · {modality.label}
          </p>
        ) : null}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Calendar className="h-8 w-8 text-violet-400" />
            <div>
              <p className="text-xs text-muted-foreground">Hoje</p>
              <p className="text-2xl font-semibold">{stats.todayCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="h-8 w-8 text-emerald-400" />
            <div>
              <p className="text-xs text-muted-foreground">Semana</p>
              <p className="text-2xl font-semibold">{stats.weekCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Lock className="h-8 w-8 text-amber-400" />
            <div>
              <p className="text-xs text-muted-foreground">Privados</p>
              <p className="text-2xl font-semibold">{stats.privateCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Clube</label>
              <Select
                value={filterClube || "all"}
                onValueChange={(v) => {
                  setFilterClube(v === "all" ? "" : v);
                  setFilterAtleta("");
                  setFilterCategoria("");
                }}
              >
                <SelectTrigger className="text-foreground">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Pessoa</label>
              <Select
                value={filterAtleta || "all"}
                onValueChange={(v) => setFilterAtleta(v === "all" ? "" : v)}
              >
                <SelectTrigger className="text-foreground">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {carePersonsByClube.map((p) => (
                    <SelectItem key={p.key} value={p.key}>
                      {psychologyPersonSelectLabel(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Categoria</label>
              <Select
                value={filterCategoria || "all"}
                onValueChange={(v) => setFilterCategoria(v === "all" ? "" : v)}
              >
                <SelectTrigger className="text-foreground">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categoriesForFilter.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.labelPT}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Profissional</label>
              <Select
                value={filterPsychologist || "all"}
                onValueChange={(v) => setFilterPsychologist(v === "all" ? "" : v)}
              >
                <SelectTrigger className="text-foreground">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {psychologists.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant={showPrivateOnly ? "default" : "outline"}
              className="min-h-[44px] gap-2"
              onClick={() => setShowPrivateOnly((v) => !v)}
            >
              <Lock className="h-4 w-4" />
              Só privados
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="icon" className="h-11 w-11" onClick={() => handleNavigate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" className="h-11 w-11" onClick={() => handleNavigate(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="min-h-[44px]"
              onClick={() => {
                const now = new Date();
                setFocusDate(now);
                setSelectedDay(todayKey());
              }}
            >
              Hoje
            </Button>
            <CardTitle className="text-lg">
              {viewMode === "month" ? formatMonthYear(focusDate) : formatDateDayMonYear(selectedDay)}
            </CardTitle>
          </div>
          <BostonTvDashboardTabs
            tabs={[
              { id: "month", label: "Mês", icon: Calendar },
              { id: "week", label: "Semana", icon: ClipboardList },
              { id: "list", label: "Lista", icon: Users },
            ]}
            active={viewMode}
            onChange={(v) => setViewMode(v as ViewMode)}
            ariaLabel="Visualização da agenda"
            compact
          />
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : viewMode === "month" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
                {WEEKDAY_LABELS.map((d) => (
                  <div key={d} className="py-1 font-medium">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthDays.map((cell) => {
                  const dayEvents = eventsByDate[cell.date] ?? [];
                  const isSelected = cell.date === selectedDay;
                  const isToday = cell.date === todayKey();
                  return (
                    <button
                      key={cell.date}
                      type="button"
                      onClick={() => setSelectedDay(cell.date)}
                      className={cn(
                        "min-h-[88px] rounded-lg border p-1 text-left transition sm:min-h-[104px]",
                        cell.inMonth ? "bg-background" : "bg-muted/20 opacity-60",
                        isSelected && "border-violet-500 ring-1 ring-violet-500/40",
                        isToday && !isSelected && "border-violet-500/50",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm",
                          isToday && "bg-violet-500 text-white",
                        )}
                      >
                        {cell.day}
                      </span>
                      <div className="mt-1 space-y-1">
                        {dayEvents.slice(0, 2).map((ev) => renderEventChip(ev, true))}
                        {dayEvents.length > 2 ? (
                          <p className="px-1 text-[10px] text-muted-foreground">+{dayEvents.length - 2}</p>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium">
                  {formatDateDayMonYear(selectedDay)}
                </h3>
                {selectedDayEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum atendimento neste dia.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">{selectedDayEvents.map((ev) => renderEventChip(ev))}</div>
                )}
              </div>
            </div>
          ) : viewMode === "week" ? (
            <div className="grid gap-3 lg:grid-cols-7">
              {weekDays.map((date) => (
                <div key={date} className="rounded-lg border border-border/60 p-2">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    {WEEKDAY_LABELS[new Date(`${date}T12:00:00`).getDay()]} · {formatDateDayMonYear(date)}
                  </p>
                  <div className="space-y-2">
                    {(eventsByDate[date] ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">—</p>
                    ) : (
                      (eventsByDate[date] ?? []).map((ev) => renderEventChip(ev))
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {events.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Nenhum atendimento no período.</p>
              ) : (
                events.map((ev) => (
                  <div
                    key={ev.id}
                    className={cn(
                      "flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between",
                      ev.isPrivate && "border-dashed",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{ev.title}</span>
                        {ev.isPrivate ? (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400">
                            <Lock className="h-3 w-3" />
                            Privado
                          </span>
                        ) : null}
                        <span className="rounded bg-secondary px-2 py-0.5 text-xs">
                          {STATUS_LABEL[ev.status] ?? ev.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDateTimeDayMonYear(`${ev.date}T${ev.time ?? "00:00"}`)}
                        {ev.subtitle ? ` · ${ev.subtitle}` : ""}
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" className="min-h-[36px]" onClick={() => setDetailEvent(ev)}>
                      Detalhes
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <PsychologySchedulingCard
            filterClube={filterClube}
            filterAtleta={filterAtleta}
            filterCategoria={filterCategoria}
            tenants={tenants}
            selectedPlayerName={selectedPlayerName}
            carePersons={carePersonsByClube}
            psychologists={psychologists}
            meetAvailable={meetAvailable}
            meetCreating={meetCreating}
            newDate={newDate}
            newTime={newTime}
            newNotes={newNotes}
            newPsychologist={newPsychologist}
            onNewDateChange={setNewDate}
            onNewTimeChange={setNewTime}
            onNewNotesChange={setNewNotes}
            onNewPsychologistChange={setNewPsychologist}
            onCreateMeet={(name, opts) => void handleCreateMeet(name, opts)}
            onScheduled={() => setRefreshTrigger((t) => t + 1)}
            showFeedback={showFeedback}
          />
        </CardContent>
      </Card>

      <Dialog open={detailEvent != null} onOpenChange={(open) => !open && setDetailEvent(null)}>
        <DialogContent className="max-w-lg">
          {detailEvent ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  {detailEvent.title}
                  {detailEvent.isPrivate ? (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-2 py-0.5 text-xs font-normal text-amber-400">
                      <Lock className="h-3 w-3" />
                      Privado
                    </span>
                  ) : null}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Data:</span>{" "}
                  {formatDateTimeDayMonYear(`${detailEvent.date}T${detailEvent.time ?? "00:00"}`)}
                </p>
                <p>
                  <span className="text-muted-foreground">Tipo:</span>{" "}
                  {PSYCH_SESSION_TYPE_LABEL[detailEvent.sessionType as keyof typeof PSYCH_SESSION_TYPE_LABEL] ??
                    getConsultationModality(detailEvent.sessionType, detailEvent.link).label}
                </p>
                <p>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  {STATUS_LABEL[detailEvent.status] ?? detailEvent.status}
                </p>
                {detailEvent.subtitle ? (
                  <p>
                    <span className="text-muted-foreground">Profissional:</span> {detailEvent.subtitle}
                  </p>
                ) : null}
                {detailEvent.location ? (
                  <p className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    {detailEvent.location}
                  </p>
                ) : null}
                {detailEvent.notes ? (
                  <p className="whitespace-pre-wrap text-muted-foreground">{detailEvent.notes}</p>
                ) : null}
                {detailEvent.link ? (
                  <Button variant="outline" size="sm" className="min-h-[36px] gap-2" asChild>
                    <Link href={`/dashboard/consultas/abrir-meet?url=${encodeURIComponent(detailEvent.link)}`} target="_blank">
                      <Video className="h-4 w-4" />
                      Abrir reunião
                    </Link>
                  </Button>
                ) : null}
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-row sm:flex-wrap">
                {detailEvent.personKey || detailEvent.playerId ? (
                  <Button variant="outline" className="min-h-[44px]" asChild>
                    <Link
                      href={
                        detailEvent.personKey
                          ? psychologyPersonProfileHref(
                              {
                                personType: detailEvent.personKey.split(":")[0] as "player" | "employee" | "staff",
                                personId: detailEvent.personKey.split(":").slice(1).join(":"),
                              },
                              "consultas",
                            )
                          : playerPsychologyProfileHref(detailEvent.playerId!, "consultas")
                      }
                    >
                      Ver ficha
                    </Link>
                  </Button>
                ) : null}
                {detailEvent.source === "session" ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[44px] gap-2"
                    disabled={saving}
                    onClick={() => void handleTogglePrivate(detailEvent)}
                  >
                    <Lock className="h-4 w-4" />
                    {detailEvent.isPrivate ? "Tornar público" : "Marcar privado"}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="destructive"
                  className="min-h-[44px]"
                  onClick={() => {
                    setDeleteEvent(detailEvent);
                    setDetailEvent(null);
                  }}
                >
                  Apagar
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteEvent != null} onOpenChange={(open) => !open && setDeleteEvent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar atendimento?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saving}
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((prev) => ({ ...prev, open }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.variant}
      />
    </div>
  );
}
