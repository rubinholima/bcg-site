"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Video, Loader2, User, Plus, Trash2, FileText, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConsultasCalendar } from "@/components/dashboard/ConsultasCalendar";
import { FeedbackModal, type FeedbackVariant } from "@/components/ui/feedback-modal";
import {
  type PsychologicalAssessmentEntry,
} from "@/components/dashboard/player-module-types";
import { PsychAnamnesisForm } from "@/components/dashboard/psychology/PsychAnamnesisForm";
import { PsychologySchedulingCard } from "@/components/dashboard/psychology/PsychologySchedulingCard";
import { emptyPsychAnamnesis, psychEntryLabel } from "@/lib/psych-anamnesis";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import type { Psychologist } from "@/types/psychologist";
import { FIXTURE_CATEGORIES, filterCategoriesForTenant } from "@/lib/fixture-categories";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";
import { getConsultationModality, playerPsychologyProfileHref } from "@/lib/consultation-display";
import { getPlayerListDisplayName } from "@/lib/player-display-name";

interface PlayerOption {
  id: string;
  name: string;
  tenantId?: string;
  category?: string | null;
  registrationProfile?: unknown;
}

interface TenantOption {
  id: string;
  name: string;
  kind?: { id: string; name: string };
  categories?: string[] | null;
}

interface ConsultationItem {
  id: string;
  playerId: string;
  tenantId: string;
  playerName: string;
  tenantName?: string;
  category?: string;
  date?: string;
  time?: string;
  type?: string;
  link?: string;
  notes?: string;
  status?: string;
  psychologist?: string;
  durationSeconds?: number;
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendada",
  completed: "Realizada",
  cancelled: "Cancelada",
};

function formatDate(d: string, time?: string): string {
  if (!d) return "—";
  try {
    const [y, m, day] = d.split("-");
    return time ? `${day}/${m}/${y} ${time}` : `${day}/${m}/${y}`;
  } catch {
    return d;
  }
}

interface ConsultationRowProps {
  item: ConsultationItem;
  onUpdateStatusAndNotes: (id: string, p: { status?: string; notes?: string }) => Promise<void>;
  statusLabel: Record<string, string>;
  formatDate: (d: string, time?: string) => string;
}

