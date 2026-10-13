"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { bchOperationalEventList } from "@/components/dashboard/boston-city-hall/bch-operational-display";
import { useBchTicketingSelectionOptional } from "@/components/dashboard/boston-city-hall/bch-ticketing-selection-context";
import type { EventTicketingEventListItem } from "@/types/boston-city-hall";

export function useBchHubEventBinding() {
  const hub = useBchTicketingSelectionOptional();
  const [eventsLocal, setEventsLocal] = useState<EventTicketingEventListItem[]>([]);
  const [eventIdLocal, setEventIdLocal] = useState("");
  const [loadingLocal, setLoadingLocal] = useState(!hub);

  const loadLocal = useCallback(async () => {
    if (hub) return;
    setLoadingLocal(true);
    try {
      const res = await api.get<EventTicketingEventListItem[]>("/boston-city-hall/ticketing/events");
      const list = bchOperationalEventList(Array.isArray(res.data) ? res.data : []);
      setEventsLocal(list);
      setEventIdLocal((prev) => {
        if (prev && list.some((e) => e.id === prev)) return prev;
        return list[0]?.id ?? "";
      });
    } finally {
      setLoadingLocal(false);
    }
  }, [hub]);

  useEffect(() => {
    void loadLocal();
  }, [loadLocal]);

  if (hub) {
    return {
      events: hub.operationalEvents,
      eventId: hub.eventId,
      setEventId: hub.setEventId,
      loading: hub.loading,
      error: hub.error,
      rawCount: hub.rawEvents.length,
      smokeHiddenCount: hub.smokeHiddenCount,
      reload: hub.reload,
    };
  }

  return {
    events: eventsLocal,
    eventId: eventIdLocal,
    setEventId: setEventIdLocal,
    loading: loadingLocal,
    error: null as string | null,
    rawCount: eventsLocal.length,
    smokeHiddenCount: 0,
    reload: loadLocal,
  };
}
