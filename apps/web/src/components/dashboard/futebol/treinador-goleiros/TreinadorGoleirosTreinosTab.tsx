"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Loader2, Mail, Plus, Printer, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelectField } from "@/components/ui/native-select";
import { FeedbackModal } from "@/components/ui/feedback-modal";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import { getPlayerListDisplayName } from "@/lib/player-display-name";
import {
  printTrainingPeriodReport,
  printTrainingSessionReport,
} from "@/lib/treinadores-treinos-print";
import type {
  CoachAgendaTreinoOption,
  CoachTrainingActivity,
  CoachTrainingPeriodReport,
  CoachTrainingSessionReport,
} from "@/lib/treinadores-types";
import { COACH_ACTIVITY_KINDS, COACH_TRAINING_ATTACHMENT_KINDS } from "@/lib/treinadores-types";
import type { GkContextResponse, GkTrainingSession } from "@/lib/treinador-goleiros-types";
import { GK_ATTACHMENT_KINDS } from "@/lib/treinador-goleiros-types";
import { distributeGkReport } from "@/lib/treinador-goleiros-distribute";
import { TreinadoresMediaPicker } from "@/components/dashboard/futebol/treinadores/TreinadoresMediaPicker";

type AttachmentDraft = { label: string; fileUrl: string; kind: string };

type PlayerEntryDraft = {
  playerId: string;
  name: string;
  homeCategory: string | null;
  crossCategory: boolean;
  available: boolean;
  unavailableReason: string;
  rating: string;
  notes: string;
  inTreatment: boolean;
};

type GkSearchHit = { id: string; name: string; category: string | null; jerseyNumber?: number | null };

interface Props {
  tenantId: string;
  category?: string;
  context: GkContextResponse | null;
}

function emptyAttachments(): AttachmentDraft[] {
  return [{ label: "Keeper Scout", fileUrl: "", kind: "keeper_scout" }];
}

function emptyActivities(): CoachTrainingActivity[] {
  return [{ kind: "aquecimento", title: "", description: "", durationMinutes: null, mediaUrl: "" }];
}

function defaultPlayerEntries(players: GkContextResponse["players"]): PlayerEntryDraft[] {
  return players.map((p) => ({
    playerId: p.id,
    name: getPlayerListDisplayName(p),
    homeCategory: p.category ?? null,
    crossCategory: false,
    available: !p.inTreatment,
    unavailableReason: p.inTreatment ? "Indisponível" : "",
    rating: "",
    notes: "",
    inTreatment: p.inTreatment,
  }));
}

function defaultPeriodRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

