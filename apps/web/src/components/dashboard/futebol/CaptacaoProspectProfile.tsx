"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import { getPositionLabel } from "@/lib/football-positions";
import { buildWhatsAppUrl } from "@/lib/whatsapp-url";
import {
  type ScoutingProspect,
  labelForStage,
  labelForPriority,
  labelForRecommendation,
  labelForEvaluationOutcome,
  formatScoutingRating,
  priorityBadgeClass,
  stageBadgeClass,
} from "@/lib/captacao-types";
import { CaptacaoReportDetailDialog } from "./CaptacaoReportDetailDialog";

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

export function CaptacaoProspectProfile() {
  const params = useParams();
  const searchParams = useSearchParams();
  const prospectId = typeof params.id === "string" ? params.id : "";
  const tenantId = searchParams.get("tenantId") ?? "";

  const [prospect, setProspect] = useState<ScoutingProspect | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  useEffect(() => {
    if (!prospectId) return;
    setLoading(true);
    api
      .get<ScoutingProspect>(`/captacao/prospects/${prospectId}`)
      .then(({ data }) => setProspect(data))
      .catch(() => setProspect(null))
      .finally(() => setLoading(false));
  }, [prospectId]);

  const waMessage = prospect
    ? [
        "BCG Captação — agendar avaliação do observado",
        "",
        `Atleta: ${prospect.name}`,
        prospect.position ? `Posição: ${getPositionLabel(prospect.position)}` : null,
        prospect.currentClub ? `Clube: ${prospect.currentClub}` : null,
        prospect.targetCategory ? `Categoria: ${prospect.targetCategory}` : null,
        prospect.priority ? `Prioridade: ${labelForPriority(prospect.priority)}` : null,
        prospect.evaluationOutcome
          ? `Encaminhamento: ${labelForEvaluationOutcome(prospect.evaluationOutcome)}`
          : null,
        prospect.overallRating != null ? `Nota geral: ${formatScoutingRating(prospect.overallRating)}` : null,
        prospect.agentPhone ? `Agente: ${prospect.agentPhone}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  const waUrl = buildWhatsAppUrl(SCHEDULER_PHONE, waMessage);

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
              Notificar agendamento
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
          <InfoBlock label="Nascimento" value={prospect.birthDate ?? undefined} />
          <InfoBlock label="Nacionalidade" value={prospect.nationality ?? undefined} />
          <InfoBlock label="Clube atual" value={prospect.currentClub ?? undefined} />
          <InfoBlock label="Competição" value={prospect.competition ?? undefined} />
          <InfoBlock label="Categoria alvo" value={prospect.targetCategory ?? undefined} />
          <InfoBlock label="Agente" value={prospect.agentName ?? undefined} />
          <InfoBlock label="Tel. agente" value={prospect.agentPhone ?? undefined} />
          <InfoBlock label="E-mail agente" value={prospect.agentEmail ?? undefined} />
          <InfoBlock label="Captador" value={prospect.scout?.name} />
          <InfoBlock
            label="Última observação"
            value={prospect.lastObservedAt ? formatDateDayMonYear(prospect.lastObservedAt) : undefined}
          />
          <InfoBlock label="Observações" value={String(prospect.observationCount)} />
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
              <div className="text-2xl font-semibold tabular-nums">{formatScoutingRating(val as number | null)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

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

      {(prospect.strengths || prospect.weaknesses || prospect.risks) && (
        <div className="grid gap-4 lg:grid-cols-3">
          {prospect.strengths ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Pontos fortes</CardTitle>
              </CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap">{prospect.strengths}</CardContent>
            </Card>
          ) : null}
          {prospect.weaknesses ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">A melhorar</CardTitle>
              </CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap">{prospect.weaknesses}</CardContent>
            </Card>
          ) : null}
          {prospect.risks ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Riscos</CardTitle>
              </CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap">{prospect.risks}</CardContent>
            </Card>
          ) : null}
        </div>
      )}

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
        tenantId={tenantId}
        onClose={() => setSelectedReportId(null)}
      />
    </div>
  );
}
