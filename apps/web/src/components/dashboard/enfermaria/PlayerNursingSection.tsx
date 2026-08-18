"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NursingSession } from "@/types/enfermaria";
import { cn } from "@/lib/utils";
import { formatDateDayMonYear } from "@/lib/format-date";
import { formatNursingExemptFromTraining } from "@/lib/enfermaria-labels";

function formatDiagnoses(s: NursingSession) {
  return (s.sessionDiagnoses ?? [])
    .map((d) => d.diagnosisLabel ?? d.diagnosis?.name)
    .filter(Boolean)
    .join(" + ");
}

function formatTreatments(s: NursingSession) {
  return (s.sessionTreatments ?? [])
    .map((t) => t.treatmentLabel ?? t.treatment?.name)
    .filter(Boolean)
    .join(" + ");
}

export function PlayerNursingSection({
  playerId,
  tenantId,
}: {
  playerId: string;
  tenantId: string;
}) {
  const [sessions, setSessions] = useState<NursingSession[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<NursingSession[]>(
        `/enfermaria/sessions?playerId=${encodeURIComponent(playerId)}&status=all`,
      );
      setSessions(Array.isArray(data) ? data : []);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const active = sessions.filter((s) => s.status === "active");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Enfermaria</h2>
          <p className="text-sm text-muted-foreground">
            {active.length > 0
              ? `${active.length} atendimento(s) em andamento`
              : "Sem atendimentos ativos"}
          </p>
        </div>
        <Button asChild className="min-h-[44px]">
          <Link href={`/dashboard/saude/enfermaria/novo?playerId=${playerId}&tenantId=${tenantId}`}>
            <Plus className="mr-2 h-4 w-4" />
            Novo atendimento
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Histórico</CardTitle>
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
                href={`/dashboard/saude/enfermaria/${s.id}`}
                className={cn(
                  "block rounded-lg border p-3 hover:bg-muted/40",
                  s.status === "active" ? "border-amber-500/40" : "border-border/60",
                )}
              >
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="font-medium">{formatDateDayMonYear(s.attendedAt)}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDiagnoses(s) || "Sem diagnóstico"}
                      {formatTreatments(s) ? ` · ${formatTreatments(s)}` : ""}
                    </p>
                    {s.nurseName ? (
                      <p className="text-xs text-muted-foreground">Enfermeiro: {s.nurseName}</p>
                    ) : null}
                    {s.status === "active" && s.exemptFromTraining != null ? (
                      <p className="text-xs text-muted-foreground">
                        {formatNursingExemptFromTraining(s.exemptFromTraining)}
                      </p>
                    ) : null}
                  </div>
                  <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                    {s.status === "active" ? "Ativo" : s.status === "completed" ? "Alta" : "Canc."}
                  </span>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
