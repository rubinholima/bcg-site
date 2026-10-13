"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  ExternalLink,
  Loader2,
  Plus,
  ShoppingCart,
  Ticket,
  Wallet,
} from "lucide-react";
import { api } from "@/lib/api";
import { getPublicImageUrl } from "@/lib/media-url";
import { Button } from "@/components/ui/button";
import { BchEventListDiagnostics } from "@/components/dashboard/boston-city-hall/BchEventListDiagnostics";
import { BostonCityHallCreateBchEventDialog } from "@/components/dashboard/boston-city-hall/BostonCityHallCreateBchEventDialog";
import { BchKpiCard } from "@/components/dashboard/boston-city-hall/BchKpiCard";
import { useBchTicketingSelection } from "@/components/dashboard/boston-city-hall/bch-ticketing-selection-context";
import { bchEventDisplayName } from "@/components/dashboard/boston-city-hall/bch-operational-display";
import { bchEventSetupPath } from "@/components/dashboard/boston-city-hall/bch-event-setup-path";
import {
  BCH_BTN_PRIMARY,
  BCH_BTN_SECONDARY,
  BCH_CARD,
} from "@/components/dashboard/boston-city-hall/bch-ui-classes";
import type { EventTicketingEventListItem, TicketReportOverview } from "@/types/boston-city-hall";
import { EVENT_STATUS_LABEL, formatTicketingMoney } from "@/types/boston-city-hall";
import { cn } from "@/lib/utils";

const PORTFOLIO_SLUG = "boston-city-hall";

export type BchTicketingHubTabId =
  | "overview"
  | "config"
  | "orders"
  | "complimentary"
  | "seating"
  | "checkin"
  | "reports"
  | "checkout";

type EventCardMeta = {
  overview: TicketReportOverview | null;
  logoUrl: string | null;
};

function formatEventWhen(ev: EventTicketingEventListItem): string {
  if (!ev.startDate) return "Data a definir";
  const start = new Date(ev.startDate);
  const end = ev.endDate ? new Date(ev.endDate) : null;
  const opts: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" };
  if (end && !Number.isNaN(end.getTime()) && end.getTime() !== start.getTime()) {
    return `${start.toLocaleString("pt-BR", opts)} — ${end.toLocaleString("pt-BR", opts)}`;
  }
  return start.toLocaleString("pt-BR", opts);
}

function publicEventHref(slug: string): string {
  return `/portfolio/${PORTFOLIO_SLUG}/events/${encodeURIComponent(slug)}?lang=pt`;
}

function publicCheckoutHref(slug: string): string {
  return `/portfolio/${PORTFOLIO_SLUG}/events/${encodeURIComponent(slug)}/checkout?lang=pt`;
}

