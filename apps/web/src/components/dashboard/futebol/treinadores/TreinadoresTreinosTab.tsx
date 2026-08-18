"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Loader2, Plus, Printer, Save, Trash2 } from "lucide-react";
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
  CoachContextResponse,
  CoachTrainingActivity,
  CoachTrainingPeriodReport,
  CoachTrainingPlanTemplate,
  CoachTrainingSession,
  CoachTrainingSessionReport,
} from "@/lib/treinadores-types";
import { COACH_ACTIVITY_KINDS, COACH_TRAINING_ATTACHMENT_KINDS } from "@/lib/treinadores-types";
import { CoachTrainingPlanLibrary } from "./CoachTrainingPlanLibrary";
import { TreinadoresMediaPicker } from "./TreinadoresMediaPicker";

type AttachmentDraft = {
  label: string;
  fileUrl: string;
  kind: string;
};

type PlayerEntryDraft = {
  playerId: string;
  name: string;
  available: boolean;
  unavailableReason: string;
  rating: string;
  notes: string;
  inTreatment: boolean;
};

interface Props {
  tenantId: string;
  category?: string;
  context: CoachContextResponse | null;
}

function emptyActivities(): CoachTrainingActivity[] {
  return [{ kind: "aquecimento", title: "", description: "", durationMinutes: null, mediaUrl: "" }];
}

function emptyAttachments(): AttachmentDraft[] {
  return [{ label: "", fileUrl: "", kind: "plano_treino" }];
}

