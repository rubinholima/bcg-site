"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { EventTicketingEventListItem } from "@/types/boston-city-hall";

export type BchTicketingEventsLoadState = {
  loading: boolean;
  error: string | null;
  rawEvents: EventTicketingEventListItem[];
  /** Alias de rawEvents — todos os eventos do tenant visíveis na operação. */
  operationalEvents: EventTicketingEventListItem[];
  reload: () => void;
};

export function useBchTicketingEvents(): BchTicketingEventsLoadState {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawEvents, setRawEvents] = useState<EventTicketingEventListItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<EventTicketingEventListItem[]>("/boston-city-hall/ticketing/events");
      setRawEvents(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar eventos do venue.");
      setRawEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const operationalEvents = useMemo(() => rawEvents, [rawEvents]);

  return {
    loading,
    error,
    rawEvents,
    operationalEvents,
    reload: load,
  };
}
