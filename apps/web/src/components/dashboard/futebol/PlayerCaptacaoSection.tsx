"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import {
  type ScoutingProspect,
  labelForStage,
  labelForPriority,
  labelForRecommendation,
  labelForEvaluationOutcome,
  labelForCtScheduleStatus,
  formatScoutingRating,
  stageBadgeClass,
  priorityBadgeClass,
  ctScheduleBadgeClass,
} from "@/lib/captacao-types";
import { CaptacaoReportDetailDialog } from "./CaptacaoReportDetailDialog";

interface Props {
  playerId: string;
}

export function PlayerCaptacaoSection({ playerId }: Props) {
  const [prospect, setProspect] = useState<ScoutingProspect | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ScoutingProspect | null>(
        `/captacao/players/${playerId}/history`,
      );
      setProspect(data);
    } catch {
      setProspect(null);
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!prospect) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Nenhum histórico de captação vinculado a este atleta.
        </CardContent>
      </Card>
    );
  }

  const ctStatus = prospect.effectiveCtScheduleStatus ?? prospect.ctScheduleStatus;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Origem — captação</CardTitle>
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
            {ctStatus ? (
              <span className={`rounded border px-2 py-0.5 text-xs ${ctScheduleBadgeClass(ctStatus)}`}>
                {labelForCtScheduleStatus(ctStatus)}
              </span>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
          {prospect.scout?.name ? (
            <div>
              <div className="text-xs text-muted-foreground">Captador</div>
              <div>{prospect.scout.name}</div>
            </div>
          ) : null}
          {prospect.ctScheduledAt ? (
            <div>
              <div className="text-xs text-muted-foreground">Agendamento CT</div>
              <div>{new Date(prospect.ctScheduledAt).toLocaleString("pt-BR")}</div>
            </div>
          ) : null}
          {prospect.presentationDate ? (
            <div>
              <div className="text-xs text-muted-foreground">Apresentação</div>
              <div>{formatDateDayMonYear(new Date(`${prospect.presentationDate}T12:00:00`))}</div>
            </div>
          ) : null}
          {prospect.ctEvaluationStartedAt ? (
            <div>
              <div className="text-xs text-muted-foreground">Início avaliação CT</div>
              <div>{new Date(prospect.ctEvaluationStartedAt).toLocaleString("pt-BR")}</div>
            </div>
          ) : null}
          {prospect.ctEvaluationCompletedAt ? (
            <div>
              <div className="text-xs text-muted-foreground">Conclusão CT</div>
              <div>{new Date(prospect.ctEvaluationCompletedAt).toLocaleString("pt-BR")}</div>
            </div>
          ) : null}
          {prospect.ctScheduleNotes ? (
            <div className="sm:col-span-2">
              <div className="text-xs text-muted-foreground">Obs. agendamento</div>
              <div className="whitespace-pre-wrap">{prospect.ctScheduleNotes}</div>
            </div>
          ) : null}
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

      {prospect.observationText ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Observação</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{prospect.observationText}</p>
          </CardContent>
        </Card>
      ) : null}

      {prospect.supervisorApprovedBy ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Decisão do supervisor</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>Aprovado por {prospect.supervisorApprovedBy}</p>
            {prospect.supervisorApprovedAt ? (
              <p className="text-muted-foreground">
                {formatDateDayMonYear(prospect.supervisorApprovedAt)}
              </p>
            ) : null}
            {prospect.supervisorNotes ? (
              <p className="mt-2 whitespace-pre-wrap">{prospect.supervisorNotes}</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Relatórios ({prospect.reports?.length ?? 0})</CardTitle>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link
              href={`/dashboard/futebol/captacao/prospects/${prospect.id}?tenantId=${prospect.tenantId}`}
            >
              Abrir no hub
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {!prospect.reports?.length ? (
            <p className="text-sm text-muted-foreground">Nenhum relatório.</p>
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
                <div className="tabular-nums text-amber-300">
                  {formatScoutingRating(r.overallRating)}
                </div>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <CaptacaoReportDetailDialog
        reportId={selectedReportId}
        tenantId={prospect.tenantId}
        onClose={() => setSelectedReportId(null)}
      />
    </div>
  );
}
