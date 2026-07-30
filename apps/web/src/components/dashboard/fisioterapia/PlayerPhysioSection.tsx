"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhysioBodyMap } from "@/components/dashboard/fisioterapia/PhysioBodyMap";
import type { PhysioSession } from "@/types/fisioterapia";
import { cn } from "@/lib/utils";

export function PlayerPhysioSection({
  playerId,
  tenantId,
}: {
  playerId: string;
  tenantId: string;
}) {
  const [sessions, setSessions] = useState<PhysioSession[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<PhysioSession[]>(
        `/fisioterapia/sessions?playerId=${encodeURIComponent(playerId)}&status=all`,
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
                        {s.treatmentLabel ? ` · ${s.treatmentLabel}` : ""}
                      </p>
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
    </div>
  );
}
