"use client";

import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import { getPositionLabel } from "@/lib/football-positions";
import { buildWhatsAppUrl } from "@/lib/whatsapp-url";
import {
  type ScoutingReportDetail,
  REPORT_DIMENSIONS,
  labelForRecommendation,
  labelForPriority,
  labelForEvaluationOutcome,
  formatScoutingRating,
} from "@/lib/captacao-types";
import { useEffect, useState } from "react";

interface Props {
  reportId: string | null;
  tenantId?: string;
  onClose: () => void;
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null;
  return (
    <div className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span>{value}</span>
    </div>
  );
}

export function CaptacaoReportDetailDialog({ reportId, tenantId, onClose }: Props) {
  const [report, setReport] = useState<ScoutingReportDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!reportId) {
      setReport(null);
      return;
    }
    setLoading(true);
    api
      .get<ScoutingReportDetail>(`/captacao/reports/${reportId}`)
      .then(({ data }) => setReport(data))
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, [reportId]);

  const prospect = report?.prospect;
  const waMessage = prospect
    ? [
        "BCG Captação — agendar avaliação",
        "",
        `Atleta: ${prospect.name}`,
        prospect.position ? `Posição: ${getPositionLabel(prospect.position)}` : null,
        prospect.currentClub ? `Clube: ${prospect.currentClub}` : null,
        prospect.targetCategory ? `Categoria: ${prospect.targetCategory}` : null,
        prospect.agentPhone ? `Contato agente: ${prospect.agentPhone}` : null,
        report?.overallRating != null ? `Nota geral: ${formatScoutingRating(report.overallRating)}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  const waUrl = buildWhatsAppUrl(prospect?.agentPhone, waMessage);

  return (
    <Dialog open={!!reportId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Relatório de observação</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !report ? (
          <p className="text-sm text-muted-foreground">Relatório não encontrado.</p>
        ) : (
          <div className="space-y-6">
            <section className="space-y-2 rounded-lg border border-border/60 p-4">
              <h3 className="font-semibold">{prospect?.name ?? "—"}</h3>
              <div className="grid gap-1 sm:grid-cols-2">
                <InfoRow label="Posição" value={getPositionLabel(prospect?.position) || undefined} />
                <InfoRow label="Nascimento" value={prospect?.birthDate ?? undefined} />
                <InfoRow label="Nacionalidade" value={prospect?.nationality ?? undefined} />
                <InfoRow label="Clube" value={prospect?.currentClub ?? undefined} />
                <InfoRow label="Competição" value={prospect?.competition ?? undefined} />
                <InfoRow label="Categoria alvo" value={prospect?.targetCategory ?? undefined} />
                <InfoRow label="Prioridade" value={labelForPriority(prospect?.priority ?? "")} />
                <InfoRow
                  label="Encaminhamento"
                  value={labelForEvaluationOutcome(report.evaluationOutcome ?? prospect?.evaluationOutcome ?? "pendente")}
                />
                <InfoRow label="Agente" value={prospect?.agentName ?? undefined} />
                <InfoRow label="Tel. agente" value={prospect?.agentPhone ?? undefined} />
                <InfoRow label="E-mail agente" value={prospect?.agentEmail ?? undefined} />
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border/60 p-3 text-center">
                <div className="text-xs text-muted-foreground">Nota geral</div>
                <div className="text-xl font-semibold tabular-nums">{formatScoutingRating(report.overallRating)}</div>
              </div>
              <div className="rounded-lg border border-border/60 p-3 text-center">
                <div className="text-xs text-muted-foreground">Recomendação</div>
                <div className="text-sm font-medium uppercase">{labelForRecommendation(report.recommendation)}</div>
              </div>
              <div className="rounded-lg border border-border/60 p-3 text-center">
                <div className="text-xs text-muted-foreground">Técnico</div>
                <div className="text-lg font-semibold tabular-nums">{formatScoutingRating(report.technicalRating)}</div>
              </div>
              <div className="rounded-lg border border-border/60 p-3 text-center">
                <div className="text-xs text-muted-foreground">Tático</div>
                <div className="text-lg font-semibold tabular-nums">{formatScoutingRating(report.tacticalRating)}</div>
              </div>
              <div className="rounded-lg border border-border/60 p-3 text-center">
                <div className="text-xs text-muted-foreground">Físico</div>
                <div className="text-lg font-semibold tabular-nums">{formatScoutingRating(report.physicalRating)}</div>
              </div>
              <div className="rounded-lg border border-border/60 p-3 text-center">
                <div className="text-xs text-muted-foreground">Cognitivo</div>
                <div className="text-lg font-semibold tabular-nums">{formatScoutingRating(report.cognitiveRating)}</div>
              </div>
            </section>

            <section className="space-y-2 text-sm">
              <InfoRow label="Data" value={formatDateDayMonYear(report.reportDate)} />
              <InfoRow label="Captador" value={report.scout?.name} />
              <InfoRow label="Jogo" value={report.matchName ?? undefined} />
              <InfoRow label="Data do jogo" value={report.matchDate ?? undefined} />
              <InfoRow label="Minutos" value={report.minutesObserved != null ? String(report.minutesObserved) : undefined} />
            </section>

            {report.scoutNotes ? (
              <section>
                <h4 className="mb-1 text-sm font-semibold">Observação descritiva</h4>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{report.scoutNotes}</p>
              </section>
            ) : null}

            {(["technical", "tactical", "physical", "mental"] as const).map((dimKey) => {
              const dimData = report[dimKey];
              if (!dimData || typeof dimData !== "object") return null;
              const dim = REPORT_DIMENSIONS[dimKey];
              const entries = Object.entries(dimData as Record<string, { rating?: number; notes?: string }>);
              if (entries.length === 0) return null;
              return (
                <section key={dimKey}>
                  <h4 className="mb-2 text-sm font-semibold">{dim.label}</h4>
                  <div className="space-y-1 text-sm">
                    {entries.map(([key, val]) => {
                      const area = dim.areas.find((a) => a.key === key);
                      return (
                        <div key={key} className="rounded border border-border/40 px-2 py-1">
                          <span className="font-medium">{area?.label ?? key}</span>
                          {val.rating != null ? (
                            <span className="ml-2 tabular-nums text-amber-300">{val.rating}/10</span>
                          ) : null}
                          {val.notes ? (
                            <p className="text-xs text-muted-foreground">{val.notes}</p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}

            <div className="flex flex-wrap gap-2">
              {waUrl ? (
                <Button type="button" asChild className="bg-emerald-600 hover:bg-emerald-600/90">
                  <a href={waUrl} target="_blank" rel="noopener noreferrer">
                    Notificar agendamento (WhatsApp)
                  </a>
                </Button>
              ) : null}
              {prospect?.id && tenantId ? (
                <Button type="button" variant="outline" asChild>
                  <a href={`/dashboard/futebol/captacao/prospects/${prospect.id}?tenantId=${tenantId}`}>
                    Perfil do observado
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