function emptyPlayerEntries(players: CoachContextResponse["players"]): PlayerEntryDraft[] {
  return players.map((p) => ({
    playerId: p.id,
    name: getPlayerListDisplayName(p),
    available: !p.inTreatment,
    unavailableReason: p.inTreatment ? "Em tratamento" : "",
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

export function TreinadoresTreinosTab({ tenantId, category, context }: Props) {
  const [sessions, setSessions] = useState<CoachTrainingSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [objectives, setObjectives] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("rascunho");
  const [agendaEntryId, setAgendaEntryId] = useState("");
  const [planTemplateId, setPlanTemplateId] = useState("");
  const [agendaOptions, setAgendaOptions] = useState<CoachAgendaTreinoOption[]>([]);
  const [attachments, setAttachments] = useState<AttachmentDraft[]>(emptyAttachments());
  const [activities, setActivities] = useState<CoachTrainingActivity[]>(emptyActivities());
  const [showActivities, setShowActivities] = useState(false);
  const [playerEntries, setPlayerEntries] = useState<PlayerEntryDraft[]>([]);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [periodFrom, setPeriodFrom] = useState(() => defaultPeriodRange().from);
  const [periodTo, setPeriodTo] = useState(() => defaultPeriodRange().to);
  const [feedback, setFeedback] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadSessions = () => {
    if (!tenantId) return;
    setLoading(true);
    const params = new URLSearchParams({ tenantId });
    if (category) params.set("category", category);
    api
      .get<CoachTrainingSession[]>(`/futebol-treinadores/training-sessions?${params}`)
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
      .get<CoachAgendaTreinoOption[]>(`/futebol-treinadores/agenda-treinos?${params}`)
      .then(({ data }) => setAgendaOptions(Array.isArray(data) ? data : []))
      .catch(() => setAgendaOptions([]));
  }, [tenantId, category, sessionDate]);

  const resetForm = () => {
    setSelectedId("");
    setSessionDate("");
    setStartTime("");
    setEndTime("");
    setObjectives("");
    setNotes("");
    setStatus("rascunho");
    setAgendaEntryId("");
    setPlanTemplateId("");
    setAttachments(emptyAttachments());
    setActivities(emptyActivities());
    setShowActivities(false);
    setPlayerEntries(emptyPlayerEntries(context?.players ?? []));
  };

  useEffect(() => {
    if (!selectedId) {
      setPlayerEntries(emptyPlayerEntries(context?.players ?? []));
      return;
    }
    api.get<CoachTrainingSession>(`/futebol-treinadores/training-sessions/${selectedId}`).then(({ data }) => {
      if (!data) return;
      setSessionDate(data.sessionDate);
      setStartTime(data.startTime ?? "");
      setEndTime(data.endTime ?? "");
      setObjectives(data.objectives ?? "");
      setNotes(data.notes ?? "");
      setStatus(data.status ?? "rascunho");
      setAgendaEntryId(data.agendaEntryId ?? data.agendaEntry?.id ?? "");
      setPlanTemplateId(data.planTemplateId ?? data.planTemplate?.id ?? "");
      setAttachments(
        (data.attachments ?? []).length > 0
          ? data.attachments.map((a) => ({
              label: a.label ?? "",
              fileUrl: a.fileUrl,
              kind: a.kind ?? "plano_treino",
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
      const byId = new Map(data.playerEntries.map((e) => [e.playerId, e]));
      setPlayerEntries(
        emptyPlayerEntries(context?.players ?? []).map((p) => {
          const row = byId.get(p.playerId);
          return {
            ...p,
            available: row?.available ?? p.available,
            unavailableReason: row?.unavailableReason ?? p.unavailableReason,
            rating: row?.rating != null ? String(row.rating) : "",
            notes: row?.notes ?? "",
          };
        }),
      );
    });
  }, [selectedId, context?.players]);

  const applyTemplate = (template: CoachTrainingPlanTemplate) => {
    setPlanTemplateId(template.id);
    setAttachments((prev) => {
      const exists = prev.some((a) => a.fileUrl === template.fileUrl);
      if (exists) return prev;
      const filled = prev.filter((a) => a.fileUrl.trim());
      return [
        ...filled,
        {
          label: template.title,
          fileUrl: template.fileUrl,
          kind: "plano_treino",
        },
      ];
    });
  };

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
        sessionDate,
        startTime: startTime || null,
        endTime: endTime || null,
        objectives,
        notes,
        status,
        agendaEntryId: agendaEntryId || null,
        planTemplateId: planTemplateId || null,
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
        playerEntries: playerEntries.map((p) => ({
          playerId: p.playerId,
          available: p.available,
          unavailableReason: p.available ? null : p.unavailableReason || "Indisponível",
          rating: p.rating === "" ? null : Number(p.rating),
          notes: p.notes || null,
        })),
      };
      const { data } = await api.post<CoachTrainingSession>("/futebol-treinadores/training-sessions", payload);
      if (data?.id) setSelectedId(data.id);
      loadSessions();
      setFeedback({ open: true, title: "Salvo", message: "Treino salvo." });
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

  const handlePrintSession = async () => {
    if (!selectedId) return;
    setPrinting(true);
    try {
      const { data } = await api.get<CoachTrainingSessionReport>(
        `/futebol-treinadores/training-sessions/${selectedId}/report`,
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
      const { data } = await api.get<CoachTrainingPeriodReport>(
        `/futebol-treinadores/training-sessions/report/period?${params}`,
      );
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

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/futebol-treinadores/training-sessions/${deleteId}`);
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

        <CoachTrainingPlanLibrary tenantId={tenantId} category={category} onApplyTemplate={applyTemplate} />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Registro do treino</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setPeriodOpen(true)}>
              <Printer className="mr-1 h-4 w-4" />
              Relatório do período
            </Button>
            {selectedId ? (
              <Button type="button" size="sm" variant="outline" onClick={handlePrintSession} disabled={printing}>
                {printing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Printer className="mr-1 h-4 w-4" />}
                Imprimir treino
              </Button>
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

          {sessionDate ? (
            <div className="space-y-2">
              <Label>Vínculo com agenda</Label>
              <NativeSelectField
                value={agendaEntryId}
                onChange={(e) => setAgendaEntryId(e.target.value)}
                placeholder="Sem vínculo"
                options={agendaOptions.map((a) => ({
                  value: a.id,
                  label: a.title,
                }))}
              />
            </div>
          ) : null}

          <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center justify-between gap-2">
              <Label>Planos anexados (PDF ou vídeo)</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setAttachments((prev) => [...prev, { label: "", fileUrl: "", kind: "plano_treino" }])}
              >
                <Plus className="mr-1 h-4 w-4" />
                Anexo
              </Button>
            </div>
            {attachments.map((a, idx) => (
              <div key={idx} className="rounded-lg border border-border/60 bg-card/40 p-3 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs">Tipo</Label>
                    <NativeSelectField
                      value={a.kind}
                      onChange={(e) => {
                        const next = [...attachments];
                        next[idx] = { ...a, kind: e.target.value };
                        setAttachments(next);
                      }}
                      options={COACH_TRAINING_ATTACHMENT_KINDS.map((k) => ({ value: k.value, label: k.label }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Descrição</Label>
                    <Input
                      value={a.label}
                      onChange={(e) => {
                        const next = [...attachments];
                        next[idx] = { ...a, label: e.target.value };
                        setAttachments(next);
                      }}
                      placeholder="Ex.: Periodização semana 12"
                    />
                  </div>
                </div>
                <TreinadoresMediaPicker
                  label="Arquivo"
                  value={a.fileUrl}
                  onChange={(url) => {
                    const next = [...attachments];
                    next[idx] = { ...a, fileUrl: url };
                    setAttachments(next);
                  }}
                />
                {attachments.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    Remover anexo
                  </Button>
                ) : null}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Objetivos</Label>
            <Textarea rows={2} value={objectives} onChange={(e) => setObjectives(e.target.value)} />
          </div>

          <div className="space-y-3">
            <Label>Avaliação do elenco (0 a 5)</Label>
            {playerEntries.map((p, idx) => (
              <div key={p.playerId} className="rounded-lg border border-border/60 p-3 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="font-medium text-sm">
                    {p.name}
                    {p.inTreatment ? (
                      <span className="ml-2 text-xs text-amber-400">Em tratamento</span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`avail-${p.playerId}`} className="text-xs">
                      Disponível
                    </Label>
                    <input
                      id={`avail-${p.playerId}`}
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
                  </div>
                </div>
                {!p.available ? (
                  <Input
                    placeholder="Motivo da indisponibilidade"
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
                    placeholder="Nota"
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
                    placeholder="Observações do treino"
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

          <div className="rounded-xl border border-border/60">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
              onClick={() => setShowActivities((v) => !v)}
            >
              <span className="text-sm font-medium">Montar atividades no sistema (opcional)</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showActivities ? "rotate-180" : ""}`} />
            </button>
            {showActivities ? (
              <div className="space-y-3 border-t border-border/60 p-4">
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setActivities((prev) => [
                        ...prev,
                        { kind: "principal", title: "", description: "", durationMinutes: null, mediaUrl: "" },
                      ])
                    }
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Atividade
                  </Button>
                </div>
                {activities.map((a, idx) => (
                  <div key={idx} className="rounded-lg border border-border/60 p-3 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-xs">Tipo</Label>
                        <NativeSelectField
                          value={a.kind}
                          onChange={(e) => {
                            const next = [...activities];
                            next[idx] = { ...a, kind: e.target.value };
                            setActivities(next);
                          }}
                          options={COACH_ACTIVITY_KINDS.map((k) => ({ value: k.value, label: k.label }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Duração (min)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={a.durationMinutes ?? ""}
                          onChange={(e) => {
                            const next = [...activities];
                            next[idx] = {
                              ...a,
                              durationMinutes: e.target.value === "" ? null : Number(e.target.value),
                            };
                            setActivities(next);
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Título</Label>
                      <Input
                        value={a.title}
                        onChange={(e) => {
                          const next = [...activities];
                          next[idx] = { ...a, title: e.target.value };
                          setActivities(next);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Descrição</Label>
                      <Textarea
                        rows={2}
                        value={a.description ?? ""}
                        onChange={(e) => {
                          const next = [...activities];
                          next[idx] = { ...a, description: e.target.value };
                          setActivities(next);
                        }}
                      />
                    </div>
                    <TreinadoresMediaPicker
                      label="Vídeo ou foto da atividade"
                      value={a.mediaUrl ?? ""}
                      onChange={(url) => {
                        const next = [...activities];
                        next[idx] = { ...a, mediaUrl: url };
                        setActivities(next);
                      }}
                    />
                    {activities.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setActivities((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        Remover atividade
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Observações gerais</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
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

          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar treino
          </Button>
        </CardContent>
      </Card>

      <Dialog open={periodOpen} onOpenChange={setPeriodOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Relatório do período</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
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
              {printing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.title === "Erro" ? "error" : feedback.title === "Atenção" ? "warning" : "success"}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
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
    </div>
  );
}