export function TreinadorGoleirosTreinosTab({ tenantId, category, context }: Props) {
  const [sessions, setSessions] = useState<GkTrainingSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [evalSaving, setEvalSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [distributing, setDistributing] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [characteristics, setCharacteristics] = useState("");
  const [objectives, setObjectives] = useState("");
  const [physicalQualities, setPhysicalQualities] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("rascunho");
  const [staffId, setStaffId] = useState("");
  const [agendaEntryId, setAgendaEntryId] = useState("");
  const [agendaOptions, setAgendaOptions] = useState<CoachAgendaTreinoOption[]>([]);
  const [attachments, setAttachments] = useState<AttachmentDraft[]>(emptyAttachments());
  const [activities, setActivities] = useState<CoachTrainingActivity[]>(emptyActivities());
  const [showActivities, setShowActivities] = useState(false);
  const [playerEntries, setPlayerEntries] = useState<PlayerEntryDraft[]>([]);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [periodFrom, setPeriodFrom] = useState(() => defaultPeriodRange().from);
  const [periodTo, setPeriodTo] = useState(() => defaultPeriodRange().to);
  const [crossOpen, setCrossOpen] = useState(false);
  const [crossQuery, setCrossQuery] = useState("");
  const [crossHits, setCrossHits] = useState<GkSearchHit[]>([]);
  const [crossLoading, setCrossLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const attachmentKindOptions = [
    ...GK_ATTACHMENT_KINDS.map((k) => ({ value: k.value, label: k.label })),
    ...COACH_TRAINING_ATTACHMENT_KINDS.filter((k) => k.value !== "keeper_scout"),
  ];

  const loadSessions = () => {
    if (!tenantId) return;
    setLoading(true);
    const params = new URLSearchParams({ tenantId });
    if (category) params.set("category", category);
    api
      .get<GkTrainingSession[]>(`/treinador-goleiros/training-sessions?${params}`)
      .then(({ data }) => setSessions(Array.isArray(data) ? data : []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSessions();
  }, [tenantId, category]);

  useEffect(() => {
    if (!tenantId || !sessionDate) {
      setAgendaOptions([]);
      return;
    }
    const params = new URLSearchParams({ tenantId, sessionDate });
    if (category) params.set("category", category);
    api
      .get<CoachAgendaTreinoOption[]>(`/treinador-goleiros/agenda-treinos?${params}`)
      .then(({ data }) => setAgendaOptions(Array.isArray(data) ? data : []))
      .catch(() => setAgendaOptions([]));
  }, [tenantId, category, sessionDate]);

  const resetForm = () => {
    setSelectedId("");
    setSessionDate("");
    setStartTime("");
    setEndTime("");
    setCharacteristics("");
    setObjectives("");
    setPhysicalQualities("");
    setNotes("");
    setStatus("rascunho");
    setStaffId("");
    setAgendaEntryId("");
    setAttachments(emptyAttachments());
    setActivities(emptyActivities());
    setShowActivities(false);
    setPlayerEntries(defaultPlayerEntries(context?.players ?? []));
  };

  useEffect(() => {
    if (!selectedId) {
      setPlayerEntries(defaultPlayerEntries(context?.players ?? []));
      return;
    }
    api.get<GkTrainingSession>(`/treinador-goleiros/training-sessions/${selectedId}?tenantId=${tenantId}`).then(({ data }) => {
      if (!data) return;
      setSessionDate(data.sessionDate);
      setStartTime(data.startTime ?? "");
      setEndTime(data.endTime ?? "");
      setCharacteristics(data.characteristics ?? "");
      setObjectives(data.objectives ?? "");
      setPhysicalQualities(data.physicalQualities ?? "");
      setNotes(data.notes ?? "");
      setStatus(data.status ?? "rascunho");
      setStaffId(data.staffId ?? data.staff?.id ?? "");
      setAgendaEntryId(data.agendaEntryId ?? data.agendaEntry?.id ?? "");
      setAttachments(
        (data.attachments ?? []).length > 0
          ? data.attachments.map((a) => ({
              label: a.label ?? "",
              fileUrl: a.fileUrl,
              kind: a.kind ?? "keeper_scout",
            }))
          : emptyAttachments(),
      );
      setShowActivities((data.activities ?? []).some((a) => a.title?.trim()));
      setActivities(
        data.activities.length > 0
          ? data.activities.map((a) => ({
              kind: a.kind,
              title: a.title,
              description: a.description ?? "",
              durationMinutes: a.durationMinutes,
              mediaUrl: a.mediaUrl ?? "",
            }))
          : emptyActivities(),
      );
      const base = defaultPlayerEntries(context?.players ?? []);
      const byId = new Map(data.playerEntries.map((e) => [e.playerId, e]));
      const merged: PlayerEntryDraft[] = [...base];
      for (const row of data.playerEntries) {
        if (merged.some((m) => m.playerId === row.playerId)) continue;
        merged.push({
          playerId: row.playerId,
          name: row.player?.name ?? row.playerId,
          homeCategory: row.playerCategoryAtEntry ?? row.player?.category ?? null,
          crossCategory: !!row.crossCategory,
          available: row.available,
          unavailableReason: row.unavailableReason ?? "",
          rating: row.rating != null ? String(row.rating) : "",
          notes: row.notes ?? "",
          inTreatment: false,
        });
      }
      setPlayerEntries(
        merged.map((p) => {
          const row = byId.get(p.playerId);
          if (!row) return p;
          return {
            ...p,
            homeCategory: row.playerCategoryAtEntry ?? p.homeCategory,
            crossCategory: !!row.crossCategory,
            available: row.available,
            unavailableReason: row.unavailableReason ?? p.unavailableReason,
            rating: row.rating != null ? String(row.rating) : "",
            notes: row.notes ?? "",
          };
        }),
      );
    });
  }, [selectedId, context?.players, tenantId]);

  const searchCrossGoalkeepers = () => {
    if (!tenantId) return;
    setCrossLoading(true);
    const params = new URLSearchParams({ tenantId });
    if (crossQuery.trim()) params.set("q", crossQuery.trim());
    api
      .get<GkSearchHit[]>(`/treinador-goleiros/goalkeepers/search?${params}`)
      .then(({ data }) => setCrossHits(Array.isArray(data) ? data : []))
      .catch(() => setCrossHits([]))
      .finally(() => setCrossLoading(false));
  };

  useEffect(() => {
    if (!crossOpen) return;
    searchCrossGoalkeepers();
  }, [crossOpen, tenantId]);

  const addCrossGoalkeeper = (hit: GkSearchHit) => {
    if (playerEntries.some((p) => p.playerId === hit.id)) {
      setFeedback({ open: true, title: "Atenção", message: "Goleiro já está na lista." });
      return;
    }
    const inCtx = context?.players.find((p) => p.id === hit.id);
    const cross = !!(category && hit.category && hit.category !== category);
    setPlayerEntries((prev) => [
      ...prev,
      {
        playerId: hit.id,
        name: hit.name,
        homeCategory: hit.category,
        crossCategory: cross,
        available: inCtx ? !inCtx.inTreatment : true,
        unavailableReason: inCtx?.inTreatment ? "Indisponível" : "",
        rating: "",
        notes: "",
        inTreatment: inCtx?.inTreatment ?? false,
      },
    ]);
    setCrossOpen(false);
    setCrossQuery("");
  };

  const buildPlayerPayload = () =>
    playerEntries.map((p) => ({
      playerId: p.playerId,
      available: p.available,
      unavailableReason: p.available ? null : p.unavailableReason || "Indisponível",
      rating: p.rating === "" ? null : Number(p.rating),
      notes: p.notes || null,
    }));

  const handleSave = async () => {
    if (!tenantId || !sessionDate) {
      setFeedback({ open: true, title: "Atenção", message: "Informe a data do treino." });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        id: selectedId || undefined,
        tenantId,
        category: category || null,
        staffId: staffId || null,
        sessionDate,
        startTime: startTime || null,
        endTime: endTime || null,
        characteristics,
        objectives,
        physicalQualities,
        notes,
        status,
        agendaEntryId: agendaEntryId || null,
        attachments: attachments.filter((a) => a.fileUrl.trim()),
        activities: showActivities
          ? activities
              .filter((a) => a.title.trim())
              .map((a, i) => ({
                kind: a.kind,
                title: a.title.trim(),
                description: a.description || null,
                durationMinutes: a.durationMinutes ?? null,
                sortOrder: i,
                mediaUrl: a.mediaUrl || null,
              }))
          : [],
        playerEntries: buildPlayerPayload(),
      };
      const { data } = await api.post<GkTrainingSession>("/treinador-goleiros/training-sessions", payload);
      if (data?.id) setSelectedId(data.id);
      loadSessions();
      setFeedback({ open: true, title: "Salvo", message: "Treino de goleiros salvo." });
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível salvar.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEvaluationOnly = async () => {
    if (!selectedId || !tenantId) {
      setFeedback({ open: true, title: "Atenção", message: "Salve o treino antes de avaliar." });
      return;
    }
    setEvalSaving(true);
    try {
      await api.patch(`/treinador-goleiros/training-sessions/${selectedId}/player-entries`, {
        tenantId,
        notes,
        playerEntries: buildPlayerPayload(),
      });
      loadSessions();
      setFeedback({ open: true, title: "Salvo", message: "Avaliações atualizadas." });
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível salvar avaliações.",
      });
    } finally {
      setEvalSaving(false);
    }
  };

  const handlePrintSession = async () => {
    if (!selectedId) return;
    setPrinting(true);
    try {
      const { data } = await api.get<CoachTrainingSessionReport>(
        `/treinador-goleiros/training-sessions/${selectedId}/report?tenantId=${tenantId}`,
      );
      printTrainingSessionReport(data);
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível gerar o relatório.",
      });
    } finally {
      setPrinting(false);
    }
  };

  const handlePrintPeriod = async () => {
    if (!tenantId || !periodFrom || !periodTo) return;
    setPrinting(true);
    try {
      const params = new URLSearchParams({ tenantId, from: periodFrom, to: periodTo });
      if (category) params.set("category", category);
      const { data } = await api.get<CoachTrainingPeriodReport>(`/treinador-goleiros/reports/period?${params}`);
      printTrainingPeriodReport(data);
      setPeriodOpen(false);
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível gerar o relatório.",
      });
    } finally {
      setPrinting(false);
    }
  };

  const handleDistribute = async () => {
    if (!selectedId || !tenantId) return;
    setDistributing(true);
    try {
      const { data: report } = await api.get<CoachTrainingSessionReport>(
        `/treinador-goleiros/training-sessions/${selectedId}/report?tenantId=${tenantId}`,
      );
      const summary = `Treino de goleiros — ${report.session.sessionDate} — ${report.session.category ?? ""}`.trim();
      const res = await distributeGkReport({
        tenantId,
        kind: "training_session",
        referenceId: selectedId,
        summary,
      });
      setFeedback({
        open: true,
        title: "Enviado",
        message: `Relatório enviado para ${res?.recipientCount ?? "destinatários autorizados"}.`,
      });
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível enviar.",
      });
    } finally {
      setDistributing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/treinador-goleiros/training-sessions/${deleteId}?tenantId=${tenantId}`);
      if (selectedId === deleteId) resetForm();
      loadSessions();
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível excluir.",
      });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base">Treinos</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={resetForm}>
              <Plus className="mr-1 h-4 w-4" />
              Novo
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
            ) : sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum treino cadastrado.</p>
            ) : (
              sessions.map((s) => (
                <div
                  key={s.id}
                  className={`rounded-lg border p-3 text-sm ${selectedId === s.id ? "border-primary bg-primary/5" : "border-border/60"}`}
                >
                  <button type="button" className="w-full text-left" onClick={() => setSelectedId(s.id)}>
                    <div className="font-medium">
                      {formatDateDayMonYear(new Date(`${s.sessionDate}T12:00:00`))}
                    </div>
                    <div className="text-muted-foreground">
                      {s.startTime && s.endTime ? `${s.startTime} – ${s.endTime}` : s.status}
                    </div>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-8 text-destructive"
                    onClick={() => setDeleteId(s.id)}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Excluir
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Treino específico de goleiros</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setPeriodOpen(true)}>
              <Printer className="mr-1 h-4 w-4" />
              Relatório do período
            </Button>
            {selectedId ? (
              <>
                <Button type="button" size="sm" variant="outline" onClick={handlePrintSession} disabled={printing}>
                  {printing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Printer className="mr-1 h-4 w-4" />}
                  Imprimir
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={handleDistribute} disabled={distributing}>
                  {distributing ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="mr-1 h-4 w-4" />
                  )}
                  Enviar p/ Direção e Comissão
                </Button>
              </>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Início</Label>
              <Input
                type="time"
                className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Fim</Label>
              <Input
                type="time"
                className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Responsável</Label>
              <NativeSelectField
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                placeholder="Selecione…"
                options={(context?.staff ?? []).map((s) => ({ value: s.id, label: s.name }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <NativeSelectField
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { value: "rascunho", label: "Rascunho" },
                  { value: "finalizado", label: "Finalizado" },
                ]}
              />
            </div>
          </div>

          {sessionDate ? (
            <div className="space-y-2">
              <Label>Vínculo com agenda</Label>
              <NativeSelectField
                value={agendaEntryId}
                onChange={(e) => setAgendaEntryId(e.target.value)}
                placeholder="Sem vínculo"
                options={agendaOptions.map((a) => ({ value: a.id, label: a.title }))}
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Características</Label>
            <Textarea rows={2} value={characteristics} onChange={(e) => setCharacteristics(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Objetivos</Label>
            <Textarea rows={2} value={objectives} onChange={(e) => setObjectives(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Valências físicas</Label>
            <Textarea rows={2} value={physicalQualities} onChange={(e) => setPhysicalQualities(e.target.value)} />
          </div>

          <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center justify-between gap-2">
              <Label>Keeper Scout / anexos (PDF)</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setAttachments((prev) => [...prev, { label: "", fileUrl: "", kind: "keeper_scout" }])
                }
              >
                <Plus className="mr-1 h-4 w-4" />
                PDF
              </Button>
            </div>
            {attachments.map((a, idx) => (
              <div key={idx} className="rounded-lg border border-border/60 bg-card/40 p-3 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <NativeSelectField
                    value={a.kind}
                    onChange={(e) => {
                      const next = [...attachments];
                      next[idx] = { ...a, kind: e.target.value };
                      setAttachments(next);
                    }}
                    options={attachmentKindOptions.map((k) => ({ value: k.value, label: k.label }))}
                  />
                  <Input
                    value={a.label}
                    onChange={(e) => {
                      const next = [...attachments];
                      next[idx] = { ...a, label: e.target.value };
                      setAttachments(next);
                    }}
                    placeholder="Ex.: Keeper Scout — Campo"
                  />
                </div>
                <TreinadoresMediaPicker
                  label="Arquivo PDF"
                  value={a.fileUrl}
                  onChange={(url) => {
                    const next = [...attachments];
                    next[idx] = { ...a, fileUrl: url };
                    setAttachments(next);
                  }}
                />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>Goleiros participantes</Label>
            <Button type="button" size="sm" variant="outline" onClick={() => setCrossOpen(true)}>
              Adicionar goleiro de outra categoria
            </Button>
          </div>

          <div className="space-y-3">
            {playerEntries.map((p, idx) => (
              <div key={p.playerId} className="rounded-lg border border-border/60 p-3 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="font-medium text-sm">
                    {p.name}
                    {p.homeCategory ? (
                      <span className="ml-2 text-xs text-muted-foreground">{p.homeCategory}</span>
                    ) : null}
                    {p.crossCategory && category ? (
                      <span className="ml-2 text-xs text-violet-400">
                        {p.homeCategory} · treinou com {category}
                      </span>
                    ) : null}
                    {p.inTreatment ? (
                      <span className="ml-2 text-xs text-amber-400">Indisponível (operacional)</span>
                    ) : null}
                  </div>
                  <label className="flex items-center gap-2 text-xs">
                    Disponível
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border border-input"
                      checked={p.available}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const next = [...playerEntries];
                        next[idx] = {
                          ...p,
                          available: checked,
                          unavailableReason: checked ? "" : p.unavailableReason || "Indisponível",
                        };
                        setPlayerEntries(next);
                      }}
                    />
                  </label>
                </div>
                {!p.available ? (
                  <Input
                    placeholder="Motivo (sem detalhes clínicos)"
                    value={p.unavailableReason}
                    onChange={(e) => {
                      const next = [...playerEntries];
                      next[idx] = { ...p, unavailableReason: e.target.value };
                      setPlayerEntries(next);
                    }}
                  />
                ) : null}
                <div className="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)]">
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    step={0.5}
                    placeholder="Nota 0–5"
                    value={p.rating}
                    disabled={!p.available}
                    onChange={(e) => {
                      const next = [...playerEntries];
                      next[idx] = { ...p, rating: e.target.value };
                      setPlayerEntries(next);
                    }}
                  />
                  <Textarea
                    rows={2}
                    placeholder="Observação"
                    value={p.notes}
                    disabled={!p.available}
                    onChange={(e) => {
                      const next = [...playerEntries];
                      next[idx] = { ...p, notes: e.target.value };
                      setPlayerEntries(next);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Observações gerais</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="rounded-xl border border-border/60">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
              onClick={() => setShowActivities((v) => !v)}
            >
              <span className="text-sm font-medium">Atividades no CUP360 (opcional)</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showActivities ? "rotate-180" : ""}`} />
            </button>
            {showActivities ? (
              <div className="space-y-3 border-t border-border/60 p-4">
                {activities.map((a, idx) => (
                  <div key={idx} className="rounded-lg border border-border/60 p-3 space-y-2">
                    <NativeSelectField
                      value={a.kind}
                      onChange={(e) => {
                        const next = [...activities];
                        next[idx] = { ...a, kind: e.target.value };
                        setActivities(next);
                      }}
                      options={COACH_ACTIVITY_KINDS.map((k) => ({ value: k.value, label: k.label }))}
                    />
                    <Input
                      placeholder="Título"
                      value={a.title}
                      onChange={(e) => {
                        const next = [...activities];
                        next[idx] = { ...a, title: e.target.value };
                        setActivities(next);
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
              Salvar treino
            </Button>
            {selectedId ? (
              <Button type="button" variant="secondary" onClick={handleSaveEvaluationOnly} disabled={evalSaving}>
                {evalSaving ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1 h-4 w-4" />
                )}
                Salvar só avaliações
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Dialog open={crossOpen} onOpenChange={setCrossOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar goleiro de outra categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Buscar por nome ou categoria…"
              value={crossQuery}
              onChange={(e) => setCrossQuery(e.target.value)}
            />
            <Button type="button" size="sm" variant="outline" onClick={searchCrossGoalkeepers}>
              Buscar
            </Button>
            {crossLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
                {crossHits.map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      className="w-full rounded-md px-2 py-2 text-left hover:bg-muted/60"
                      onClick={() => addCrossGoalkeeper(h)}
                    >
                      {h.name}
                      {h.category ? <span className="text-muted-foreground"> · {h.category}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCrossOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={periodOpen} onOpenChange={setPeriodOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Relatório do período</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>De</Label>
              <Input
                type="date"
                className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                value={periodFrom}
                onChange={(e) => setPeriodFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Até</Label>
              <Input
                type="date"
                className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                value={periodTo}
                onChange={(e) => setPeriodTo(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPeriodOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handlePrintPeriod} disabled={printing}>
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir treino?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
      />
    </div>
  );
}
