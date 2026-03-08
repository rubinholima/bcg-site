"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  User,
  Building2,
  Loader2,
  Trash2,
  StickyNote,
  History,
  Send,
  CalendarOff,
  CalendarClock,
  UserCircle,
} from "lucide-react";
import { getPublicImageUrl } from "@/lib/media-url";
import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import type { Psychologist } from "@/types/psychologist";

interface Consultation {
  id: string;
  playerId: string;
  tenantId: string;
  playerName: string;
  tenantName?: string;
  tenantLogoUrl?: string;
  category?: string;
  date?: string;
  time?: string;
  type?: string;
  link?: string;
  notes?: string;
  status?: string;
  psychologist?: string;
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
  /** Filtro por nome do atleta (busca) */
  nameFilter?: string;
  onNameFilterChange?: (value: string) => void;
  /** Filtros adicionais: clube (tenantId), atleta (playerId), categoria */
  tenantIdFilter?: string;
  playerIdFilter?: string;
  categoryFilter?: string;
  /** Quando passado, usa esta lista em vez de buscar (para uso na página Consultas com histórico) */
  consultationsProp?: Consultation[];
  /** Chamado quando o usuário clica em Atualizar e a lista é controlada pelo parent */
  onRefreshRequested?: () => void;
  /** Chamado ao clicar em Histórico para exibir o histórico do atleta embaixo do calendário */
  onShowHistory?: (playerId: string, playerName: string) => void;
  /** Nome do atleta selecionado no filtro (para o botão Histórico quando não há consultas na lista) */
  selectedPlayerName?: string;
}

