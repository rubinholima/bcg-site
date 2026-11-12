"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { timelineEventLabel } from "./finance-api-helpers";

type Event = {
  id: string;
  eventType: string;
  actorName?: string | null;
  createdAt: string;
  metadata?: unknown;
};

export function FinanceTimelinePanel({ tenantId, lancamentoId }: { tenantId: string; lancamentoId: string }) {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    if (!tenantId || !lancamentoId) return;
    void api
      .get<Event[]>(
        `/financeiro/lancamentos/${lancamentoId}/timeline?tenantId=${encodeURIComponent(tenantId)}`,
      )
      .then(({ data }) => setEvents(Array.isArray(data) ? data : []))
      .catch(() => setEvents([]));
  }, [tenantId, lancamentoId]);

  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>;
  }

  return (
    <ol className="space-y-2 border-l border-border/60 pl-3">
      {events.map((e) => (
        <li key={e.id} className="text-sm">
          <p className="font-medium text-foreground">{timelineEventLabel(e.eventType)}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(e.createdAt).toLocaleString("pt-BR")}
            {e.actorName ? ` · ${e.actorName}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}