export function BostonCityHallTicketSalesOverview({
  onNavigateTab,
}: {
  onNavigateTab: (tab: BchTicketingHubTabId, eventId?: string) => void;
}) {
  const {
    loading,
    error,
    operationalEvents,
    reload,
  } = useBchTicketingSelection();

  const [createOpen, setCreateOpen] = useState(false);
  const [metaById, setMetaById] = useState<Record<string, EventCardMeta>>({});
  const [metaLoading, setMetaLoading] = useState(false);
  const events = operationalEvents;

  const loadMeta = useCallback(async (list: EventTicketingEventListItem[]) => {
    if (!list.length) {
      setMetaById({});
      return;
    }
    setMetaLoading(true);
    try {
      const pairs = await Promise.all(
        list.map(async (ev) => {
          try {
            const [overviewRes, eventRes] = await Promise.all([
              api.get<TicketReportOverview>(
                `/boston-city-hall/ticketing/reports/overview?eventId=${encodeURIComponent(ev.id)}`,
              ),
              api.get<{ logoUrl?: string | null }>(`/events/${ev.id}`),
            ]);
            return [
              ev.id,
              {
                overview: overviewRes.data ?? null,
                logoUrl: eventRes.data?.logoUrl?.trim() || null,
              },
            ] as const;
          } catch {
            return [ev.id, { overview: null, logoUrl: null }] as const;
          }
        }),
      );
      setMetaById(Object.fromEntries(pairs));
    } finally {
      setMetaLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMeta(events);
  }, [loadMeta, events]);

  const aggregate = useMemo(() => {
    let revenue = 0;
    let currency = "USD";
    let sold = 0;
    let capacity = 0;
    let confirmedOrders = 0;
    for (const ev of events) {
      const o = metaById[ev.id]?.overview;
      if (!o) continue;
      currency = o.sales.currency || o.ticketing.currency || currency;
      revenue += Number(o.sales.grossAmount) || 0;
      sold += o.sales.ticketsSold ?? 0;
      capacity += o.capacity.configured ?? 0;
      confirmedOrders += o.orders.confirmed ?? 0;
    }
    return { revenue, currency, sold, capacity, confirmedOrders, eventCount: events.length };
  }, [metaById, events]);

  const showDiagnostics = !loading && (error || events.length === 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-slate-50">Eventos e vendas</h2>
        <Button
          type="button"
          className={cn("min-h-[44px] shrink-0 gap-2", BCH_BTN_PRIMARY)}
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Criar evento
        </Button>
      </div>

      {showDiagnostics ? (
        <BchEventListDiagnostics
          loading={loading}
          error={error}
          eventCount={events.length}
          onRetry={() => void reload()}
          onCreateEvent={() => setCreateOpen(true)}
        />
      ) : null}

      {!loading && events.length > 0 ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <BchKpiCard
              label="Eventos ativos"
              value={aggregate.eventCount}
              icon={Calendar}
              tone="gold"
            />
            <BchKpiCard
              label="Ingressos vendidos"
              value={
                metaLoading ? "…" : `${aggregate.sold}${aggregate.capacity ? ` / ${aggregate.capacity}` : ""}`
              }
              hint="Capacidade configurada nos tipos"
              icon={Ticket}
              tone="success"
            />
            <BchKpiCard
              label="Pedidos confirmados"
              value={metaLoading ? "…" : aggregate.confirmedOrders}
              icon={ShoppingCart}
              tone="info"
            />
            <BchKpiCard
              label="Receita bruta"
              value={
                metaLoading
                  ? "…"
                  : formatTicketingMoney(String(aggregate.revenue), aggregate.currency)
              }
              icon={Wallet}
              tone="gold"
            />
          </div>

          {metaLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-7 w-7 animate-spin text-amber-500/80" aria-hidden />
            </div>
          ) : (
            <ul className="grid gap-4 lg:grid-cols-2">
              {events.map((ev) => {
                const meta = metaById[ev.id];
                const overview = meta?.overview;
                const cover = meta?.logoUrl ? getPublicImageUrl(meta.logoUrl) : null;
                const pubLabel = EVENT_STATUS_LABEL[ev.status] ?? ev.status;
                const salesOn = ev.ticketingEnabled;
                const sold = overview?.sales.ticketsSold ?? 0;
                const cap = overview?.capacity.configured ?? 0;
                const revenue = overview
                  ? formatTicketingMoney(overview.sales.grossAmount, overview.sales.currency)
                  : "—";

                return (
                  <li key={ev.id} className={cn(BCH_CARD, "overflow-hidden p-0")}>
                    <div className="flex flex-col sm:flex-row">
                      <div className="relative h-40 w-full shrink-0 bg-gradient-to-br from-[#0a1628] to-[#1a2744] sm:h-auto sm:w-36">
                        {cover ? (
                          <Image
                            src={cover}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="144px"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full min-h-[8rem] items-center justify-center text-3xl font-semibold text-amber-500/40">
                            {bchEventDisplayName(ev.name).charAt(0).toUpperCase() || "?"}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-3 p-4 sm:p-5">
                        <div>
                          <h3 className="truncate text-base font-semibold text-slate-50">
                            {bchEventDisplayName(ev.name)}
                          </h3>
                          <p className="mt-0.5 text-xs text-slate-400">{formatEventWhen(ev)}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="rounded-md border border-slate-600/50 bg-slate-900/60 px-2 py-0.5 text-[11px] font-medium text-slate-200">
                              {pubLabel}
                            </span>
                            <span
                              className={cn(
                                "rounded-md border px-2 py-0.5 text-[11px] font-medium",
                                salesOn
                                  ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
                                  : "border-zinc-600 bg-zinc-800/60 text-zinc-400",
                              )}
                            >
                              {salesOn ? "Vendas habilitadas" : "Vendas desligadas"}
                            </span>
                          </div>
                        </div>
                        <dl className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <dt className="text-slate-500">Vendidos / capacidade</dt>
                            <dd className="font-semibold tabular-nums text-slate-100">
                              {sold}
                              {cap ? ` / ${cap}` : cap === 0 ? " / —" : ""}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">Receita</dt>
                            <dd className="font-semibold tabular-nums text-amber-200/90">{revenue}</dd>
                          </div>
                        </dl>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className={cn("min-h-[40px]", BCH_BTN_SECONDARY)}
                            asChild
                          >
                            <Link href={bchEventSetupPath(ev.id)}>Preparar</Link>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="min-h-[40px] border-slate-700"
                            onClick={() => onNavigateTab("config", ev.id)}
                          >
                            Ingressos
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="min-h-[40px] border-slate-700"
                            onClick={() => onNavigateTab("orders", ev.id)}
                          >
                            Pedidos
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="min-h-[40px] border-slate-700"
                            onClick={() => onNavigateTab("checkin", ev.id)}
                          >
                            Check-in
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="min-h-[40px] gap-1 text-amber-300/90 hover:text-amber-200"
                            asChild
                          >
                            <Link href={publicEventHref(ev.slug)} target="_blank" rel="noopener noreferrer">
                              Prévia
                              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                            </Link>
                          </Button>
                          {salesOn ? (
                            <Button
                              type="button"
                              size="sm"
                              className={cn("min-h-[40px]", BCH_BTN_PRIMARY)}
                              asChild
                            >
                              <Link
                                href={publicCheckoutHref(ev.slug)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Comprar (público)
                              </Link>
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : null}

      <BostonCityHallCreateBchEventDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => void reload()}
      />
    </div>
  );
}