export function ConsultasCalendar({
  refreshTrigger = 0,
  nameFilter,
  onNameFilterChange,
  tenantIdFilter,
  playerIdFilter,
  categoryFilter,
  consultationsProp,
  onRefreshRequested,
  onShowHistory,
  selectedPlayerName,
}: ConsultasCalendarProps) {
  const [consultations, setConsultations] = useState<Consultation[]>(consultationsProp ?? []);
  const [loading, setLoading] = useState(!consultationsProp);
  const [dateFilter, setDateFilter] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<{
    c: Consultation;
    date: string;
    time: string;
    psychologist: string;
    notes: string;
  } | null>(null);
  const [editResult, setEditResult] = useState<{ type: "ok" | "error"; msg: string } | null>(null);
  const [editResultForId, setEditResultForId] = useState<string | null>(null);
  const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const fetchConsultations = useCallback(() => {
    if (consultationsProp !== undefined) return; // controlado pelo parent
    setLoading(true);
    api
      .get<Consultation[]>("/consultations")
      .then(({ data }) => setConsultations(Array.isArray(data) ? data : []))
      .catch(() => setConsultations([]))
      .finally(() => setLoading(false));
  }, [consultationsProp]);

  useEffect(() => {
    if (consultationsProp !== undefined) {
      setConsultations(consultationsProp);
      setLoading(false);
      return;
    }
    fetchConsultations();
  }, [refreshTrigger, consultationsProp, fetchConsultations]);

  useEffect(() => {
    api
      .get<Psychologist[]>("/psychologists")
      .then(({ data }) => setPsychologists(Array.isArray(data) ? data : []))
      .catch(() => setPsychologists([]));
  }, []);

  const filtered = (dateFilter
    ? consultations.filter((c) => c.date === dateFilter)
    : consultations
  )
    .filter((c) => c.status !== "completed")
    .filter(
      (c) =>
        !nameFilter?.trim() ||
        (c.playerName?.toLowerCase().includes(nameFilter.trim().toLowerCase()) ?? false)
    )
    .filter((c) => !tenantIdFilter || c.tenantId === tenantIdFilter)
    .filter((c) => !playerIdFilter || c.playerId === playerIdFilter)
    .filter((c) => !categoryFilter || (c.category ?? "") === categoryFilter);

  const activeConsultations = consultations.filter((c) => c.status !== "completed");
  const byDate = filtered.reduce<Record<string, Consultation[]>>((acc, c) => {
    const key = c.date ?? "sem-data";
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  const sortedDates = Object.keys(byDate).sort();

  // Horários ocupados no dia selecionado
  const dayConsultations = dateFilter
    ? activeConsultations.filter((c) => c.date === dateFilter && c.time)
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

  const handleResendLink = async (c: Consultation) => {
    if (!c.link?.trim() || !c.date?.trim()) {
      alert("Esta consulta não tem link ou data para reenviar.");
      return;
    }
    setResendingId(c.id);
    setEditResult(null);
    try {
      const res = await api.post<{ emailSent?: boolean; emailError?: string; noContact?: boolean }>(
        "/consultations/notify-player",
        {
          playerId: c.playerId,
          link: c.link,
          date: c.date,
          time: c.time ?? undefined,
          psychologist: c.psychologist ?? undefined,
        }
      );
      const data = res.data ?? {};
      if (data.emailSent) {
        setEditResult({ type: "ok", msg: "Link reenviado por e-mail para o atleta." });
        setEditResultForId(c.id);
      } else if (data.noContact) {
        setEditResult({ type: "error", msg: "Atleta sem e-mail de contato cadastrado." });
        setEditResultForId(c.id);
      } else {
        setEditResult({ type: "error", msg: data.emailError ?? "Erro ao enviar e-mail." });
        setEditResultForId(c.id);
      }
    } catch {
      setEditResult({ type: "error", msg: "Erro ao reenviar. Tente novamente." });
      setEditResultForId(c.id);
    } finally {
      setResendingId(null);
    }
  };

  const handleCancelConsultation = async (c: Consultation) => {
    if (c.status === "cancelled") return;
    if (!confirm("Cancelar esta consulta? O atleta permanecerá no histórico como cancelada.")) return;
    setCancellingId(c.id);
    try {
      await api.patch(`/consultations/${encodeURIComponent(c.id)}`, { status: "cancelled" });
      fetchConsultations();
    } catch {
      alert("Erro ao cancelar. Tente novamente.");
    } finally {
      setCancellingId(null);
    }
  };

  const openEditModal = (c: Consultation) => {
    setEditModal({
      c,
      date: c.date ?? "",
      time: c.time ?? "",
      psychologist: c.psychologist ?? "",
      notes: c.notes ?? "",
    });
    setEditResult(null);
    setEditResultForId(null);
  };

  const handleSaveEdit = async () => {
    if (!editModal) return;
    const { c, date, time, psychologist, notes } = editModal;
    if (!date.trim()) {
      setEditResult({ type: "error", msg: "Data é obrigatória." });
      return;
    }
    setUpdatingId(c.id);
    setEditResult(null);
    try {
      await api.patch(`/consultations/${encodeURIComponent(c.id)}`, {
        date: date.trim(),
        time: time.trim() || undefined,
        psychologist: psychologist.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setEditModal(null);
      fetchConsultations();
      onRefreshRequested?.();
    } catch {
      setEditResult({ type: "error", msg: "Erro ao salvar. Tente novamente." });
    } finally {
      setUpdatingId(null);
    }
  };

  const days = getDaysInMonth(calendarMonth.year, calendarMonth.month);
  const monthLabel = new Date(calendarMonth.year, calendarMonth.month).toLocaleDateString(
    "pt-BR",
    { month: "long", year: "numeric" }
  );

  return (
    <div className="space-y-4 flex flex-col min-h-0 flex-1">
      <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div>
          <CardTitle className="text-base">Calendário de consultas</CardTitle>
          <CardDescription>
            Todas as consultas cadastradas na ficha dos atletas.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onNameFilterChange != null && (
            <input
              type="text"
              placeholder="Buscar por nome do atleta"
              className="flex h-10 min-w-[12rem] rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              value={nameFilter ?? ""}
              onChange={(e) => onNameFilterChange(e.target.value)}
            />
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => (consultationsProp !== undefined ? onRefreshRequested?.() : fetchConsultations())}
            disabled={loading}
          >
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
            <Button variant="outline" size="sm" onClick={() => setDateFilter("")}>
              Limpar filtro
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        {/* Mini calendário + horários do dia — altura fixa pelo conteúdo, não estica */}
        <div className="space-y-3 rounded-lg border p-3 bg-muted/30 shrink-0 lg:shrink-0 self-start w-full">
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
              const hasConsultation = activeConsultations.some((c) => c.date === date);
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

        {/* Lista de consultas — só esta área rola; calendário fica parado */}
        <div className="lg:col-span-2 space-y-4 overflow-y-auto min-h-0 max-h-[36vh] pr-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-4 flex flex-col items-center gap-3 text-center">
              <p className="text-sm text-muted-foreground">
                {consultations.length === 0
                  ? "Nenhuma consulta cadastrada."
                  : nameFilter?.trim()
                    ? "Nenhuma consulta encontrada para esse nome."
                    : "Nenhuma consulta na data selecionada."}
              </p>
              {playerIdFilter && onShowHistory && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onShowHistory(playerIdFilter, selectedPlayerName ?? "Atleta")}
                  className="shrink-0"
                >
                  <History className="mr-1 h-4 w-4" />
                  Veja aqui o histórico
                </Button>
              )}
            </div>
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
                        className="flex flex-col gap-2 rounded-lg border-2 border-border p-3"
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
                          {c.psychologist && (
                            <span className="flex items-center gap-1 text-sm text-muted-foreground">
                              <UserCircle className="h-3.5 w-3.5 shrink-0" />
                              {c.psychologist}
                            </span>
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResendLink(c)}
                              disabled={resendingId === c.id}
                              title="Reenviar link da consulta por e-mail ao atleta"
                            >
                              {resendingId === c.id ? (
                                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Send className="mr-1 h-3.5 w-3.5" />
                              )}
                              Reenviar link
                            </Button>
                          )}
                          {c.status !== "cancelled" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditModal(c)}
                                disabled={updatingId === c.id}
                                title="Editar data, horário ou psicólogo"
                              >
                                {updatingId === c.id ? (
                                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <CalendarClock className="mr-1 h-3.5 w-3.5" />
                                )}
                                Editar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleCancelConsultation(c)}
                                disabled={cancellingId === c.id}
                                title="Cancelar esta consulta"
                              >
                                {cancellingId === c.id ? (
                                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <CalendarOff className="mr-1 h-3.5 w-3.5" />
                                )}
                                Cancelar consulta
                              </Button>
                            </>
                          )}
                          {c.link && onShowHistory && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onShowHistory(c.playerId, c.playerName)}
                              title="Ver histórico do atleta"
                            >
                              <History className="mr-1 h-4 w-4" />
                              Histórico
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
                        {editResult && editResultForId === c.id && (
                          <p className={`text-sm ${editResult.type === "ok" ? "text-emerald-600" : "text-destructive"}`}>
                            {editResult.msg}
                          </p>
                        )}
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

      {/* Modal Editar consulta */}
      <Dialog open={!!editModal} onOpenChange={(open) => !open && setEditModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar consulta</DialogTitle>
          </DialogHeader>
          {editModal && (
            <div className="grid gap-4 py-2">
              <p className="text-sm text-muted-foreground">
                Atleta: <span className="font-medium text-foreground">{editModal.c.playerName}</span>
              </p>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Data</label>
                <input
                  type="date"
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  value={editModal.date}
                  onChange={(e) =>
                    setEditModal((prev) => (prev ? { ...prev, date: e.target.value } : null))
                  }
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Horário</label>
                <input
                  type="time"
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  value={editModal.time}
                  onChange={(e) =>
                    setEditModal((prev) => (prev ? { ...prev, time: e.target.value } : null))
                  }
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Psicólogo(a) que atende</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  value={
                    psychologists.some((p) => p.name === editModal.psychologist)
                      ? editModal.psychologist
                      : editModal.psychologist.trim()
                        ? "__outro__"
                        : ""
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    setEditModal((prev) =>
                      prev ? { ...prev, psychologist: v === "__outro__" ? prev.psychologist : v } : null
                    );
                  }}
                >
                  <option value="">— Selecione —</option>
                  {psychologists
                    .filter((p) => !p.calendarBlocked)
                    .map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                        {p.crpOrEquivalent ? ` (${p.crpOrEquivalent})` : ""}
                      </option>
                    ))}
                  <option value="__outro__">
                    Outro
                    {editModal.psychologist.trim() &&
                      !psychologists.some((p) => p.name === editModal.psychologist)
                      ? `: ${editModal.psychologist}`
                      : "…"}
                  </option>
                </select>
                {!psychologists.some((p) => p.name === editModal.psychologist) && (
                  <input
                    type="text"
                    placeholder="Nome do psicólogo (quando não está na lista)"
                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                    value={editModal.psychologist}
                    onChange={(e) =>
                      setEditModal((prev) => (prev ? { ...prev, psychologist: e.target.value } : null))
                    }
                  />
                )}
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Motivo da consulta</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-y"
                  placeholder="Ex.: Avaliação, acompanhamento, assunto da sessão..."
                  value={editModal.notes}
                  onChange={(e) =>
                    setEditModal((prev) => (prev ? { ...prev, notes: e.target.value } : null))
                  }
                />
              </div>
              {editResult && editModal && (
                <p
                  className={`text-sm ${
                    editResult.type === "ok" ? "text-emerald-600" : "text-destructive"
                  }`}
                >
                  {editResult.msg}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            {editModal && (
              <>
                <Button variant="outline" onClick={() => { setEditResult(null); setEditResultForId(null); setEditModal(null); }}>
                  Fechar
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={updatingId === editModal.c.id}
                >
                  {updatingId === editModal.c.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Salvar
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
