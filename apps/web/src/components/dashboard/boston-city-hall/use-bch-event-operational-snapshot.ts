"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { BCH_BASE } from "@/components/dashboard/boston-city-hall/bch-navigation.config";
import { bchEventSetupPath } from "@/components/dashboard/boston-city-hall/bch-event-setup-path";
import type {
  BchEventFinancialResult,
  EventTicketingDetail,
  TicketReportOverview,
  VenueOperationListItem,
} from "@/types/boston-city-hall";
import { EVENT_TICKETING_SALES_STATUS_LABEL } from "@/types/boston-city-hall";

export type BchEventSnapshot = {
  id: string;
  name: string;
  slug: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  logoUrl: string | null;
  locationLabel: string | null;
};

export function readinessFromTicketing(
  detail: EventTicketingDetail | null,
): { ok: boolean; summary: string } {
  if (!detail) return { ok: false, summary: "Dados indisponíveis" };
  if (!detail.ticketingEnabled) return { ok: true, summary: "Sem bilheteria ativa" };
  const active = detail.types.filter((t) => t.active);
  if (active.length === 0) return { ok: false, summary: "Tipos de ingresso pendentes" };
  if (detail.capacityHint?.exceedsVenueCapacity) {
    return { ok: false, summary: detail.capacityHint.message ?? "Capacidade acima do venue" };
  }
  const onSale = active.some((t) => t.salesStatus === "on_sale");
  return {
    ok: true,
    summary: onSale ? "Vendas abertas" : EVENT_TICKETING_SALES_STATUS_LABEL[active[0]!.salesStatus],
  };
}

function locationFromContent(content: unknown): string | null {
  if (!content || typeof content !== "object") return null;
  const c = content as Record<string, unknown>;
  const loc = c.locationLabel ?? c.location ?? c.venue;
  return typeof loc === "string" && loc.trim() ? loc.trim() : null;
}

export function useBchEventOperationalSnapshot(eventId: string | null) {
  const [loading, setLoading] = useState(Boolean(eventId));
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<BchEventSnapshot | null>(null);
  const [ticketing, setTicketing] = useState<EventTicketingDetail | null>(null);
  const [overview, setOverview] = useState<TicketReportOverview | null>(null);
  const [financial, setFinancial] = useState<BchEventFinancialResult | null>(null);
  const [booking, setBooking] = useState<VenueOperationListItem | null>(null);

  const load = useCallback(async () => {
    if (!eventId) {
      setEvent(null);
      setTicketing(null);
      setOverview(null);
      setFinancial(null);
      setBooking(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [evRes, tickRes, overviewRes, finRes, opsRes] = await Promise.all([
        api.get<{
          id: string;
          name: string;
          slug: string;
          status: string;
          startDate: string | null;
          endDate: string | null;
          logoUrl: string | null;
          content?: unknown;
        }>(`/events/${eventId}`),
        api.get<EventTicketingDetail>(`/boston-city-hall/ticketing/events/${eventId}`),
        api.get<TicketReportOverview>(
          `/boston-city-hall/ticketing/reports/overview?eventId=${encodeURIComponent(eventId)}`,
        ),
        api.get<BchEventFinancialResult>(`/boston-city-hall/events/${eventId}/financial-result`),
        api.get<VenueOperationListItem[]>("/boston-city-hall/operations"),
      ]);
      const ev = evRes.data;
      setEvent({
        id: ev.id,
        name: ev.name,
        slug: ev.slug,
        status: ev.status,
        startDate: ev.startDate,
        endDate: ev.endDate,
        logoUrl: ev.logoUrl,
        locationLabel: locationFromContent(ev.content),
      });
      setTicketing(tickRes.data);
      setOverview(overviewRes.data ?? null);
      setFinancial(finRes.data ?? null);
      const ops = Array.isArray(opsRes.data) ? opsRes.data : [];
      setBooking(ops.find((o) => o.event?.id === eventId) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar o evento.");
      setEvent(null);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  const readiness = useMemo(() => readinessFromTicketing(ticketing), [ticketing]);

  const links = useMemo(() => {
    if (!eventId) {
      return {
        workspace: `${BCH_BASE}/eventos`,
        setup: BCH_BASE,
        ticketing: `${BCH_BASE}/ticketing`,
        checkin: `${BCH_BASE}/ticketing?tab=checkin`,
        barInventory: `${BCH_BASE}/bar/event-inventory`,
        barPos: `${BCH_BASE}/bar/pos`,
        finance: `${BCH_BASE}/financeiro`,
        operation: `${BCH_BASE}/operacao`,
        reservas: `${BCH_BASE}/reservas`,
        closing: `${BCH_BASE}/bar/close`,
      };
    }
    const setupBase = bchEventSetupPath(eventId);
    const setup =
      booking?.bookingId != null
        ? `${setupBase}?bookingId=${encodeURIComponent(booking.bookingId)}`
        : setupBase;
    const financeBase = `${BCH_BASE}/eventos/${encodeURIComponent(eventId)}/financeiro`;
    const finance =
      booking?.bookingId != null
        ? `${financeBase}?bookingId=${encodeURIComponent(booking.bookingId)}`
        : financeBase;
    return {
      workspace: `${BCH_BASE}/eventos/${encodeURIComponent(eventId)}`,
      setup,
      ticketing: `${BCH_BASE}/ticketing?eventId=${encodeURIComponent(eventId)}`,
      checkin: `${BCH_BASE}/ticketing?tab=checkin&eventId=${encodeURIComponent(eventId)}`,
      barInventory: `${BCH_BASE}/bar/event-inventory`,
      barPos: `${BCH_BASE}/bar/pos`,
      finance,
      operation: booking?.bookingId
        ? `${BCH_BASE}/operacao/${encodeURIComponent(booking.bookingId)}`
        : `${BCH_BASE}/operacao`,
      reservas: booking?.bookingId
        ? `${BCH_BASE}/reservas?edit=${encodeURIComponent(booking.bookingId)}`
        : `${BCH_BASE}/reservas`,
      closing: `${BCH_BASE}/bar/close`,
    };
  }, [booking?.bookingId, eventId]);

  return {
    loading,
    error,
    event,
    ticketing,
    overview,
    financial,
    booking,
    readiness,
    links,
    reload: load,
  };
}
