"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MedicalDeparture } from "@/types/medical-departure";
import {
  MEDICAL_DEPARTURE_CARE_TYPE_LABEL,
  MEDICAL_DEPARTURE_STATUS_LABEL,
  MEDICAL_DEPARTURE_TRANSPORT_LABEL,
  formatMedicalDepartureDateTime,
} from "@/lib/medical-departure-labels";
import { cn } from "@/lib/utils";
import { getPublicImageUrl } from "@/lib/media-url";

export function PlayerMedicalDeparturesSection({
  playerId,
  tenantId,
}: {
  playerId: string;
  tenantId: string;
}) {
  const [rows, setRows] = useState<MedicalDeparture[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<MedicalDeparture[]>(
        `/medical-departures?playerId=${encodeURIComponent(playerId)}&status=all`,
      );
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const active = rows.filter((r) => r.status === "programada" || r.status === "em_atendimento");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Saídas médicas</h2>
          <p className="text-sm text-muted-foreground">
            {active.length > 0
              ? `${active.length} saída(s) em aberto`
              : "Sem saídas em aberto"}
          </p>
        </div>
        <Button asChild className="min-h-[44px]">
          <Link
            href={`/dashboard/medico/saidas/novo?playerId=${playerId}&tenantId=${tenantId}`}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova saída
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
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma saída registrada.</p>
          ) : (
            rows.map((r) => (
              <Link
                key={r.id}
                href={`/dashboard/medico/saidas/${r.id}`}
                className={cn(
                  "block rounded-lg border p-3 hover:bg-muted/40",
                  r.status === "programada" || r.status === "em_atendimento"
                    ? "border-amber-500/40"
                    : "border-border/60",
                )}
              >
                <div className="flex justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {MEDICAL_DEPARTURE_CARE_TYPE_LABEL[r.careType] ?? r.careType}
                      {" · "}
                      {r.destination}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Saída: {formatMedicalDepartureDateTime(r.departedAt)}
                      {r.returnedAt ? ` · Retorno: ${formatMedicalDepartureDateTime(r.returnedAt)}` : ""}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">{r.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      {MEDICAL_DEPARTURE_TRANSPORT_LABEL[r.transportMode] ?? r.transportMode}
                      {r.companionName ? ` · ${r.companionName}` : ""}
                      {(r.documents?.length ?? 0) > 0 ? ` · ${r.documents!.length} doc(s)` : ""}
                    </p>
                    {r.careSummary ? (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.careSummary}</p>
                    ) : null}
                  </div>
                  <span className="text-[11px] font-semibold uppercase text-muted-foreground shrink-0">
                    {MEDICAL_DEPARTURE_STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </div>
                {(r.documents?.length ?? 0) > 0 ? (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {r.documents!.map((d) => (
                      <li key={d.id}>
                        <a
                          href={getPublicImageUrl(d.fileUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {d.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
