"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, Loader2, MessageCircle } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FeedbackModal, type FeedbackVariant } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import { getPositionLabel } from "@/lib/football-positions";
import { buildWhatsAppUrl } from "@/lib/whatsapp-url";
import {
  type ScoutingProspect,
  labelForPriority,
  labelForCtScheduleStatus,
  labelForEvaluationOutcome,
  formatScoutingRating,
  priorityBadgeClass,
  ctScheduleBadgeClass,
} from "@/lib/captacao-types";

interface Props {
  tenantId: string;
}

type ScheduleMode = "agendar" | "reagendar" | "faltou" | null;

function toLocalDatetimeValue(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function buildContactWhatsAppMessage(p: ScoutingProspect): string {
  return [
    "BCG Captação — avaliação no CT",
    "",
    `Atleta: ${p.name}`,
    p.position ? `Posição: ${getPositionLabel(p.position)}` : null,
    p.currentClub ? `Clube: ${p.currentClub}` : null,
    p.targetCategory ? `Categoria: ${p.targetCategory}` : null,
    p.effectiveCtScheduleStatus === "agendado" && p.ctScheduledAt
      ? `Agendado: ${new Date(p.ctScheduledAt).toLocaleString("pt-BR")}`
      : null,
    p.overallRating != null ? `Nota geral: ${formatScoutingRating(p.overallRating)}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function CaptacaoCtEvaluationPanel({ tenantId }: Props) {
  const [items, setItems] = useState<ScoutingProspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>(null);
  const [activeProspect, setActiveProspect] = useState<ScoutingProspect | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [presentationDate, setPresentationDate] = useState("");
  const [scheduleNotes, setScheduleNotes] = useState("");
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: FeedbackVariant;
  }>({ open: false, title: "", message: "", variant: "info" });

  const loadQueue = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data } = await api.get<ScoutingProspect[]>(
        `/captacao/ct-evaluation-queue?tenantId=${tenantId}`,
      );
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  async function patchSchedule(
    prospectId: string,
    body: Record<string, string | undefined>,
  ) {
    setSaving(true);
    try {
      await api.patch(`/captacao/prospects/${prospectId}/ct-schedule`, body);
      await loadQueue();
      setScheduleMode(null);
      setActiveProspect(null);
    } catch (err) {
      setFeedback({
        open: true,
        title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível atualizar o agendamento.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  function openSchedule(prospect: ScoutingProspect, mode: ScheduleMode) {
    setActiveProspect(prospect);
    setScheduleMode(mode);
    setScheduledAt(toLocalDatetimeValue(prospect.ctScheduledAt));
    setPresentationDate(prospect.presentationDate ?? "");
    setScheduleNotes(prospect.ctScheduleNotes ?? "");
  }

  async function handleScheduleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeProspect) return;
    if (scheduleMode === "faltou") {
      await patchSchedule(activeProspect.id, {
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
    await patchSchedule(activeProspect.id, {
      ctScheduleStatus: "agendado",
      ctScheduledAt: new Date(scheduledAt).toISOString(),
      presentationDate: presentationDate || undefined,
    });
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Atleta</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Encaminh.</TableHead>
              <TableHead>Status CT</TableHead>
              <TableHead>Agendamento</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Nenhum atleta na fila de avaliação CT.
                </TableCell>
              </TableRow>
            ) : (
              items.map((p) => {
                const status = p.effectiveCtScheduleStatus ?? "nao_agendado";
                const waUrl = buildWhatsAppUrl(
                  p.contactPhone ?? p.agentPhone,
                  buildContactWhatsAppMessage(p),
                );
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/futebol/captacao/prospects/${p.id}${tenantId ? `?tenantId=${tenantId}` : ""}`}
                        className="font-medium hover:underline"
                      >
                        {p.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {getPositionLabel(p.position) || "—"} · {p.currentClub ?? "Sem clube"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`rounded border px-1.5 py-0.5 text-[10px] uppercase ${priorityBadgeClass(p.priority)}`}
                      >
                        {labelForPriority(p.priority)}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {labelForEvaluationOutcome(p.evaluationOutcome ?? "pendente")}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`rounded border px-2 py-0.5 text-xs ${ctScheduleBadgeClass(status)}`}
                      >
                        {labelForCtScheduleStatus(status)}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {p.ctScheduledAt
                        ? new Date(p.ctScheduledAt).toLocaleString("pt-BR")
                        : p.presentationDate
                          ? `Apresentação ${formatDateDayMonYear(new Date(`${p.presentationDate}T12:00:00`))}`
                          : "—"}
                      {p.ctScheduleNotes ? (
                        <p className="mt-0.5 text-muted-foreground">{p.ctScheduleNotes}</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs">
                      {p.contactName ? <p>{p.contactName}</p> : null}
                      {p.contactPhone ?? p.agentPhone ? (
                        <p>{p.contactPhone ?? p.agentPhone}</p>
                      ) : (
                        <p className="text-muted-foreground">—</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-1">
                        {waUrl ? (
                          <Button type="button" size="sm" variant="outline" className="h-8" asChild>
                            <a href={waUrl} target="_blank" rel="noopener noreferrer">
                              <MessageCircle className="mr-1 h-3 w-3" />
                              WhatsApp
                            </a>
                          </Button>
                        ) : null}
                        {status === "nao_agendado" || status === "faltou" ? (
                          <Button
                            type="button"
                            size="sm"
                            className="h-8"
                            onClick={() => openSchedule(p, status === "faltou" ? "reagendar" : "agendar")}
                          >
                            <CalendarClock className="mr-1 h-3 w-3" />
                            {status === "faltou" ? "Reagendar" : "Agendar"}
                          </Button>
                        ) : null}
                        {status === "agendado" ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8"
                              onClick={() => openSchedule(p, "reagendar")}
                            >
                              Reagendar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8"
                              onClick={() => openSchedule(p, "faltou")}
                            >
                              Faltou
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="h-8"
                              disabled={saving}
                              onClick={() =>
                                void patchSchedule(p.id, { ctScheduleStatus: "compareceu" })
                              }
                            >
                              Compareceu
                            </Button>
                          </>
                        ) : null}
                        {status === "compareceu" ? (
                          <Button
                            type="button"
                            size="sm"
                            className="h-8"
                            disabled={saving}
                            onClick={() =>
                              void patchSchedule(p.id, { ctScheduleStatus: "em_avaliacao" })
                            }
                          >
                            Iniciar CT
                          </Button>
                        ) : null}
                        {status === "em_avaliacao" ? (
                          <Button
                            type="button"
                            size="sm"
                            className="h-8"
                            disabled={saving}
                            onClick={() =>
                              void patchSchedule(p.id, { ctScheduleStatus: "concluido" })
                            }
                          >
                            Concluir
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={!!scheduleMode && !!activeProspect}
        onOpenChange={(open) => {
          if (!open) {
            setScheduleMode(null);
            setActiveProspect(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {scheduleMode === "faltou"
                ? "Registrar falta"
                : scheduleMode === "reagendar"
                  ? "Reagendar avaliação"
                  : "Agendar avaliação no CT"}
            </DialogTitle>
          </DialogHeader>
          {activeProspect ? (
            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <p className="text-sm font-medium">{activeProspect.name}</p>
              {scheduleMode === "faltou" ? (
                <div>
                  <Label>Observação</Label>
                  <Textarea
                    className="text-foreground"
                    value={scheduleNotes}
                    onChange={(e) => setScheduleNotes(e.target.value)}
                    placeholder="Motivo / orientação para reagendamento"
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
          ) : null}
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
