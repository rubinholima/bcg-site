"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  PSYCH_FIELDS,
} from "@/components/dashboard/player-module-types";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import type { Psychologist } from "@/types/psychologist";
import { FIXTURE_CATEGORIES } from "@/lib/fixture-categories";

interface PlayerOption {
  id: string;
  name: string;
  tenantId?: string;
  category?: string | null;
}

interface TenantOption {
  id: string;
  name: string;
  kind?: { id: string; name: string };
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
          <Button variant="default" size="sm" onClick={handleIniciarSessao} className="gap-1">
            <Video className="h-3.5 w-3.5" />
            Iniciar sessão
          </Button>
        )}
      </div>
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

  const leftColRef = useRef<HTMLDivElement>(null);
  const [leftColHeight, setLeftColHeight] = useState<number | null>(null);

  useEffect(() => {
    const el = leftColRef.current;
    if (!el) return;
    const sync = () => setLeftColHeight(el.offsetHeight);
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    sync();
    return () => ro.disconnect();
  }, [filterAtleta, filterClube, filterCategoria]);

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
    new Set(playersByClube.map((p) => p.category).filter(Boolean))
  ) as string[];
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
    ? players.find((p) => p.id === filterAtleta)?.name ?? ""
    : "";

  const handleCreateMeet = async () => {
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
        const updated = [
          ...current,
          {
            type: "meet",
            status: "scheduled",
            date: newDate,
            time: newTime,
            link: data.meetLink,
            notes: newNotes.trim() || undefined,
            psychologist: newPsychologist.trim() || undefined,
          },
        ];
        await api.patch(`/players/${filterAtleta}`, { onlineConsultations: updated });
        setCalendarRefreshTrigger((t) => t + 1);
        const linkToSend = data.meetLink;
        const dateToSend = newDate;
        const timeToSend = newTime;
        const psychologistToSend = newPsychologist.trim() || undefined;
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
      {/* Layout: coluna esquerda = Filtros + Agendar Meet (como nas fotos); coluna direita = Calendário */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna esquerda: Filtros + Agendar consulta no Meet */}
        <div ref={leftColRef} className="space-y-6">
          {/* Filtros: Clube (só clubes), Atleta, Categoria — no lugar do atleta como nas fotos */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Filtros</h3>
              <div className="flex flex-col gap-3">
                <div className="min-w-0">
                  <label className="text-xs text-muted-foreground mb-1 block">Clube</label>
                  <Select
                    value={filterClube || "all"}
                    onValueChange={(v) => {
                      setFilterClube(v === "all" ? "" : v);
                      setFilterAtleta("");
                    }}
                  >
                    <SelectTrigger className="w-full">
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
                  <label className="text-xs text-muted-foreground mb-1 block">Atleta</label>
                  <Select
                    value={filterAtleta || "all"}
                    onValueChange={(v) => setFilterAtleta(v === "all" ? "" : v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Todos os atletas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os atletas</SelectItem>
                      {playersByClube.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                          {p.category ? ` (${FIXTURE_CATEGORIES.find((c) => c.value === p.category)?.labelPT ?? p.category})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0">
                  <label className="text-xs text-muted-foreground mb-1 block">Categoria</label>
                  <Select
                    value={filterCategoria || "all"}
                    onValueChange={(v) => setFilterCategoria(v === "all" ? "" : v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {FIXTURE_CATEGORIES.filter((c) => categoriesInUse.includes(c.value)).map((c) => (
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

          {/* Agendar consulta no Meet — usa o atleta do filtro acima */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
                <Video className="h-5 w-5" />
                Agendar consulta no Meet
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Selecione um atleta no filtro <strong>Atleta</strong> acima. Depois escolha data e horário e crie o link da reunião no Google Meet.
              </p>
              <div className="space-y-3">
                {!filterAtleta ? (
                  <p className="text-sm text-amber-600 dark:text-amber-400 py-2">
                    Selecione um atleta no filtro &quot;Atleta&quot; acima para agendar uma consulta.
                  </p>
                ) : (
                  <>
                    <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                      Atleta: <strong>{selectedPlayerName}</strong>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Psicólogo que fará a consulta</label>
                      <select
                        className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                        value={
                          psychologists.some((p) => p.name === newPsychologist)
                            ? newPsychologist
                            : newPsychologist.trim()
                              ? "__outro__"
                              : ""
                        }
                        onChange={(e) => {
                          const v = e.target.value;
                          setNewPsychologist(v === "__outro__" ? newPsychologist : v);
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
                        <option value="__outro__">Outro…</option>
                      </select>
                      {!psychologists.some((p) => p.name === newPsychologist) && (
                        <Input
                          className="mt-2 w-full max-w-xs text-foreground"
                          placeholder="Nome do psicólogo (quando não está na lista)"
                          value={newPsychologist}
                          onChange={(e) => setNewPsychologist(e.target.value)}
                        />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Data</label>
                        <Input
                          type="date"
                          className="w-[10rem] text-foreground"
                          value={newDate}
                          onChange={(e) => setNewDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Horário</label>
                        <Input
                          type="time"
                          className="w-[8rem] text-foreground"
                          value={newTime}
                          onChange={(e) => setNewTime(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Anotações (opcional)</label>
                      <textarea
                        className="w-full min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground resize-y"
                        placeholder="Notas da sessão..."
                        value={newNotes}
                        onChange={(e) => setNewNotes(e.target.value)}
                      />
                    </div>
                    {meetAvailable && (
                      <Button
                        type="button"
                        onClick={handleCreateMeet}
                        disabled={meetCreating || !newDate}
                      >
                        {meetCreating ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Video className="h-4 w-4 mr-2" />
                        )}
                        Criar no Meet
                      </Button>
                    )}
                    {meetAvailable === false && (
                      <p className="text-sm text-muted-foreground">
                        Google Calendar/Meet não configurado. Configure as variáveis GOOGLE_CALENDAR_* no .env da API.
                      </p>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna direita: alinhada ao Meet só quando o Histórico está fechado; ao abrir Histórico, a caixa pode expandir */}
        <div
          className="space-y-4 flex flex-col min-h-0 overflow-y-auto"
          style={leftColHeight != null && historyPlayerId === null ? { maxHeight: leftColHeight } : undefined}
        >
          <Card className="shrink-0 flex flex-col min-h-0 flex-1 overflow-hidden">
            <CardContent className="pt-6 flex-1 flex flex-col min-h-0 overflow-hidden">
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
            <Card className="flex-1 min-h-0 flex flex-col">
              <CardContent className="pt-4 pb-4 flex flex-col min-h-0">
                <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
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
                <div className="overflow-y-auto flex-1 min-h-[200px] rounded border bg-muted/20 p-3">
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
        </div>
      </div>

      {/* Registro do atleta: consultas + anamnese — tudo aqui, sem ir à ficha */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
            <User className="h-5 w-5" />
            Registro do atleta
          </h3>
          {!filterAtleta ? (
            <p className="text-muted-foreground">
              Selecione um atleta no filtro <strong>Atleta</strong> acima para ver e editar aqui o registro completo: consultas e anamnese. Tudo fica nesta página, sem precisar ir à ficha do jogador.
            </p>
          ) : (
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
                    <p className="text-sm text-muted-foreground mb-3">
                      Histórico de <strong>{selectedPlayerName}</strong>. Agende novas consultas no card &quot;Agendar consulta no Meet&quot; acima.
                    </p>
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

                  {/* Anamnese / Avaliação psicológica */}
                  <div>
                    <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4" />
                      Anamnese / Avaliação psicológica
                    </h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Dados pessoais, histórico esportivo, motivação, ansiedade, concentração, autoconfiança, coping, relações e vida fora do esporte. Edite aqui e clique em Salvar.
                    </p>
                    {psychList.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2 mb-3">Nenhuma avaliação cadastrada. Adicione abaixo.</p>
                    ) : null}
                    <div className="space-y-6">
                      {psychList.map((entry, idx) => (
                        <div key={idx} className="rounded-lg border p-4 space-y-4 bg-muted/20">
                          <div className="flex flex-wrap justify-between items-center gap-2">
                            <div className="flex flex-wrap gap-2">
                              <Input
                                type="date"
                                className="w-[165px] min-w-[165px] text-foreground"
                                placeholder="Data"
                                value={entry.date ?? ""}
                                onChange={(e) => updatePsychEntry(idx, "date", e.target.value || undefined)}
                              />
                              <Input
                                className="w-[180px] text-foreground"
                                placeholder="Avaliador/Psicólogo"
                                value={entry.evaluator ?? ""}
                                onChange={(e) => updatePsychEntry(idx, "evaluator", e.target.value || undefined)}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removePsychEntry(idx)}
                              aria-label="Remover avaliação"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          {PSYCH_FIELDS.map(({ key, label, placeholder }) => (
                            <div key={key} className="space-y-1">
                              <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
                              <textarea
                                className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground resize-y"
                                placeholder={placeholder}
                                value={(entry as Record<string, string>)[key] ?? ""}
                                onChange={(e) => updatePsychEntry(idx, key as keyof PsychologicalAssessmentEntry, e.target.value || undefined)}
                              />
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setPsychList((prev) => [...prev, {}])}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar avaliação psicológica
                      </Button>
                      <Button
                        type="button"
                        onClick={savePsych}
                        disabled={psychSaving}
                      >
                        {psychSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Salvar alterações da anamnese
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

