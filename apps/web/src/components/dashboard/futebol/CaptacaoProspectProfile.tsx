"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedbackModal, type FeedbackVariant } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import { getPositionLabel } from "@/lib/football-positions";
import { buildWhatsAppUrl } from "@/lib/whatsapp-url";
import {
  type ScoutingProspect,
  type Scout,
  type SchedulerNotification,
  type ManagerEmailNotification,
  labelForStage,
  labelForPriority,
  labelForRecommendation,
  labelForEvaluationOutcome,
  formatScoutingRating,
  priorityBadgeClass,
  stageBadgeClass,
  emptyDimensionEvals,
  buildReportDimensions,
} from "@/lib/captacao-types";
import { CaptacaoReportDetailDialog } from "./CaptacaoReportDetailDialog";
import {
  CaptacaoEvaluationFields,
  EMPTY_EVALUATION_FORM,
  type CaptacaoEvaluationFormValues,
} from "./CaptacaoEvaluationFields";

const SCHEDULER_PHONE = "33984133636";

function InfoBlock({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null;
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

function formatLodging(needsLodging?: boolean | null, presentationDate?: string | null) {
  if (needsLodging === true) return "Sim — precisa alojar";
  if (needsLodging === false) {
    const date = presentationDate
      ? formatDateDayMonYear(new Date(`${presentationDate}T12:00:00`))
      : null;
    return date ? `Não · apresentação ${date}` : "Não";
  }
  return null;
}

export function CaptacaoProspectProfile() {
  const params = useParams();
  const searchParams = useSearchParams();
  const prospectId = typeof params.id === "string" ? params.id : "";
  const tenantId = searchParams.get("tenantId") ?? "";

  const [prospect, setProspect] = useState<ScoutingProspect | null>(null);
  const [scouts, setScouts] = useState<Scout[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [evalForm, setEvalForm] = useState<CaptacaoEvaluationFormValues>({
    ...EMPTY_EVALUATION_FORM,
  });
  const [dimensionEvals, setDimensionEvals] = useState(emptyDimensionEvals());
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: FeedbackVariant;
  }>({ open: false, title: "", message: "", variant: "info" });

  const loadProspect = useCallback(async () => {
    if (!prospectId) return;
    setLoading(true);
    try {
      const { data } = await api.get<ScoutingProspect>(`/captacao/prospects/${prospectId}`);
      setProspect(data);
      setEvalForm((prev) => ({
        ...prev,
        scoutId: data.scoutId ?? prev.scoutId,
        needsLodging:
          data.needsLodging === true ? "sim" : data.needsLodging === false ? "nao" : "",
        presentationDate: data.presentationDate ?? "",
      }));
    } catch {
      setProspect(null);
    } finally {
      setLoading(false);
    }
  }, [prospectId]);

  useEffect(() => {
    void loadProspect();
  }, [loadProspect]);

  useEffect(() => {
    const tid = prospect?.tenantId ?? tenantId;
    if (!tid) return;
    api
      .get<Scout[]>(`/captacao/scouts?tenantId=${tid}&active=true`)
      .then(({ data }) => setScouts(Array.isArray(data) ? data : []))
      .catch(() => setScouts([]));
  }, [prospect?.tenantId, tenantId]);

  async function handleSaveEvaluation(e: React.FormEvent) {
    e.preventDefault();
    if (!prospect) return;
    if (!evalForm.scoutId) {
      setFeedback({
        open: true,
        title: "Captador obrigatório",
        message: "Selecione o captador responsável pela avaliação.",
        variant: "warning",
      });
      return;
    }
    if (
      evalForm.evaluationOutcome === "aprovado" &&
      evalForm.needsLodging === "nao" &&
      !evalForm.presentationDate
    ) {
      setFeedback({
        open: true,
        title: "Data de apresentação",
        message: "Informe a data de apresentação quando o atleta não precisa de alojamento.",
        variant: "warning",
      });
      return;
    }

    setSaving(true);
    try {
      const dimensions = buildReportDimensions(dimensionEvals);
      const { data } = await api.post<{
        schedulerNotification?: SchedulerNotification | null;
        managerEmail?: ManagerEmailNotification | null;
      }>("/captacao/reports", {
        tenantId: prospect.tenantId,
        prospectId: prospect.id,
        scoutId: evalForm.scoutId,
        observationType: "ao_vivo",
        recommendation: evalForm.recommendation,
        evaluationOutcome: evalForm.evaluationOutcome,
        overallRating: evalForm.overallRating ? Number(evalForm.overallRating) : undefined,
        needsLodging:
          evalForm.needsLodging === "sim"
            ? true
            : evalForm.needsLodging === "nao"
              ? false
              : undefined,
        presentationDate:
          evalForm.needsLodging === "nao" ? evalForm.presentationDate || undefined : undefined,
        ...dimensions,
        strengths: evalForm.strengths || undefined,
        weaknesses: evalForm.weaknesses || undefined,
        scoutNotes: evalForm.scoutNotes || undefined,
      });

      await loadProspect();
      setDimensionEvals(emptyDimensionEvals());

      if (evalForm.evaluationOutcome === "aprovado") {
        if (data.managerEmail?.sent) {
          setFeedback({
            open: true,
            title: "Avaliação salva",
            message: "E-mail enviado ao gerente para aprovação.",
            variant: "success",
          });
        } else {
          setFeedback({
            open: true,
            title: "Avaliação salva",
            message:
              data.managerEmail?.error ??
              "Não foi possível enviar o e-mail ao gerente. Verifique CAPTACAO_MANAGER_EMAIL no servidor.",
            variant: "warning",
          });
        }
      } else if (evalForm.evaluationOutcome === "para_teste" && data.schedulerNotification?.whatsappUrl) {
        setFeedback({
          open: true,
          title: "Avaliação salva",
          message: "Encaminhado para teste. Use o botão abaixo para avisar o agendamento no WhatsApp.",
          variant: "success",
        });
      } else {
        setFeedback({
          open: true,
          title: "Avaliação salva",
          message: "Notas registradas no perfil do atleta.",
          variant: "success",
        });
      }
    } catch {
      setFeedback({
        open: true,
        title: "Erro",
        message: "Não foi possível salvar a avaliação.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  const waMessage = prospect
    ? [
        "BCG Captação — agendar avaliação do observado",
        "",
        `Atleta: ${prospect.name}`,
        prospect.position ? `Posição: ${getPositionLabel(prospect.position)}` : null,
        prospect.currentClub ? `Clube: ${prospect.currentClub}` : null,
        prospect.targetCategory ? `Categoria: ${prospect.targetCategory}` : null,
        prospect.evaluationOutcome === "para_teste" ? "Encaminhamento: Para teste / try-out" : null,
        prospect.overallRating != null ? `Nota geral: ${formatScoutingRating(prospect.overallRating)}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  const waUrl =
    prospect?.evaluationOutcome === "para_teste"
      ? buildWhatsAppUrl(SCHEDULER_PHONE, waMessage)
      : null;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!prospect) {
    return <p className="text-sm text-muted-foreground">Atleta observado não encontrado.</p>;
  }

  const lodgingLabel = formatLodging(prospect.needsLodging, prospect.presentationDate);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href={`/dashboard/futebol/captacao${tenantId ? `?tenantId=${tenantId}` : ""}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Captação
          </Link>
        </Button>
        {waUrl ? (
          <Button type="button" size="sm" className="bg-emerald-600 hover:bg-emerald-600/90" asChild>
            <a href={waUrl} target="_blank" rel="noopener noreferrer">
              WhatsApp — agendar teste
            </a>
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{prospect.name}</CardTitle>
          <div className="flex flex-wrap gap-2 pt-1">
            <span className={`rounded border px-2 py-0.5 text-xs ${stageBadgeClass(prospect.stage)}`}>
              {labelForStage(prospect.stage)}
            </span>
            <span className={`rounded border px-2 py-0.5 text-xs ${priorityBadgeClass(prospect.priority)}`}>
              {labelForPriority(prospect.priority)}
            </span>
            <span className="rounded border border-border/60 px-2 py-0.5 text-xs">
              {labelForEvaluationOutcome(prospect.evaluationOutcome ?? "pendente")}
            </span>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoBlock label="Posição" value={getPositionLabel(prospect.position) || undefined} />
          <InfoBlock label="Clube atual" value={prospect.currentClub ?? undefined} />
          <InfoBlock label="Categoria alvo" value={prospect.targetCategory ?? undefined} />
          <InfoBlock label="Captador" value={prospect.scout?.name} />
          <InfoBlock label="Alojamento" value={lodgingLabel ?? undefined} />
          <InfoBlock
            label="Última observação"
            value={prospect.lastObservedAt ? formatDateDayMonYear(prospect.lastObservedAt) : undefined}
          />
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Geral", prospect.overallRating],
          ["Técnico", prospect.technicalRating],
          ["Tático", prospect.tacticalRating],
          ["Físico", prospect.physicalRating],
          ["Cognitivo", prospect.cognitiveRating],
        ].map(([label, val]) => (
          <Card key={String(label)}>
            <CardContent className="pt-6 text-center">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="text-2xl font-semibold tabular-nums">
                {formatScoutingRating(val as number | null)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registrar avaliação</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveEvaluation} className="grid gap-4 sm:grid-cols-2">
            <CaptacaoEvaluationFields
              scouts={scouts}
              values={evalForm}
              dimensionEvals={dimensionEvals}
              onValuesChange={setEvalForm}
              onDimensionEvalsChange={setDimensionEvals}
            />
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar avaliação
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {prospect.descriptiveObservation ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Observação descritiva</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{prospect.descriptiveObservation}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Relatórios ({prospect.reports?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!prospect.reports?.length ? (
            <p className="text-sm text-muted-foreground">Nenhum relatório ainda.</p>
          ) : (
            prospect.reports.map((r) => (
              <button
                key={r.id}
                type="button"
                className="flex w-full items-center justify-between rounded-lg border border-border/60 p-3 text-left text-sm hover:bg-muted/30"
                onClick={() => setSelectedReportId(r.id)}
              >
                <div>
                  <div className="font-medium">{formatDateDayMonYear(r.reportDate)}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.scout?.name} · {labelForRecommendation(r.recommendation)}
                  </div>
                </div>
                <div className="tabular-nums text-amber-300">{formatScoutingRating(r.overallRating)}</div>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <CaptacaoReportDetailDialog
        reportId={selectedReportId}
        tenantId={tenantId || prospect.tenantId}
        onClose={() => setSelectedReportId(null)}
      />

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
