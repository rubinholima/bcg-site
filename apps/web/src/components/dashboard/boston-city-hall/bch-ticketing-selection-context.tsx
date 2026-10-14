"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { BchTicketingEventsLoadState } from "@/components/dashboard/boston-city-hall/use-bch-ticketing-events";
import { useBchTicketingEvents } from "@/components/dashboard/boston-city-hall/use-bch-ticketing-events";

type Ctx = BchTicketingEventsLoadState & {
  eventId: string;
  setEventId: (id: string) => void;
};

const BchTicketingSelectionContext = createContext<Ctx | null>(null);

export function BchTicketingSelectionProvider({
  children,
  fixedEventId,
}: {
  children: React.ReactNode;
  /** Trava o evento (workspace) — não altera seleção pela URL do hub genérico. */
  fixedEventId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const eventsState = useBchTicketingEvents();
  const didAutoPickRef = useRef(false);

  const eventIdFromUrl = searchParams.get("eventId")?.trim() ?? "";
  const lockedId = fixedEventId?.trim() ?? "";

  const setEventId = useCallback(
    (id: string) => {
      if (lockedId) return;
      const p = new URLSearchParams(searchParams.toString());
      const next = id.trim();
      if (next) p.set("eventId", next);
      else p.delete("eventId");
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [lockedId, pathname, router, searchParams],
  );

  const eventId = useMemo(() => {
    if (lockedId) return lockedId;
    if (eventIdFromUrl && eventsState.operationalEvents.some((e) => e.id === eventIdFromUrl)) {
      return eventIdFromUrl;
    }
    if (eventIdFromUrl && eventsState.loading) return eventIdFromUrl;
    return eventsState.operationalEvents[0]?.id ?? "";
  }, [eventIdFromUrl, eventsState.loading, eventsState.operationalEvents, lockedId]);

  useEffect(() => {
    if (lockedId) return;
    if (eventsState.loading || eventsState.error) return;
    if (eventIdFromUrl) {
      if (!eventsState.operationalEvents.some((e) => e.id === eventIdFromUrl)) {
        if (eventsState.operationalEvents[0]?.id) {
          setEventId(eventsState.operationalEvents[0].id);
        }
      }
      return;
    }
    if (!didAutoPickRef.current && eventsState.operationalEvents[0]?.id) {
      didAutoPickRef.current = true;
      setEventId(eventsState.operationalEvents[0].id);
    }
  }, [
    eventIdFromUrl,
    eventsState.error,
    eventsState.loading,
    eventsState.operationalEvents,
    setEventId,
    lockedId,
  ]);

  const value = useMemo(
    () => ({
      ...eventsState,
      eventId,
      setEventId,
    }),
    [eventsState, eventId, setEventId],
  );

  return (
    <BchTicketingSelectionContext.Provider value={value}>{children}</BchTicketingSelectionContext.Provider>
  );
}

export function useBchTicketingSelectionOptional(): Ctx | null {
  return useContext(BchTicketingSelectionContext);
}

export function useBchTicketingSelection(): Ctx {
  const ctx = useContext(BchTicketingSelectionContext);
  if (!ctx) {
    throw new Error("useBchTicketingSelection deve ser usado dentro de BchTicketingSelectionProvider.");
  }
  return ctx;
}
