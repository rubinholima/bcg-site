"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Video,
  ExternalLink,
  User,
  Building2,
  Loader2,
  Trash2,
  StickyNote,
} from "lucide-react";
import { getPublicImageUrl } from "@/lib/media-url";
import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

interface Consultation {
  id: string;
  playerId: string;
  tenantId: string;
  playerName: string;
  tenantName?: string;
  tenantLogoUrl?: string;
  date?: string;
  time?: string;
  type?: string;
  link?: string;
  notes?: string;
  status?: string;
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendada",
  completed: "Realizada",
  cancelled: "Cancelada",
};

const HOURS = Array.from({ length: 11 }, (_, i) => 8 + i); // 8h - 18h

function formatDate(d: string, time?: string): string {
  if (!d) return "—";
  try {
    const [y, m, day] = d.split("-");
    const br = `${day}/${m}/${y}`;
    return time ? `${br} ${time}` : br;
  } catch {
    return d;
  }
}

function getDaysInMonth(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days: { date: string; day: number; isCurrent: boolean }[] = [];
  for (let d = 1; d <= last.getDate(); d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ date: dateStr, day: d, isCurrent: true });
  }
  return days;
}

interface ConsultasCalendarProps {
  refreshTrigger?: number;
}

export function ConsultasCalendar({ refreshTrigger = 0 }: ConsultasCalendarProps) {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const fetchConsultations = useCallback(() => {
    setLoading(true);
    api
      .get<Consultation[]>("/consultations")
      .then(({ data }) => setConsultations(Array.isArray(data) ? data : []))
      .catch(() => setConsultations([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchConsultations();
  }, [refreshTrigger, fetchConsultations]);

  const filtered = dateFilter
    ? consultations.filter((c) => c.date === dateFilter)
    : consultations;

  const byDate = filtered.reduce<Record<string, Consultation[]>>((acc, c) => {
    const key = c.date ?? "sem-data";
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  const sortedDates = Object.keys(byDate).sort();

  // Horários ocupados no dia selecionado
  const dayConsultations = dateFilter
    ? consultations.filter((c) => c.date === dateFilter && c.time)
    : [];
  const occupiedSlots = new Set(
    dayConsultations.map((c) => {
      const [h] = (c.time ?? "00:00").split(":");
      return parseInt(h, 10);
    })
  );

  const handleDelete = async (id: string) => {
    if (!confirm("Apagar esta reunião/consulta?")) return;
    setDeletingId(id);
    try {
      await api.delete(`/consultations/${encodeURIComponent(id)}`);
      fetchConsultations();
    } catch {
      alert("Erro ao apagar. Tente novamente.");
    } finally {
      setDeletingId(null);
    }
  };

  const days = getDaysInMonth(calendarMonth.year, calendarMonth.month);
  const monthLabel = new Date(calendarMonth.year, calendarMonth.month).toLocaleDateString(
    "pt-BR",
    { month: "long", year: "numeric" }
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <CardTitle className="text-base">Calendário de consultas</CardTitle>
          <CardDescription>
            Todas as consultas cadastradas na ficha dos jogadores.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchConsultations()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar"}
          </Button>
          <input
            type="date"
            className="flex h-10 min-w-[10rem] rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            placeholder="Filtrar por data"
          />
          {dateFilter && (
            <Button variant="ghost" size="sm" onClick={() => setDateFilter("")}>
              Limpar filtro
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Mini calendário + horários do dia */}
        <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
          <h4 className="text-sm font-medium">Horários do dia</h4>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setCalendarMonth((m) =>
                  m.month === 0 ? { year: m.year - 1, month: 11 } : { year: m.year, month: m.month - 1 }
                )
              }
            >
              ‹
            </Button>
            <span className="text-sm py-1.5 capitalize">{monthLabel}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setCalendarMonth((m) =>
                  m.month === 11 ? { year: m.year + 1, month: 0 } : { year: m.year, month: m.month + 1 }
                )
              }
            >
              ›
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
            {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
              <div key={`wd-${i}`} className="font-medium text-muted-foreground py-1">
                {d}
              </div>
            ))}
            {new Date(calendarMonth.year, calendarMonth.month, 1).getDay() > 0 &&
              Array.from({ length: new Date(calendarMonth.year, calendarMonth.month, 1).getDay() }).map(
                (_, i) => (
                  <div key={`empty-${i}`} />
                )
              )}
            {days.map(({ date, day }) => {
              const hasConsultation = consultations.some((c) => c.date === date);
              const isSelected = dateFilter === date;
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setDateFilter(date)}
                  className={`py-1 rounded text-xs ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : hasConsultation
                        ? "bg-amber-500/30 text-amber-700 dark:text-amber-400"
                        : "hover:bg-muted"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
          {dateFilter && (
            <div className="border-t pt-2 mt-2">
              <p className="text-xs text-muted-foreground mb-1">
                {formatDate(dateFilter)} — ocupados
              </p>
              <div className="flex flex-wrap gap-1">
                {HOURS.map((h) => (
                  <span
                    key={h}
                    className={`inline-flex items-center justify-center w-8 h-6 rounded text-xs ${
                      occupiedSlots.has(h)
                        ? "bg-amber-500/30 text-amber-700 dark:text-amber-400"
                        : "bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    {h}h
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Lista de consultas */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {consultations.length === 0
                ? "Nenhuma consulta cadastrada."
                : "Nenhuma consulta na data selecionada."}
            </p>
          ) : (
            <div className="space-y-4">
              {sortedDates.map((dateKey) => (
                <div key={dateKey}>
                  <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                    {dateKey === "sem-data"
                      ? "Sem data definida"
                      : formatDate(dateKey)}
                  </h3>
                  <div className="space-y-2">
                    {byDate[dateKey].map((c) => (
                      <div
                        key={c.id}
                        className="flex flex-col gap-2 rounded-lg border p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <Link
                              href={`/dashboard/cadastros/jogadores/${c.playerId}/edit`}
                              className="truncate font-medium hover:underline"
                            >
                              {c.playerName}
                            </Link>
                          </div>
                          {c.tenantName && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              {c.tenantLogoUrl ? (
                                <img
                                  src={getPublicImageUrl(c.tenantLogoUrl)}
                                  alt={c.tenantName}
                                  className="h-5 w-5 rounded object-contain flex-shrink-0"
                                />
                              ) : (
                                <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                              )}
                              <span>{c.tenantName}</span>
                            </div>
                          )}
                          {c.time && (
                            <span className="text-sm">{c.time}</span>
                          )}
                          <span
                            className={`rounded px-2 py-0.5 text-xs ${
                              c.status === "completed"
                                ? "bg-emerald-500/20 text-emerald-600"
                                : c.status === "cancelled"
                                  ? "bg-destructive/20 text-destructive"
                                  : "bg-amber-500/20 text-amber-600"
                            }`}
                          >
                            {STATUS_LABEL[c.status ?? "scheduled"] ?? c.status}
                          </span>
                          {c.link && (
                            <Button variant="outline" size="sm" asChild>
                              <a
                                href={c.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={
                                  c.link.includes("meet.google.com")
                                    ? "Entrar na videoconferência"
                                    : "Abre o evento no Google Calendar."
                                }
                              >
                                <Video className="mr-1 h-4 w-4" />
                                {c.link.includes("meet.google.com") ? "Entrar" : "Abrir evento"}
                                <ExternalLink className="ml-1 h-3 w-3" />
                              </a>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="ml-auto shrink-0 text-destructive hover:text-destructive"
                            title="Apagar reunião"
                            disabled={deletingId === c.id}
                            onClick={() => handleDelete(c.id)}
                          >
                            {deletingId === c.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        {c.notes && (
                          <div className="flex gap-2 text-sm text-muted-foreground border-t pt-2">
                            <StickyNote className="h-4 w-4 shrink-0 mt-0.5" />
                            <span className="whitespace-pre-wrap">{c.notes}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
