"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { formatDateDayMonYear } from "@/lib/format-date";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { CreatePhysioTransitionEntryPayload, PhysioSession, PhysioTransitionEntry } from "@/types/fisioterapia";
import {
  formatDurationMinutes,
  PHYSIO_TRANSITION_WORK_TYPE_LABEL,
  transitionWorkTypeLabel,
} from "@/lib/physio-transition-labels";

const WORK_TYPES = Object.keys(PHYSIO_TRANSITION_WORK_TYPE_LABEL);

export function PhysioTransitionPanel({
  session,
  onUpdated,
}: {
  session: PhysioSession;
  onUpdated: () => void;
}) {
  const entries = session.transitionEntries ?? [];
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [workType, setWorkType] = useState("integrado_fisiologia_preparacao");
  const [workTypeLabel, setWorkTypeLabel] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [objective, setObjective] = useState("");
  const [activities, setActivities] = useState("");
  const [stillFeelsPain, setStillFeelsPain] = useState(false);
  const [evolutionScore, setEvolutionScore] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });

  const totalMinutes = useMemo(
    () => entries.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0),
    [entries],
  );

  const canEdit = session.status === "active" && session.disposition !== "alta";

  const resetForm = () => {
    setObjective("");
    setActivities("");
    setStartTime("");
    setEndTime("");
    setEvolutionScore("");
    setStillFeelsPain(false);
    setWorkTypeLabel("");
  };

  const handleSave = async () => {
    if (!startTime || !endTime) {
      setFeedback({ open: true, title: "Horário", message: "Informe início e fim." });
      return;
    }
    if (workType === "outro" && !workTypeLabel.trim()) {
      setFeedback({ open: true, title: "Tipo de trabalho", message: "Descreva o tipo de trabalho." });
      return;
    }
    const payload: CreatePhysioTransitionEntryPayload = {
      sessionDate,
      workType,
      startTime,
      endTime,
      stillFeelsPain,
      objective: objective.trim() || undefined,
      activities: activities.trim() || undefined,
      evolutionScore: evolutionScore ? Number(evolutionScore) : undefined,
      staffId: session.staffId ?? undefined,
      staffName: session.staffName ?? undefined,
    };
    if (workType === "outro") payload.workTypeLabel = workTypeLabel.trim();

    setSaving(true);
    try {
      await api.post(`/fisioterapia/sessions/${session.id}/transitions`, payload);
      resetForm();
      onUpdated();
    } catch (err) {
      setFeedback({
        open: true,
        title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível salvar.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/fisioterapia/sessions/${session.id}/transitions/${deleteId}`);
      setDeleteId(null);
      onUpdated();
    } catch (err) {
      setFeedback({
        open: true,
        title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível excluir.",
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Transição de retorno</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Tempo total de transição: {formatDurationMinutes(totalMinutes)}
            {session.transitionCompletedAt
              ? ` · Encerrada em ${formatDateDayMonYear(session.transitionCompletedAt)}`
              : session.transitionStartedAt
                ? ` · Início ${formatDateDayMonYear(session.transitionStartedAt)}`
                : ""}
          </p>

          {canEdit ? (
            <div className="grid gap-3 rounded-lg border border-border/60 p-3 sm:grid-cols-2">
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">Data *</Label>
                <Input
                  type="date"
                  className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">Tipo de trabalho *</Label>
                <NativeSelect value={workType} onChange={(e) => setWorkType(e.target.value)}>
                  {WORK_TYPES.map((w) => (
                    <option key={w} value={w}>{PHYSIO_TRANSITION_WORK_TYPE_LABEL[w]}</option>
                  ))}
                </NativeSelect>
              </div>
              {workType === "outro" ? (
                <div className="grid gap-1 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Descreva o trabalho *</Label>
                  <Input value={workTypeLabel} onChange={(e) => setWorkTypeLabel(e.target.value)} />
                </div>
              ) : null}
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">Início *</Label>
                <Input
                  type="time"
                  className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">Fim *</Label>
                <Input
                  type="time"
                  className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
              <div className="grid gap-1 sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Objetivo</Label>
                <Input value={objective} onChange={(e) => setObjective(e.target.value)} />
              </div>
              <div className="grid gap-1 sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Atividades realizadas</Label>
                <textarea
                  className="min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  value={activities}
                  onChange={(e) => setActivities(e.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">Ainda sente dor?</Label>
                <NativeSelect
                  value={stillFeelsPain ? "sim" : "nao"}
                  onChange={(e) => setStillFeelsPain(e.target.value === "sim")}
                >
                  <option value="nao">Não</option>
                  <option value="sim">Sim</option>
                </NativeSelect>
              </div>
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">Nota de evolução (0–10)</Label>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  className="text-foreground"
                  value={evolutionScore}
                  onChange={(e) => setEvolutionScore(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Button
                  type="button"
                  className="min-h-[44px]"
                  disabled={saving}
                  onClick={() => void handleSave()}
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Registrar sessão de transição
                </Button>
              </div>
            </div>
          ) : null}

          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma sessão de transição registrada.</p>
          ) : (
            <ul className="space-y-2">
              {entries.map((entry: PhysioTransitionEntry) => (
                <li
                  key={entry.id}
                  className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 text-sm sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="space-y-1">
                    <p className="font-medium">
                      {formatDateDayMonYear(entry.sessionDate)}
                      {" · "}
                      {entry.startTime}–{entry.endTime}
                      {" · "}
                      {formatDurationMinutes(entry.durationMinutes)}
                    </p>
                    <p>{transitionWorkTypeLabel(entry.workType, entry.workTypeLabel)}</p>
                    {entry.objective ? <p className="text-muted-foreground">Objetivo: {entry.objective}</p> : null}
                    {entry.activities ? <p className="text-muted-foreground">{entry.activities}</p> : null}
                    <p className="text-muted-foreground">
                      Dor: {entry.stillFeelsPain ? "Sim" : "Não"}
                      {entry.evolutionScore != null ? ` · Evolução ${entry.evolutionScore}/10` : ""}
                    </p>
                  </div>
                  {canEdit ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 shrink-0 text-destructive"
                      onClick={() => setDeleteId(entry.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir sessão de transição?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
      />
    </>
  );
}
