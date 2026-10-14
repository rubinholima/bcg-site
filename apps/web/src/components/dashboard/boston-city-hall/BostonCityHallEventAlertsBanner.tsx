"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { BchOperationalAlert } from "@/types/boston-city-hall";
import { Button } from "@/components/ui/button";

const BCH = "/dashboard/eventos/boston-city-hall";

export function BostonCityHallEventAlertsBanner({
  eventId,
  lazy = false,
  openCountHint,
}: {
  eventId: string;
  /** Quando true, só carrega se o pai solicitar montagem (ex.: aba Fechamento). */
  lazy?: boolean;
  openCountHint?: number;
}) {
  const [alerts, setAlerts] = useState<BchOperationalAlert[]>([]);
  const [loading, setLoading] = useState(!lazy);
  const [enabled, setEnabled] = useState(!lazy);

  useEffect(() => {
    if (lazy && !enabled) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [openRes, ackRes] = await Promise.all([
          api.get<BchOperationalAlert[]>(
            `/boston-city-hall/alerts?status=open&eventId=${encodeURIComponent(eventId)}`,
          ),
          api.get<BchOperationalAlert[]>(
            `/boston-city-hall/alerts?status=acknowledged&eventId=${encodeURIComponent(eventId)}`,
          ),
        ]);
        if (!cancelled) setAlerts([...(openRes.data ?? []), ...(ackRes.data ?? [])]);
      } catch {
        if (!cancelled) setAlerts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, eventId, lazy]);

  if (lazy && !enabled) {
    if ((openCountHint ?? 0) <= 0) return null;
    return (
      <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-100/90">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>{openCountHint} alerta(s) aberto(s) neste evento.</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[40px]"
            onClick={() => setEnabled(true)}
          >
            Ver alertas
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando alertas…
      </div>
    );
  }

  if (!alerts.length) return null;

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span>{alerts.length} alerta(s) operacional(is) ativo(s) neste evento.</span>
        <Button variant="outline" size="sm" className="min-h-[40px]" asChild>
          <Link href={`${BCH}/alerts?eventId=${encodeURIComponent(eventId)}`}>Ver alertas</Link>
        </Button>
      </div>
    </div>
  );
}
