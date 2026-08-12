"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
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
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import { getPlayerListDisplayName } from "@/lib/player-display-name";
import type {
  CoachContextResponse,
  CoachTrainingActivity,
  CoachTrainingSession,
} from "@/lib/treinadores-types";
import { COACH_ACTIVITY_KINDS } from "@/lib/treinadores-types";
import { TreinadoresMediaPicker } from "./TreinadoresMediaPicker";

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

export function TreinadoresTreinosTab({ tenantId, category, context }: Props) {
  const [sessions, setSessions] = useState<CoachTrainingSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [objectives, setObjectives] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("rascunho");
  const [activities, setActivities] = useState<CoachTrainingActivity[]>(emptyActivities());
  const [playerEntries, setPlayerEntries] = useState<PlayerEntryDraft[]>([]);
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

  const resetForm = () => {
    setSelectedId("");
    setSessionDate("");
    setStartTime("");
    setEndTime("");
    setObjectives("");
    setNotes("");
    setStatus("rascunho");
    setActivities(emptyActivities());
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
        activities: activities
          .filter((a) => a.title.trim())
          .map((a, i) => ({
            kind: a.kind,
            title: a.title.trim(),
            description: a.description || null,
            durationMinutes: a.durationMinutes ?? null,
            sortOrder: i,
            mediaUrl: a.mediaUrl || null,
          })),
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
      setFeedback({ open: true, title: "Salvo", message: "Planejamento de treino salvo." });
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
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
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
                  <div className="font-medium">{formatDateDayMonYear(new Date(`${s.sessionDate}T12:00:00`))}</div>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Planejamento do treino</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <div className="space-y-2">
            <Label>Objetivos</Label>
            <Textarea rows={3} value={objectives} onChange={(e) => setObjectives(e.target.value)} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label>Atividades</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setActivities((prev) => [...prev, { kind: "principal", title: "", description: "", durationMinutes: null, mediaUrl: "" }])
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

          <div className="space-y-3">
            <Label>Elenco e avaliação (0 a 5)</Label>
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
