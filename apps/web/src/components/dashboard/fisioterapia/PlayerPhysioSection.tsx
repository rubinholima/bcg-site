"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { formatDateDayMonYear } from "@/lib/format-date";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhysioBodyMap } from "@/components/dashboard/fisioterapia/PhysioBodyMap";
import type {
  PhysioGameAttendance,
  PhysioPlayerEvaluation,
  PhysioSession,
  PhysioTryoutClearance,
} from "@/types/fisioterapia";
import {
  formatGameBodyLocationList,
  formatGameProcedureList,
  labelFromMap,
  PHYSIO_EVAL_BODY_LOCATION_LABEL,
  PHYSIO_EVAL_CONTEXT_LABEL,
  PHYSIO_EVAL_OUTCOME_LABEL,
  PHYSIO_EVAL_TEST_TYPE_LABEL,
  PHYSIO_GAME_CARE_CATEGORY_LABEL,
  PHYSIO_GAME_PHASE_LABEL,
  PHYSIO_GAME_TREATMENT_REASON_LABEL,
} from "@/lib/physio-game-evaluation-labels";
import {
  PHYSIO_PERIODIC_PROTOCOL_LABEL,
  PHYSIO_PROTOCOL_CLASSIFICATION_LABEL,
  labelForPhysioClearanceStatus,
  physioClearanceBadgeClass,
} from "@/lib/physio-periodic-labels";
import { cn } from "@/lib/utils";

