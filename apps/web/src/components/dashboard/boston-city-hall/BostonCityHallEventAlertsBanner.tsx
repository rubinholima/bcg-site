"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { BchOperationalAlert } from "@/types/boston-city-hall";
import { Button } from "@/components/ui/button";

const BCH = "/dashboard/eventos/boston-city-hall";

export function BostonCityHallEventAlertsBanner({ eventId }: { eventId: string }) {
  const [alerts, setAlerts] = useState<BchOperationalAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await api.post("/boston-city-hall/alerts/evaluate", { eventId });
        const res = await api.get<BchOperationalAlert[]>(
          `/boston-city-hall/alerts?status=open&eventId=${encodeURIComponent(eventId)}`,
        );
        const ack = await api.get<BchOperationalAlert[]>(
          `/boston-city-hall/alerts?status=acknowledged&eventId=${encodeURIComponent(eventId)}`,
        );
        if (!cancelled) setAlerts([...res.data, ...ack.data]);
      } catch {
        if (!cancelled) setAlerts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Verificando alertas…
      </div>
    );
  }

  if (!alerts.length) return null;

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span>
          {alerts.length} alerta(s) operacional(is) ativo(s) neste evento.
        </span>
        <Button variant="outline" size="sm" className="min-h-[44px]" asChild>
          <Link href={`${BCH}/alerts?eventId=${encodeURIComponent(eventId)}`}>Ver alertas</Link>
        </Button>
      </div>
    </div>
  );
}
