"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { BCH_BASE } from "@/components/dashboard/boston-city-hall/bch-navigation.config";
import { bchEventSetupPath } from "@/components/dashboard/boston-city-hall/bch-event-setup-path";
import type {
  BchEventFinancialResult,
  BchEventWorkspace,
  EventTicketingDetail,
  TicketReportOverview,
  VenueOperationDetail,
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
  startAt: string | null;
  endAt: string | null;
  logoUrl: string | null;
  locationLabel: string | null;
  description: string | null;
  category: string;
};

export type BchWorkspaceSection =
  | "resumo"
  | "planejamento"
  | "equipe"
  | "bilheteria"
  | "bar"
  | "financeiro"
  | "fechamento";

export function readinessFromTicketing(
  detail: EventTicketingDetail | null,
  ticketingEnabled?: boolean,
): { ok: boolean; summary: string } {
  if (ticketingEnabled === false) return { ok: true, summary: "Bilheteria não aplicável" };
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

function mapWorkspaceEvent(ws: BchEventWorkspace): BchEventSnapshot {
  return {
    id: ws.event.id,
    name: ws.event.name,
    slug: ws.event.slug,
    status: ws.event.status,
    startDate: ws.event.startDate,
    endDate: ws.event.endDate,
    startAt: ws.event.startAt,
    endAt: ws.event.endAt,
    logoUrl: ws.event.logoUrl,
    locationLabel: ws.event.locationLabel,
    description: ws.event.description,
    category: ws.event.category,
  };
}

function overviewFromWorkspace(ws: BchEventWorkspace): TicketReportOverview | null {
  const k = ws.ticketKpis;
  if (!k.applicable) return null;
  const currency = k.currency ?? ws.ticketing.currency ?? "USD";
  return {
    event: {
      id: ws.event.id,
      name: ws.event.name,
      startDate: ws.event.startAt,
      endDate: ws.event.endAt,
      status: ws.event.status,
    },
    ticketing: {
      enabled: ws.ticketing.enabled,
      currency,
      seatingEnabled: false,
    },
    capacity: {
      configured: k.capacityConfigured ?? 0,
      consumed: k.ticketsSold,
      held: 0,
      remaining: k.capacityConfigured != null ? Math.max(0, k.capacityConfigured - k.ticketsSold) : 0,
      committed: k.ticketsSold,
    },
    orders: { total: 0, confirmed: 0, pending: 0, cancelled: 0, expired: 0 },
    sales: {
      currency,
      ticketsSold: k.ticketsSold,
      grossAmount: k.grossAmount ?? "0",
      confirmedOrders: 0,
      averageOrderValue: null,
      averagePaidTicketValue: null,
    },
    tickets: {
      paidIssued: k.ticketsSold,
      complimentaryIssued: 0,
      activeIssued: k.ticketsSold,
      checkedIn: k.checkedIn,
      noShow: 0,
      paidNoShow: 0,
      complimentaryNoShow: 0,
      cancelled: 0,
      occupancyPercent: 0,
    },
    financeReconciliation: { confirmedOrdersWithProjection: 0, note: "" },
  };
}

export function useBchEventOperationalSnapshot(eventId: string | null) {
  const [coreLoading, setCoreLoading] = useState(Boolean(eventId));
  const [coreError, setCoreError] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<BchEventWorkspace | null>(null);

  const [ticketing, setTicketing] = useState<EventTicketingDetail | null>(null);
  const [ticketingError, setTicketingError] = useState<string | null>(null);
  const [overview, setOverview] = useState<TicketReportOverview | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [financial, setFinancial] = useState<BchEventFinancialResult | null>(null);
  const [financialError, setFinancialError] = useState<string | null>(null);
  const [operationDetail, setOperationDetail] = useState<VenueOperationDetail | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);

  const loadedTabs = useRef(new Set<string>());

  const loadCore = useCallback(async () => {
    if (!eventId) {
      setWorkspace(null);
      setCoreError(null);
      setCoreLoading(false);
      loadedTabs.current.clear();
      setTicketing(null);
      setOverview(null);
      setFinancial(null);
      setOperationDetail(null);
      return;
    }
    setCoreLoading(true);
    setCoreError(null);
    try {
      const { data } = await api.get<BchEventWorkspace>(
        `/boston-city-hall/events/${encodeURIComponent(eventId)}/workspace`,
      );
      setWorkspace(data);
      setOverview(overviewFromWorkspace(data));
    } catch (e) {
      setCoreError(e instanceof Error ? e.message : "Não foi possível carregar o evento.");
      setWorkspace(null);
      setOverview(null);
    } finally {
      setCoreLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadedTabs.current.clear();
    setTicketing(null);
    setFinancial(null);
    setOperationDetail(null);
    void loadCore();
  }, [loadCore]);

  const ensureSectionData = useCallback(
    async (section: BchWorkspaceSection) => {
      if (!eventId || !workspace) return;
      const key = section;
      if (loadedTabs.current.has(key)) return;

      if (section === "resumo") {
        loadedTabs.current.add(key);
        if (!financial) {
          try {
            const { data } = await api.get<BchEventFinancialResult>(
              `/boston-city-hall/events/${encodeURIComponent(eventId)}/financial-result`,
            );
            setFinancial(data);
            setFinancialError(null);
          } catch (e) {
            setFinancialError(e instanceof Error ? e.message : "Resultado financeiro indisponível.");
          }
        }
        return;
      }

      if (section === "planejamento" || section === "equipe") {
        loadedTabs.current.add(key);
        const jobs: Promise<void>[] = [];
        if (!ticketing && section === "planejamento") {
          jobs.push(
            api
              .get<EventTicketingDetail>(`/boston-city-hall/ticketing/events/${encodeURIComponent(eventId)}`)
              .then(({ data }) => {
                setTicketing(data);
                setTicketingError(null);
              })
              .catch((e) => {
                setTicketingError(e instanceof Error ? e.message : "Bilheteria indisponível.");
              }),
          );
        }
        if (!operationDetail && workspace.booking) {
          jobs.push(
            api
              .get<VenueOperationDetail | null>(
                `/boston-city-hall/operations/by-event/${encodeURIComponent(eventId)}`,
              )
              .then(({ data }) => {
                setOperationDetail(data ?? null);
                setOperationError(null);
              })
              .catch((e) => {
                setOperationError(e instanceof Error ? e.message : "Operação indisponível.");
              }),
          );
        }
        await Promise.all(jobs);
        return;
      }

      if (section === "bilheteria") {
        loadedTabs.current.add(key);
        const jobs: Promise<void>[] = [];
        if (!ticketing) {
          jobs.push(
            api
              .get<EventTicketingDetail>(`/boston-city-hall/ticketing/events/${encodeURIComponent(eventId)}`)
              .then(({ data }) => {
                setTicketing(data);
                setTicketingError(null);
              })
              .catch((e) => {
                setTicketingError(e instanceof Error ? e.message : "Bilheteria indisponível.");
              }),
          );
        }
        if (!overview || overview.sales.confirmedOrders === 0) {
          jobs.push(
            api
              .get<TicketReportOverview>(
                `/boston-city-hall/ticketing/reports/overview?eventId=${encodeURIComponent(eventId)}`,
              )
              .then(({ data }) => {
                setOverview(data);
                setOverviewError(null);
              })
              .catch((e) => {
                setOverviewError(e instanceof Error ? e.message : "Relatório de vendas indisponível.");
              }),
          );
        }
        await Promise.all(jobs);
        return;
      }

      if (section === "financeiro") {
        loadedTabs.current.add(key);
        if (!financial) {
          try {
            const { data } = await api.get<BchEventFinancialResult>(
              `/boston-city-hall/events/${encodeURIComponent(eventId)}/financial-result`,
            );
            setFinancial(data);
            setFinancialError(null);
          } catch (e) {
            setFinancialError(e instanceof Error ? e.message : "Resultado financeiro indisponível.");
          }
        }
        return;
      }

      loadedTabs.current.add(key);
    },
    [eventId, financial, operationDetail, overview, ticketing, workspace],
  );

  const event = useMemo(() => (workspace ? mapWorkspaceEvent(workspace) : null), [workspace]);
  const booking = workspace?.booking ?? null;

  const readiness = useMemo(() => {
    if (workspace?.readiness?.length) {
      const pending = workspace.readiness.filter((r) => !r.ok);
      return {
        ok: pending.length === 0,
        summary: pending[0]?.label ?? "Pronto para operação",
      };
    }
    return readinessFromTicketing(ticketing, workspace?.ticketing.enabled);
  }, [workspace, ticketing]);

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
    const workspaceUrl = `${BCH_BASE}/eventos/${encodeURIComponent(eventId)}`;
    const setupBase = bchEventSetupPath(eventId);
    return {
      workspace: workspaceUrl,
      setup: `${setupBase}?returnTo=${encodeURIComponent(workspaceUrl)}`,
      ticketing: `${workspaceUrl}?sec=bilheteria`,
      checkin: `${workspaceUrl}?sec=bilheteria&tab=checkin`,
      barInventory: `${workspaceUrl}?sec=bar&barTab=inventory`,
      barPos: `${workspaceUrl}?sec=bar&barTab=pos`,
      finance: `${workspaceUrl}?sec=financeiro`,
      operation: booking?.bookingId
        ? `${BCH_BASE}/operacao/${encodeURIComponent(booking.bookingId)}?returnTo=${encodeURIComponent(workspaceUrl)}`
        : `${BCH_BASE}/operacao`,
      reservas: booking?.bookingId
        ? `${BCH_BASE}/reservas?edit=${encodeURIComponent(booking.bookingId)}`
        : `${BCH_BASE}/reservas`,
      closing: `${workspaceUrl}?sec=fechamento`,
    };
  }, [booking?.bookingId, eventId]);

  return {
    loading: coreLoading,
    error: coreError,
    event,
    workspace,
    ticketing,
    ticketingError,
    overview,
    overviewError,
    financial,
    financialError,
    operationDetail,
    operationError,
    booking,
    readiness,
    links,
    reload: loadCore,
    ensureSectionData,
  };
}
