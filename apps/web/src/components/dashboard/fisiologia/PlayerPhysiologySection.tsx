"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import { getCategoryLabel } from "@/lib/fixture-categories";
import { COMPOSITION_STATUS_LABELS, HYDRATION_STATUS_LABELS } from "@/lib/fisiologia-calculations";
import {
  assessmentTypeLabel,
  type PlayerPhysiologyContext,
} from "@/lib/fisiologia-types";
import type { PlayerTransitionProgramHistory } from "@/lib/fisiologia-transition-types";
import { formatDurationMinutes, transitionWorkTypeLabel } from "@/lib/physio-transition-labels";

interface Props {
  playerId: string;
  playerName: string;
  playerCategory?: string | null;
}

export function PlayerPhysiologySection({ playerId, playerName, playerCategory }: Props) {
  const [context, setContext] = useState<PlayerPhysiologyContext | null>(null);
  const [transitions, setTransitions] = useState<PlayerTransitionProgramHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!playerId) return;
    setLoading(true);
    try {
      const [ctxRes, trRes] = await Promise.all([
        api.get<PlayerPhysiologyContext>(`/fisiologia/players/${playerId}/context`),
        api.get<PlayerTransitionProgramHistory[]>(`/fisiologia/players/${playerId}/transition-programs`),
      ]);
      setContext(ctxRes.data);
      setTransitions(Array.isArray(trRes.data) ? trRes.data : []);
    } catch {
      setContext(null);
      setTransitions([]);
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const assessments = context?.physiologyAssessments ?? [];
  const hydrations = context?.physiologyHydrations ?? [];
  const loadEntries = context?.physiologyLoadEntries ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{playerName}</p>
          {playerCategory ? (
            <p className="text-xs text-muted-foreground">
              Categoria: {getCategoryLabel(playerCategory, "pt")}
            </p>
          ) : null}
        </div>
        <Button type="button" variant="outline" asChild className="min-h-[44px]">
          <Link href="/dashboard/futebol/fisiologia">
            <Heart className="h-4 w-4 mr-2" />
            Módulo Fisiologia
            <ExternalLink className="h-3.5 w-3.5 ml-2 opacity-70" />
          </Link>
        </Button>
      </div>

      {transitions.length > 0 ? (
        <Card className="rounded-2xl border-border/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Transição — retorno ao treino</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {transitions.map((program) => (
              <div key={program.id} className="rounded-lg border border-border/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {program.status === "active"
                      ? "Em transição"
                      : program.status === "completed"
                        ? "Transição concluída"
                        : "Transição cancelada"}
                  </p>
                  <Button asChild variant="outline" size="sm" className="min-h-[44px]">
                    <Link href={`/dashboard/futebol/fisiologia/transicoes/${program.id}`}>
                      Abrir programa
                    </Link>
                  </Button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Fisio encerrada {program.originSession.endedAt ? formatDateDayMonYear(program.originSession.endedAt) : "—"}
                  {" · "}
                  Início transição {formatDateDayMonYear(program.startedAt)}
                  {program.completedAt
                    ? ` · Conclusão ${formatDateDayMonYear(program.completedAt)}`
                    : ""}
                </p>
                <p className="mt-1 text-muted-foreground">Origem: {program.originSummary}</p>
                {program.entries.length > 0 ? (
                  <ul className="mt-2 space-y-1 border-t border-border/40 pt-2">
                    {[...program.entries].reverse().map((e) => (
                      <li key={e.id} className="text-xs text-muted-foreground">
                        {formatDateDayMonYear(e.sessionDate)} ·{" "}
                        {transitionWorkTypeLabel(e.workType, e.workTypeLabel)} ·{" "}
                        {formatDurationMinutes(e.durationMinutes)}
                        {e.needsNewSession ? " · continua" : " · alta Performance"}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">Aguardando sessões de transição.</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-2xl border-border/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Avaliações físicas</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          {assessments.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma avaliação registrada.</p>
          ) : (
            assessments.slice(0, 8).map((a) => (
              <div key={a.id} className="rounded-lg border border-border/60 p-3">
                <p className="font-medium">
                  {formatDateDayMonYear(new Date(a.assessedAt))} — {assessmentTypeLabel(a.assessmentType)}
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  {a.weight != null ? `${a.weight} kg` : "—"}
                  {a.bmi != null ? ` · IMC ${a.bmi}` : ""}
                  {a.bodyFatPercent != null ? ` · ${a.bodyFatPercent}% gordura` : ""}
                  {a.compositionStatus
                    ? ` · ${COMPOSITION_STATUS_LABELS[a.compositionStatus] ?? a.compositionStatus}`
                    : ""}
                  {a.vo2max != null ? ` · VO₂ ${a.vo2max}` : ""}
                  {a.cmjCm != null ? ` · CMJ ${a.cmjCm} cm` : ""}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Hidratação</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          {hydrations.length === 0 ? (
            <p className="text-muted-foreground">Nenhum registro de hidratação.</p>
          ) : (
            hydrations.slice(0, 6).map((h) => (
              <p key={h.id} className="text-muted-foreground">
                {formatDateDayMonYear(new Date(h.recordedAt))} — {h.contextType === "jogo" ? "Jogo" : "Treino"}
                {h.weightBefore != null && h.weightAfter != null
                  ? ` · ${h.weightBefore} → ${h.weightAfter} kg`
                  : ""}
                {h.status ? ` · ${HYDRATION_STATUS_LABELS[h.status] ?? h.status}` : ""}
              </p>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Carga e GPS</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          {loadEntries.length === 0 ? (
            <p className="text-muted-foreground">Nenhum registro de carga.</p>
          ) : (
            loadEntries.slice(0, 8).map((e) => (
              <p key={e.id ?? `${e.playerId}-${e.session?.sessionDate}`} className="text-muted-foreground">
                {e.session?.sessionDate
                  ? formatDateDayMonYear(new Date(`${e.session.sessionDate}T12:00:00`))
                  : "—"}
                {" — "}
                {e.session?.sessionType === "jogo" ? "Jogo" : "Treino"}
                {e.maxDistanceM != null ? ` · ${e.maxDistanceM} m` : ""}
                {e.maxSpeedKmh != null ? ` · ${e.maxSpeedKmh} km/h` : ""}
                {e.rpe != null ? ` · PSE ${e.rpe}` : ""}
              </p>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