function ConsultationRow({
  item,
  onUpdateStatusAndNotes,
  statusLabel,
  formatDate: fmt,
}: ConsultationRowProps) {
  const [status, setStatus] = useState(item.status ?? "scheduled");
  const [saving, setSaving] = useState(false);
  const handleStatusChange = async (value: string) => {
    setStatus(value);
    setSaving(true);
    try {
      await onUpdateStatusAndNotes(item.id, { status: value });
    } finally {
      setSaving(false);
    }
  };

  const statusClass =
    status === "completed"
      ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
      : status === "cancelled"
        ? "bg-destructive/20 text-destructive"
        : "bg-amber-500/20 text-amber-600 dark:text-amber-400";

  const modality = getConsultationModality(item.type, item.link);

  const handleIniciarSessao = () => {
    if (!item.link || typeof window === "undefined") return;
    const sw = window.screen.availWidth ?? 1024;
    const sh = window.screen.availHeight ?? 768;
    const half = Math.floor(sw / 2);
    const screenX = window.screenX ?? window.screenLeft ?? 0;
    const screenY = window.screenY ?? window.screenTop ?? 0;
    const base = window.location.origin;
    const sessaoUrl = `${base}/dashboard/consultas/sessao?id=${encodeURIComponent(item.id)}`;
    const meetRedirectUrl = `${base}/dashboard/consultas/abrir-meet?url=${encodeURIComponent(item.link)}`;
    const leftFeatures = `popup=yes,width=${half},height=${sh},left=${screenX},top=${screenY},scrollbars=yes,resizable=yes`;
    const rightFeatures = `popup=yes,width=${half},height=${sh},left=${screenX + half},top=${screenY},scrollbars=yes,resizable=yes`;
    const sessaoWin = window.open(sessaoUrl, "sessao", leftFeatures);
    window.open(meetRedirectUrl, "meet", rightFeatures);
    if (sessaoWin) sessaoWin.focus();
  };

  return (
    <div className="rounded-lg border p-3 text-sm space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-muted-foreground">{fmt(item.date ?? "", item.time)}</span>
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${modality.toneClass}`}>
          {modality.label}
        </span>
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusClass}`}>
          {statusLabel[status] ?? status}
        </span>
        {status === "completed" && typeof item.durationSeconds === "number" && (
          <span className="text-xs text-muted-foreground">Duração: {Math.floor(item.durationSeconds / 60)}min</span>
        )}
        <Select value={status} onValueChange={handleStatusChange} disabled={saving}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="scheduled">{statusLabel.scheduled ?? "Agendada"}</SelectItem>
            <SelectItem value="completed">{statusLabel.completed ?? "Realizada"}</SelectItem>
            <SelectItem value="cancelled">{statusLabel.cancelled ?? "Cancelada"}</SelectItem>
          </SelectContent>
        </Select>
        {saving && <span className="text-xs text-muted-foreground">Salvando…</span>}
        {item.link && (
          <Button variant="outline" size="sm" asChild className="gap-1">
            <Link
              href={`/dashboard/consultas/abrir-meet?url=${encodeURIComponent(item.link)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Video className="h-3.5 w-3.5" />
              Abrir reunião
            </Link>
          </Button>
        )}
        {item.link && (
          <Button variant="default" size="sm" onClick={handleIniciarSessao} className="gap-1">
            <Video className="h-3.5 w-3.5" />
            Iniciar sessão
          </Button>
        )}
      </div>
      {modality.isOnline && item.link ? (
        <p className="text-xs text-muted-foreground break-all">
          Link:{" "}
          <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">
            {item.link}
          </a>
        </p>
      ) : null}
      {item.notes && (
        <p className="text-muted-foreground text-xs truncate max-w-full" title={item.notes}>
          {item.notes}
        </p>
      )}
    </div>
  );
}

export default function ConsultasPage() {
  const router = useRouter();
  const { canAccessModule, loading } = useAuth();
  const [nameFilter, setNameFilter] = useState("");
  const [filterClube, setFilterClube] = useState("");
  const [filterAtleta, setFilterAtleta] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("");
  const [calendarRefreshTrigger, setCalendarRefreshTrigger] = useState(0);
  const [consultations, setConsultations] = useState<ConsultationItem[]>([]);
  const [consultationsLoading, setConsultationsLoading] = useState(true);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [meetAvailable, setMeetAvailable] = useState<boolean | null>(null);
  const [meetCreating, setMeetCreating] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("09:00");
  const [newNotes, setNewNotes] = useState("");
  const [newPsychologist, setNewPsychologist] = useState("");
  const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
  const [historyPlayerId, setHistoryPlayerId] = useState<string | null>(null);
  const [historyPlayerName, setHistoryPlayerName] = useState<string>("");
  const [psychList, setPsychList] = useState<PsychologicalAssessmentEntry[]>([]);
  const [psychLoading, setPsychLoading] = useState(false);
  const [psychSaving, setPsychSaving] = useState(false);
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
    []
  );

  const fetchConsultations = useCallback(() => {
    setConsultationsLoading(true);
    api
      .get<ConsultationItem[]>("/consultations")
      .then(({ data }) => setConsultations(Array.isArray(data) ? data : []))
      .catch(() => setConsultations([]))
      .finally(() => setConsultationsLoading(false));
  }, []);

  useEffect(() => {
    fetchConsultations();
  }, [calendarRefreshTrigger, fetchConsultations]);

  useEffect(() => {
    if (!canAccessModule("saude")) return;
    api.get<TenantOption[]>("/tenants?clubsOnly=1").then(({ data }) => {
      setTenants(Array.isArray(data) ? data : []);
    });
    api.get<PlayerOption[]>("/players").then(({ data }) => {
      setPlayers(Array.isArray(data) ? data : []);
    });
    api.get<Psychologist[]>("/psychologists").then(({ data }) => {
      setPsychologists(Array.isArray(data) ? data : []);
    }).catch(() => setPsychologists([]));
    api
      .get<{ available: boolean }>("/consultations/meet-available")
      .then(({ data }) => setMeetAvailable(data?.available ?? false))
      .catch(() => setMeetAvailable(false));
  }, [canAccessModule]);

  useEffect(() => {
    if (tenants.length === 1 && !filterClube) {
      setFilterClube(tenants[0].id);
    }
  }, [tenants, filterClube]);

  useEffect(() => {
    if (!filterAtleta) {
      setPsychList([]);
      return;
    }
    setPsychLoading(true);
    api
      .get<{ psychologicalAssessment?: unknown[] | null }>(`/players/${filterAtleta}`)
      .then(({ data }) => {
        const raw = data?.psychologicalAssessment;
        setPsychList(Array.isArray(raw) ? (raw as PsychologicalAssessmentEntry[]) : []);
      })
      .catch(() => setPsychList([]))
      .finally(() => setPsychLoading(false));
  }, [filterAtleta]);

  const playersByClube = filterClube
    ? players.filter((p) => p.tenantId === filterClube)
    : players;
  /** Só clubes no dropdown (kind name clube, futebol, club) */
  const clubesOnly = tenants.filter((t) => {
    const k = (t.kind?.name ?? "").toLowerCase();
    return k.includes("clube") || k.includes("club") || k === "futebol";
  });
  const tenantsForClubeDropdown = clubesOnly.length > 0 ? clubesOnly : tenants;
  const categoriesInUse = Array.from(
    new Set(playersByClube.map((p) => p.category).filter(Boolean)),
  ) as string[];
  const { categories: allFixtureCategories } = useFixtureCategories();
  const selectedTenantForFilter = tenants.find((t) => t.id === filterClube);
  const categoriesForFilter = filterClube
    ? filterCategoriesForTenant(allFixtureCategories, selectedTenantForFilter?.categories).filter(
        (c) => categoriesInUse.length === 0 || categoriesInUse.includes(c.value),
      )
    : FIXTURE_CATEGORIES.filter((c) => categoriesInUse.includes(c.value));
  const historicoAtleta = filterAtleta
    ? consultations
        .filter((c) => c.playerId === filterAtleta && c.status !== "completed")
        .sort((a, b) => {
          const da = (a.date ?? "") + (a.time ?? "");
          const db = (b.date ?? "") + (b.time ?? "");
          return db.localeCompare(da);
        })
    : [];
  const selectedPlayerName = filterAtleta
    ? (() => {
        const p = players.find((pl) => pl.id === filterAtleta);
        return p ? getPlayerListDisplayName(p) : "";
      })()
    : "";

  const handleCreateMeet = async (performerName?: string) => {
    if (!filterAtleta?.trim() || !newDate.trim()) {
      showFeedback(
        "Atenção",
        "Selecione um atleta no filtro acima e informe a data.",
        "warning"
      );
      return;
    }
    const player = players.find((p) => p.id === filterAtleta);
    if (!player) return;
    setMeetCreating(true);
    try {
      const { data } = await api.post<{ meetLink: string; createdWithMeet?: boolean }>(
        "/consultations/create-meet",
        {
          summary: `Consulta: ${player.name}`,
          description: newNotes.trim() || undefined,
          startDate: newDate,
          startTime: newTime,
          endTime: undefined,
        }
      );
      if (data?.meetLink) {
        const { data: playerData } = await api.get<{ onlineConsultations?: unknown[] }>(
          `/players/${filterAtleta}`
        );
        const current = (playerData?.onlineConsultations ?? []) as Array<{
          type?: string;
          status?: string;
          date?: string;
          time?: string;
          link?: string;
          notes?: string;
        }>;
        const professionalName = performerName?.trim() || newPsychologist.trim() || undefined;
        const updated = [
          ...current,
          {
            type: "meet",
            status: "scheduled",
            date: newDate,
            time: newTime,
            link: data.meetLink,
            notes: newNotes.trim() || undefined,
            psychologist: professionalName,
          },
        ];
        await api.patch(`/players/${filterAtleta}`, { onlineConsultations: updated });
        setCalendarRefreshTrigger((t) => t + 1);
        const linkToSend = data.meetLink;
        const dateToSend = newDate;
        const timeToSend = newTime;
        const psychologistToSend = professionalName;
        setNewDate("");
        setNewTime("09:00");
        setNewNotes("");
        setNewPsychologist("");
        // Enviar link por e-mail para o atleta (se tiver contactEmail cadastrado e SMTP configurado)
        try {
          const { data: notifyResult } = await api.post<{
            emailSent?: boolean;
            noContact?: boolean;
            emailError?: string;
          }>("/consultations/notify-player", {
            playerId: filterAtleta,
            link: linkToSend,
            date: dateToSend,
            time: timeToSend,
            psychologist: psychologistToSend,
          });
          if (notifyResult?.emailSent) {
            showFeedback(
              "Consulta agendada",
              "Link enviado por e-mail para o atleta.",
              "success"
            );
          } else if (notifyResult?.noContact) {
            showFeedback(
              "Consulta agendada",
              "Para enviar o link ao atleta por e-mail, cadastre o e-mail de contato na ficha do jogador (Dados base → E-mail de contato).",
              "info"
            );
          } else if (notifyResult?.emailError) {
            showFeedback(
              "Consulta agendada",
              `E-mail não enviado: ${notifyResult.emailError}`,
              "warning"
            );
          }
        } catch {
          // Não bloqueia o fluxo; consulta já foi salva
        }
        if (!data.createdWithMeet) {
          showFeedback(
            "Evento criado",
            'Abra o link e clique em "Adicionar videoconferência do Google Meet" no Calendar.',
            "info"
          );
        }
      }
    } catch (e: unknown) {
      showFeedback(
        "Erro",
        e instanceof Error ? e.message : "Erro ao criar evento no Meet.",
        "error"
      );
    } finally {
      setMeetCreating(false);
    }
  };

  const savePsych = useCallback(async () => {
    if (!filterAtleta?.trim()) return;
    setPsychSaving(true);
    try {
      await api.patch(`/players/${filterAtleta}`, { psychologicalAssessment: psychList });
    } catch (e: unknown) {
      showFeedback(
        "Erro",
        e instanceof Error ? e.message : "Erro ao salvar anamnese.",
        "error"
      );
    } finally {
      setPsychSaving(false);
    }
  }, [filterAtleta, psychList]);

  const updatePsychEntry = useCallback(
    (idx: number, field: keyof PsychologicalAssessmentEntry, value: string | undefined) => {
      setPsychList((prev) => {
        const next = [...prev];
        const entry = { ...(next[idx] ?? {}) } as PsychologicalAssessmentEntry;
        (entry as Record<string, unknown>)[field] = value || undefined;
        next[idx] = entry;
        return next;
      });
    },
    []
  );

  const removePsychEntry = useCallback((idx: number) => {
    setPsychList((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  /** Atualiza status e/ou notas de uma consulta (id = playerId-index). Persiste em onlineConsultations. */
  const updateConsultationStatusAndNotes = useCallback(
    async (consultationId: string, payload: { status?: string; notes?: string }) => {
      const match = consultationId.match(/^(.+)-(\d+)$/);
      if (!match) return;
      const [, playerId, indexStr] = match;
      const index = parseInt(indexStr ?? "", 10);
      if (!playerId || isNaN(index) || index < 0) return;
      const { data } = await api.get<{ onlineConsultations?: Array<Record<string, unknown>> }>(
        `/players/${playerId}`
      );
      const list = Array.isArray(data?.onlineConsultations) ? [...data.onlineConsultations] : [];
      if (index >= list.length) return;
      const entry = { ...list[index] };
      if (payload.status !== undefined) entry.status = payload.status;
      if (payload.notes !== undefined) entry.notes = payload.notes;
      list[index] = entry;
      await api.patch(`/players/${playerId}`, { onlineConsultations: list });
      setCalendarRefreshTrigger((t) => t + 1);
      fetchConsultations();
    },
    [fetchConsultations]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!canAccessModule("saude")) {
    router.replace("/403");
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Filtros — largura total */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">Filtros</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
            <div className="min-w-0">
              <label className="mb-1 block text-xs text-muted-foreground">Clube</label>
              <Select
                value={filterClube || "all"}
                onValueChange={(v) => {
                  setFilterClube(v === "all" ? "" : v);
                  setFilterAtleta("");
                  setFilterCategoria("");
                }}
              >
                <SelectTrigger className="w-full text-foreground">
                  <SelectValue placeholder="Todos os clubes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clubes</SelectItem>
                  {tenantsForClubeDropdown.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <label className="mb-1 block text-xs text-muted-foreground">Atleta</label>
              <Select
                value={filterAtleta || "all"}
                onValueChange={(v) => setFilterAtleta(v === "all" ? "" : v)}
              >
                <SelectTrigger className="w-full text-foreground">
                  <SelectValue placeholder="Todos os atletas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os atletas</SelectItem>
                  {playersByClube.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {getPlayerListDisplayName(p)}
                      {p.category ? ` (${FIXTURE_CATEGORIES.find((c) => c.value === p.category)?.labelPT ?? p.category})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <label className="mb-1 block text-xs text-muted-foreground">Categoria</label>
              <Select
                value={filterCategoria || "all"}
                onValueChange={(v) => setFilterCategoria(v === "all" ? "" : v)}
              >
                <SelectTrigger className="w-full text-foreground">
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
            <Button
              variant="outline"
              size="sm"
              className="min-h-[40px] w-full sm:w-auto"
              onClick={() => {
                setFilterClube("");
                setFilterAtleta("");
                setFilterCategoria("");
                setNameFilter("");
              }}
            >
              Limpar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Agenda — largura total */}
      <Card>
        <CardContent className="pt-6">
          <PsychologySchedulingCard
            filterClube={filterClube}
            filterAtleta={filterAtleta}
            filterCategoria={filterCategoria}
            tenants={tenants}
            selectedPlayerName={selectedPlayerName}
            players={players}
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
            onCreateMeet={(performerName) => void handleCreateMeet(performerName)}
            onScheduled={() => setCalendarRefreshTrigger((t) => t + 1)}
            showFeedback={showFeedback}
          />
        </CardContent>
      </Card>

      {/* Calendário — largura total */}
      <Card>
        <CardContent className="pt-6">
          <ConsultasCalendar
            refreshTrigger={calendarRefreshTrigger}
            nameFilter={nameFilter}
            onNameFilterChange={setNameFilter}
            tenantIdFilter={filterClube || undefined}
            playerIdFilter={filterAtleta || undefined}
            categoryFilter={filterCategoria || undefined}
            consultationsProp={consultations}
            onRefreshRequested={() => setCalendarRefreshTrigger((t) => t + 1)}
            onShowHistory={(id, name) => {
              setHistoryPlayerId(id);
              setHistoryPlayerName(name);
            }}
            selectedPlayerName={selectedPlayerName}
          />
        </CardContent>
      </Card>

      {historyPlayerId !== null && (
        <Card>
          <CardContent className="flex flex-col pt-4 pb-4">
            <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Histórico do atleta: {historyPlayerName || "—"}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setHistoryPlayerId(null); setHistoryPlayerName(""); }}
              >
                Fechar
              </Button>
            </div>
            <div className="min-h-[200px] overflow-y-auto rounded border bg-muted/20 p-3">
                  {(() => {
                    const list = consultations
                      .filter((c) => c.playerId === historyPlayerId)
                      .sort((a, b) => {
                        const da = (a.date ?? "") + (a.time ?? "");
                        const db = (b.date ?? "") + (b.time ?? "");
                        return db.localeCompare(da);
                      });
                    if (list.length === 0) {
                      return (
                        <p className="text-sm text-muted-foreground py-6 text-center">
                          Ainda não tem histórico de consultas para este atleta.
                        </p>
                      );
                    }
                    return (
                      <ul className="space-y-3">
                        {list.map((c) => (
                          <li key={c.id} className="text-sm border-b border-border/50 pb-3 last:border-0 last:pb-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-foreground">{formatDate(c.date ?? "", c.time)}</p>
                              <span
                                className={`rounded px-2 py-0.5 text-xs ${
                                  c.status === "completed"
                                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                    : c.status === "cancelled"
                                      ? "bg-destructive/20 text-destructive"
                                      : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                }`}
                              >
                                {c.status === "completed" ? "Realizada" : c.status === "cancelled" ? "Cancelada" : "Agendada"}
                              </span>
                            </div>
                            {c.psychologist && (
                              <p className="text-muted-foreground">Psicólogo: {c.psychologist}</p>
                            )}
                            {c.notes && (
                              <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{c.notes}</p>
                            )}
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </div>
          </CardContent>
        </Card>
      )}

      {/* Registro do atleta */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold flex flex-wrap items-center gap-2 mb-4">
            <User className="h-5 w-5" />
            Registro do atleta
            {filterAtleta && selectedPlayerName ? (
              <span className="font-normal text-muted-foreground">— {selectedPlayerName}</span>
            ) : null}
            {filterAtleta ? (
              <Button variant="outline" size="sm" className="ml-auto min-h-[36px]" asChild>
                <Link href={playerPsychologyProfileHref(filterAtleta, "consultas")}>
                  Ficha psicológica e anamnese
                </Link>
              </Button>
            ) : null}
          </h3>
          {!filterAtleta ? null : (
            <>
              {psychLoading ? (
                <p className="text-muted-foreground py-4 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando registro…
                </p>
              ) : (
                <div className="space-y-8">
                  {/* Consultas */}
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Consultas</h4>
                    {historicoAtleta.length === 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground py-2">Nenhuma consulta cadastrada para este atleta.</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (filterAtleta) {
                              setHistoryPlayerId(filterAtleta);
                              setHistoryPlayerName(selectedPlayerName);
                            }
                          }}
                        >
                          <History className="mr-1 h-4 w-4" />
                          Histórico
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {historicoAtleta.map((c) => (
                          <ConsultationRow
                            key={c.id}
                            item={c}
                            onUpdateStatusAndNotes={updateConsultationStatusAndNotes}
                            statusLabel={STATUS_LABEL}
                            formatDate={formatDate}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Anamnese — modelo Boston City (PDF) */}
                  <div>
                    <h4 className="text-sm font-medium flex items-center gap-2 mb-4">
                      <FileText className="h-4 w-4" />
                      Anamnese e registros psicológicos
                    </h4>
                    <div className="space-y-6">
                      {psychList.map((entry, idx) => {
                        const kind = entry.kind ?? (entry.dadosPessoais ? "anamnese" : "anamnese");
                        if (kind !== "anamnese" && entry.kind) {
                          return (
                            <div key={idx} className="rounded-lg border border-border/80 bg-muted/20 p-4 text-sm space-y-2">
                              <div className="flex flex-wrap justify-between gap-2">
                                <p className="font-semibold text-foreground">{psychEntryLabel(entry.kind)}</p>
                                <Button type="button" variant="ghost" size="icon" onClick={() => removePsychEntry(idx)} aria-label="Remover">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                              <p className="text-muted-foreground">
                                {entry.date}
                                {entry.time ? ` · ${entry.time}` : ""}
                                {entry.category ? ` · ${entry.category}` : ""}
                              </p>
                              {entry.present !== undefined && (
                                <p>Presença: {entry.present ? "Presente" : "Ausente"}</p>
                              )}
                              {entry.groupSummary && <p className="whitespace-pre-wrap">{entry.groupSummary}</p>}
                              {entry.individualNotes && (
                                <p className="whitespace-pre-wrap text-foreground">{entry.individualNotes}</p>
                              )}
                              {entry.observacaoGeral && (
                                <p className="whitespace-pre-wrap">{entry.observacaoGeral}</p>
                              )}
                            </div>
                          );
                        }
                        return (
                          <div key={idx} className="rounded-lg border p-4 space-y-4 bg-muted/20">
                            <div className="flex flex-wrap justify-between items-center gap-2">
                              <div className="flex flex-wrap gap-2">
                                <Input
                                  type="date"
                                  className="w-[165px] text-foreground"
                                  value={entry.date ?? ""}
                                  onChange={(e) => updatePsychEntry(idx, "date", e.target.value || undefined)}
                                />
                                <Input
                                  className="w-[180px] text-foreground"
                                  placeholder="Avaliador"
                                  value={entry.evaluator ?? ""}
                                  onChange={(e) => updatePsychEntry(idx, "evaluator", e.target.value || undefined)}
                                />
                              </div>
                              <Button type="button" variant="ghost" size="icon" onClick={() => removePsychEntry(idx)} aria-label="Remover anamnese">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                            <PsychAnamnesisForm
                              value={{ ...emptyPsychAnamnesis(), ...entry }}
                              onChange={(data) => {
                                setPsychList((prev) => {
                                  const next = [...prev];
                                  next[idx] = { ...next[idx], ...data, kind: "anamnese" };
                                  return next;
                                });
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setPsychList((prev) => [
                            ...prev,
                            { kind: "anamnese", date: new Date().toISOString().slice(0, 10), ...emptyPsychAnamnesis() },
                          ])
                        }
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Nova anamnese
                      </Button>
                      <Button type="button" onClick={() => void savePsych()} disabled={psychSaving}>
                        {psychSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Salvar ficha psicológica
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.variant}
      />
    </div>
  );
}