export function PlayerPhysioSection({
  playerId,
  tenantId,
}: {
  playerId: string;
  tenantId: string;
}) {
  const { canAccessModule } = useAuth();
  const canViewClinical = canAccessModule("saude");
  const [sessions, setSessions] = useState<PhysioSession[]>([]);
  const [gameAttendances, setGameAttendances] = useState<PhysioGameAttendance[]>([]);
  const [evaluations, setEvaluations] = useState<PhysioPlayerEvaluation[]>([]);
  const [tryoutClearances, setTryoutClearances] = useState<PhysioTryoutClearance[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sessionsRes, gameRes, evalRes, clearanceRes] = await Promise.all([
        api.get<PhysioSession[]>(
          `/fisioterapia/sessions?playerId=${encodeURIComponent(playerId)}&status=all`,
        ),
        api.get<PhysioGameAttendance[]>(
          `/fisioterapia/game-attendances?playerId=${encodeURIComponent(playerId)}`,
        ),
        api.get<PhysioPlayerEvaluation[]>(
          `/fisioterapia/evaluations?playerId=${encodeURIComponent(playerId)}`,
        ),
        canViewClinical
          ? api.get<PhysioTryoutClearance[]>(
              `/fisioterapia/tryout-clearances?playerId=${encodeURIComponent(playerId)}`,
            )
          : Promise.resolve({ data: [] as PhysioTryoutClearance[] }),
      ]);
      setSessions(Array.isArray(sessionsRes.data) ? sessionsRes.data : []);
      setGameAttendances(Array.isArray(gameRes.data) ? gameRes.data : []);
      setEvaluations(Array.isArray(evalRes.data) ? evalRes.data : []);
      setTryoutClearances(Array.isArray(clearanceRes.data) ? clearanceRes.data : []);
    } catch {
      setSessions([]);
      setGameAttendances([]);
      setEvaluations([]);
      setTryoutClearances([]);
    } finally {
      setLoading(false);
    }
  }, [playerId, canViewClinical]);

  useEffect(() => {
    void load();
  }, [load]);

  const active = sessions.filter((s) => s.status === "active");
  const marks = active.flatMap((s) => {
    const rows =
      s.sessionRegions && s.sessionRegions.length > 0
        ? s.sessionRegions
        : [
            {
              regionId: s.regionId,
              side: s.side,
              bodyMapView: s.bodyMapView,
              bodyMapX: s.bodyMapX,
              bodyMapY: s.bodyMapY,
            },
          ];
    return rows.map((r) => ({
      regionId: r.regionId,
      side: r.side,
      view: r.bodyMapView,
      x: r.bodyMapX,
      y: r.bodyMapY,
    }));
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Fisioterapia</h2>
          <p className="text-sm text-muted-foreground">
            {active.length > 0
              ? `${active.length} tratamento(s) ativo(s) — status lesionado até a alta`
              : "Sem tratamentos ativos"}
          </p>
        </div>
        <Button asChild className="min-h-[44px]">
          <Link href={`/dashboard/saude/fisioterapia/novo?playerId=${playerId}&tenantId=${tenantId}`}>
            <Plus className="mr-2 h-4 w-4" />
            Novo atendimento
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <Card>
          <CardContent className="pt-4">
            <PhysioBodyMap view="front" marks={marks} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Histórico clínico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : sessions.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhum atendimento registrado.</p>
            ) : (
              sessions.map((s) => (
                <Link
                  key={s.id}
                  href={`/dashboard/saude/fisioterapia/${s.id}`}
                  className={cn(
                    "block rounded-lg border p-3 hover:bg-muted/40",
                    s.status === "active" ? "border-amber-500/40" : "border-border/60",
                  )}
                >
                  <div className="flex justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        {(s.sessionRegions?.length
                          ? s.sessionRegions.map((r) => {
                              const name = r.region?.namePt ?? r.regionId;
                              const side = r.side === "E" ? " E" : r.side === "D" ? " D" : "";
                              return `${name}${side}`;
                            })
                          : [
                              `${s.region?.namePt ?? s.regionId}${
                                s.side === "E" ? " E" : s.side === "D" ? " D" : ""
                              }`,
                            ]
                        ).join(" + ")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {(s.sessionDiagnoses?.length
                          ? s.sessionDiagnoses
                              .map((d) => d.diagnosisLabel ?? d.diagnosis?.name)
                              .filter(Boolean)
                              .join(" + ")
                          : s.diagnosisLabel) || "Sem diagnóstico"}
                        {(() => {
                          const txs =
                            s.sessionTreatments && s.sessionTreatments.length > 0
                              ? s.sessionTreatments
                                  .map((t) => t.treatmentLabel ?? t.treatment?.name)
                                  .filter(Boolean)
                              : s.treatmentLabel
                                ? [s.treatmentLabel]
                                : [];
                          return txs.length ? ` · ${txs.join(" + ")}` : "";
                        })()}
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                      {s.status === "active" ? "Ativo" : s.status === "completed" ? "Alta" : "Canc."}
                      {s.status === "active" && s.needsTransition ? " · Transição" : ""}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {tryoutClearances.length > 0 ? (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Liberação fisioterapêutica (try-out)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tryoutClearances.slice(0, 3).map((row) => (
                <div key={row.id} className="rounded-lg border border-border/60 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded border px-2 py-0.5 text-xs ${physioClearanceBadgeClass(
                        row.outcome === "aprovado"
                          ? "aprovado"
                          : row.outcome === "reprovado"
                            ? "reprovado"
                            : "pendente",
                      )}`}
                    >
                      {labelForPhysioClearanceStatus(
                        row.outcome === "aprovado"
                          ? "aprovado"
                          : row.outcome === "reprovado"
                            ? "reprovado"
                            : "pendente",
                      )}
                    </span>
                    <span className="text-muted-foreground">
                      {formatDateDayMonYear(row.evaluatedAt)}
                    </span>
                    {row.staffName ? (
                      <span className="text-muted-foreground">· {row.staffName}</span>
                    ) : null}
                  </div>
                  {canViewClinical && row.injuryHistory ? (
                    <p className="mt-1 text-muted-foreground">{row.injuryHistory}</p>
                  ) : null}
                  {canViewClinical && row.observations ? (
                    <p className="mt-1">{row.observations}</p>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Atendimentos de jogo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : gameAttendances.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Nenhum registro de jogo.</p>
            ) : (
              gameAttendances.slice(0, 8).map((row) => (
                <div key={row.id} className="rounded-lg border border-border/60 p-3 text-sm">
                  <p className="font-medium">
                    {formatDateDayMonYear(row.gameDate)}
                    {" · "}
                    {PHYSIO_GAME_PHASE_LABEL[row.phase] ?? row.phase}
                  </p>
                  <p className="text-muted-foreground">
                    {PHYSIO_GAME_CARE_CATEGORY_LABEL[row.careCategory] ?? row.careCategory}
                    {" · "}
                    {formatGameProcedureList(
                      row.procedures?.length
                        ? row.procedures
                        : [{ procedureKey: row.procedureKey, procedureLabel: row.procedureLabel }],
                    )}
                  </p>
                  <p className="text-muted-foreground">
                    {formatGameBodyLocationList(
                      row.bodyLocations?.length
                        ? row.bodyLocations
                        : [{ bodyLocation: row.bodyLocation, bodyLocationLabel: row.bodyLocationLabel }],
                    )}
                    {row.treatmentReason
                      ? ` · ${PHYSIO_GAME_TREATMENT_REASON_LABEL[row.treatmentReason] ?? row.treatmentReason}`
                      : ""}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Avaliações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : evaluations.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma avaliação registrada.</p>
            ) : (
              evaluations.slice(0, 8).map((ev) => (
                <div key={ev.id} className="rounded-lg border border-border/60 p-3 text-sm">
                  <p className="font-medium">
                    {PHYSIO_EVAL_CONTEXT_LABEL[ev.context] ?? ev.context}
                    {" · "}
                    {formatDateDayMonYear(ev.evaluatedAt)}
                  </p>
                  {ev.tests.slice(0, 5).map((t, i) => (
                    <p key={i} className="text-muted-foreground">
                      {t.protocol
                        ? PHYSIO_PERIODIC_PROTOCOL_LABEL[t.protocol] ?? t.protocol
                        : labelFromMap(PHYSIO_EVAL_TEST_TYPE_LABEL, t.testType, t.testTypeLabel)}
                      {!t.protocol ? (
                        <>
                          {" · "}
                          {labelFromMap(PHYSIO_EVAL_BODY_LOCATION_LABEL, t.bodyLocation, t.bodyLocationLabel)}
                        </>
                      ) : null}
                      {t.classification
                        ? ` · ${PHYSIO_PROTOCOL_CLASSIFICATION_LABEL[t.classification] ?? t.classification}`
                        : t.score
                          ? ` · ${t.score}`
                          : ""}
                    </p>
                  ))}
                  {ev.rating != null ? (
                    <p className="text-muted-foreground">Nota: {ev.rating}</p>
                  ) : null}
                  {ev.outcome ? (
                    <p className={ev.outcome === "reprovado" ? "text-destructive" : "text-emerald-400"}>
                      {PHYSIO_EVAL_OUTCOME_LABEL[ev.outcome] ?? ev.outcome}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
