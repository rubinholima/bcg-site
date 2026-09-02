"use client";

import { useState } from "react";
import { CalendarClock, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FeedbackModal, type FeedbackVariant } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import {
  type ScoutingProspect,
  labelForCtScheduleStatus,
  ctScheduleBadgeClass,
} from "@/lib/captacao-types";
import {
  labelForPhysioClearanceStatus,
  physioClearanceBadgeClass,
} from "@/lib/physio-periodic-labels";

type ScheduleMode = "agendar" | "reagendar" | "faltou" | null;

function toLocalDatetimeValue(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface Props {
  prospect: ScoutingProspect;
  onUpdated: () => Promise<void>;
}

export function CaptacaoProspectCtSchedule({ prospect, onUpdated }: Props) {
  const [saving, setSaving] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [presentationDate, setPresentationDate] = useState("");
  const [scheduleNotes, setScheduleNotes] = useState("");
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: FeedbackVariant;
  }>({ open: false, title: "", message: "", variant: "info" });

  const status = prospect.effectiveCtScheduleStatus ?? "nao_agendado";

  async function patchSchedule(body: Record<string, string | undefined>) {
    setSaving(true);
    try {
      await api.patch(`/captacao/prospects/${prospect.id}/ct-schedule`, body);
      await onUpdated();
      setScheduleMode(null);
    } catch (err) {
      setFeedback({
        open: true,
        title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível atualizar.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  function openSchedule(mode: ScheduleMode) {
    setScheduleMode(mode);
    setScheduledAt(toLocalDatetimeValue(prospect.ctScheduledAt));
    setPresentationDate(prospect.presentationDate ?? "");
    setScheduleNotes(prospect.ctScheduleNotes ?? "");
  }

  async function handleScheduleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (scheduleMode === "faltou") {
      await patchSchedule({
        ctScheduleStatus: "faltou",
        ctScheduleNotes: scheduleNotes || undefined,
      });
      return;
    }
    if (!scheduledAt) {
      setFeedback({
        open: true,
        title: "Data obrigatória",
        message: "Informe data e hora do agendamento.",
        variant: "warning",
      });
      return;
    }
    await patchSchedule({
      ctScheduleStatus: "agendado",
      ctScheduledAt: new Date(scheduledAt).toISOString(),
      presentationDate: presentationDate || undefined,
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4" />
            Avaliação no CT
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded border px-2 py-0.5 text-xs ${ctScheduleBadgeClass(status)}`}>
              {labelForCtScheduleStatus(status)}
            </span>
            <span
              className={`rounded border px-2 py-0.5 text-xs ${physioClearanceBadgeClass(prospect.physioClearanceStatus)}`}
            >
              Liberação Fisio: {labelForPhysioClearanceStatus(prospect.physioClearanceStatus)}
            </span>
            {prospect.ctScheduledAt ? (
              <span className="text-sm text-muted-foreground">
                {new Date(prospect.ctScheduledAt).toLocaleString("pt-BR")}
              </span>
            ) : null}
            {prospect.presentationDate ? (
              <span className="text-sm text-muted-foreground">
                Apresentação{" "}
                {formatDateDayMonYear(new Date(`${prospect.presentationDate}T12:00:00`))}
              </span>
            ) : null}
          </div>
          {prospect.ctScheduleNotes ? (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {prospect.ctScheduleNotes}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {status === "nao_agendado" || status === "faltou" ? (
              <Button
                type="button"
                size="sm"
                disabled={saving}
                onClick={() => openSchedule(status === "faltou" ? "reagendar" : "agendar")}
              >
                {status === "faltou" ? "Reagendar" : "Agendar"}
              </Button>
            ) : null}
            {status === "agendado" ? (
              <>
                <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => openSchedule("reagendar")}>
                  Reagendar
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => openSchedule("faltou")}>
                  Faltou
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={saving}
                  onClick={() => void patchSchedule({ ctScheduleStatus: "compareceu" })}
                >
                  Compareceu
                </Button>
              </>
            ) : null}
            {status === "compareceu" ? (
              <>
                {!prospect.canStartCtFieldEvaluation ? (
                  <p className="w-full text-sm text-amber-400">
                    {prospect.physioClearanceStatus === "reprovado"
                      ? "Liberação fisioterapêutica reprovada — o atleta não pode iniciar avaliação em campo."
                      : "Liberação fisioterapêutica pendente — registre e aprove na Fisioterapia antes de iniciar em campo."}
                  </p>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  disabled={saving || !prospect.canStartCtFieldEvaluation}
                  onClick={() => void patchSchedule({ ctScheduleStatus: "em_avaliacao" })}
                >
                  Iniciar avaliação CT
                </Button>
              </>
            ) : null}
            {status === "em_avaliacao" ? (
              <Button
                type="button"
                size="sm"
                disabled={saving}
                onClick={() => void patchSchedule({ ctScheduleStatus: "concluido" })}
              >
                Concluir
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!scheduleMode} onOpenChange={(open) => !open && setScheduleMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {scheduleMode === "faltou"
                ? "Registrar falta"
                : scheduleMode === "reagendar"
                  ? "Reagendar"
                  : "Agendar no CT"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleScheduleSubmit} className="space-y-4">
            {scheduleMode === "faltou" ? (
              <div>
                <Label>Observação</Label>
                <Textarea
                  className="text-foreground"
                  value={scheduleNotes}
                  onChange={(e) => setScheduleNotes(e.target.value)}
                />
              </div>
            ) : (
              <>
                <div>
                  <Label>Data e hora *</Label>
                  <Input
                    type="datetime-local"
                    required
                    className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Data de apresentação</Label>
                  <Input
                    type="date"
                    className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                    value={presentationDate}
                    onChange={(e) => setPresentationDate(e.target.value)}
                  />
                </div>
              </>
            )}
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.variant}
      />
    </>
  );
}
