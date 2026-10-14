"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Clock,
  Loader2,
  Package,
  Ticket,
  UserCheck,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { BostonCityHallLogo } from "@/components/dashboard/boston-city-hall/BostonCityHallLogo";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useBchAppShellEvent } from "@/components/dashboard/boston-city-hall/bch-app-shell-event-context";
import { BCH_BASE } from "@/components/dashboard/boston-city-hall/bch-navigation.config";
import { bchEventSetupPath } from "@/components/dashboard/boston-city-hall/bch-event-setup-path";
import { bchEventDisplayName } from "@/components/dashboard/boston-city-hall/bch-operational-display";
import { BCH_BTN_PRIMARY, BCH_CARD } from "@/components/dashboard/boston-city-hall/bch-ui-classes";
import type {
  BchEventFinancialResult,
  EventTicketingDetail,
  TicketReportOverview,
  VenueOperationListItem,
} from "@/types/boston-city-hall";
import {
  EVENT_STATUS_LABEL,
  EVENT_TICKETING_SALES_STATUS_LABEL,
  formatTicketingMoney,
} from "@/types/boston-city-hall";
import { cn } from "@/lib/utils";

type EventCore = {
  id: string;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
};

function formatWhen(start: string | null, end: string | null): string {
  if (!start) return "Data a definir";
  const s = new Date(start);
  if (Number.isNaN(s.getTime())) return "—";
  const startStr = s.toLocaleString("pt-BR", { dateStyle: "full", timeStyle: "short" });
  if (!end) return startStr;
  const e = new Date(end);
  if (Number.isNaN(e.getTime()) || e.getTime() === s.getTime()) return startStr;
  return `${startStr} — ${e.toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" })}`;
}

function readinessFromTicketing(detail: EventTicketingDetail | null): { ok: boolean; summary: string } {
  if (!detail) return { ok: false, summary: "Ingressos não carregados" };
  if (!detail.ticketingEnabled) return { ok: true, summary: "Sem venda de ingressos" };
  const active = detail.types.filter((t) => t.active);
  if (active.length === 0) return { ok: false, summary: "Configure tipos ativos" };
  if (detail.capacityHint?.exceedsVenueCapacity) {
    return { ok: false, summary: detail.capacityHint.message ?? "Capacidade acima do venue" };
  }
  const onSale = active.some((t) => t.salesStatus === "on_sale");
  return {
    ok: true,
    summary: onSale ? "Vendas abertas" : EVENT_TICKETING_SALES_STATUS_LABEL[active[0]!.salesStatus],
  };
}

function AreaCard({
  title,
  icon: Icon,
  status,
  statusTone,
  children,
  href,
  hrefLabel,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  status?: string;
  statusTone?: "ok" | "warn" | "muted";
  children: React.ReactNode;
  href?: string;
  hrefLabel?: string;
}) {
  const toneClass =
    statusTone === "ok"
      ? "text-emerald-300"
      : statusTone === "warn"
        ? "text-amber-300"
        : "text-slate-400";

  return (
    <section className={cn(BCH_CARD, "flex flex-col gap-3")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 shrink-0 text-sky-400/90" aria-hidden />
          <h2 className="text-base font-semibold text-slate-50">{title}</h2>
        </div>
        {status ? <span className={cn("text-xs font-medium", toneClass)}>{status}</span> : null}
      </div>
      <div className="flex-1 text-sm text-slate-400">{children}</div>
      {href && hrefLabel ? (
        <Button asChild variant="outline" className="min-h-[44px] w-full border-slate-700 sm:w-auto">
          <Link href={href}>
            {hrefLabel}
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
          </Link>
        </Button>
      ) : null}
    </section>
  );
}

export function BostonCityHallEventCommandCenter({ eventId }: { eventId: string }) {
  const { setEventName } = useBchAppShellEvent();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<EventCore | null>(null);
  const [ticketing, setTicketing] = useState<EventTicketingDetail | null>(null);
  const [overview, setOverview] = useState<TicketReportOverview | null>(null);
  const [financial, setFinancial] = useState<BchEventFinancialResult | null>(null);
  const [booking, setBooking] = useState<VenueOperationListItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [evRes, tickRes, overviewRes, finRes, opsRes] = await Promise.all([
        api.get<EventCore>(`/events/${eventId}`),
        api.get<EventTicketingDetail>(`/boston-city-hall/ticketing/events/${eventId}`),
        api.get<TicketReportOverview>(
          `/boston-city-hall/ticketing/reports/overview?eventId=${encodeURIComponent(eventId)}`,
        ),
        api.get<BchEventFinancialResult>(`/boston-city-hall/events/${eventId}/financial-result`),
        api.get<VenueOperationListItem[]>("/boston-city-hall/operations"),
      ]);
      setEvent(evRes.data);
      setEventName(evRes.data.name);
      setTicketing(tickRes.data);
      setOverview(overviewRes.data ?? null);
      setFinancial(finRes.data ?? null);
      const ops = Array.isArray(opsRes.data) ? opsRes.data : [];
      setBooking(ops.find((o) => o.event?.id === eventId) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar o evento.");
      setEvent(null);
      setEventName(null);
    } finally {
      setLoading(false);
    }
  }, [eventId, setEventName]);

  useEffect(() => {
    void load();
    return () => setEventName(null);
  }, [load, setEventName]);

  const readiness = useMemo(() => readinessFromTicketing(ticketing), [ticketing]);

  const setupHref = useMemo(() => {
    const base = bchEventSetupPath(eventId);
    if (booking?.bookingId) return `${base}?bookingId=${encodeURIComponent(booking.bookingId)}`;
    return base;
  }, [booking?.bookingId, eventId]);

  const financeHref = useMemo(() => {
    const base = `${BCH_BASE}/eventos/${encodeURIComponent(eventId)}/financeiro`;
    if (booking?.bookingId) return `${base}?bookingId=${encodeURIComponent(booking.bookingId)}`;
    return base;
  }, [booking?.bookingId, eventId]);

  const ticketingHref = `${BCH_BASE}/ticketing?eventId=${encodeURIComponent(eventId)}`;
  const checkinHref = `${BCH_BASE}/ticketing?tab=checkin&eventId=${encodeURIComponent(eventId)}`;
  const barHref = `${BCH_BASE}/bar/event-inventory`;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-9 w-9 animate-spin text-sky-400/80" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className={cn(BCH_CARD, "mx-auto max-w-lg text-center")}>
        <p className="text-sm text-red-300">{error ?? "Evento não encontrado."}</p>
        <Button type="button" variant="outline" className="mt-4 min-h-[44px]" onClick={() => void load()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  const venueLabel = booking?.spaceName
    ? `${booking.title ? `${booking.title} · ` : ""}${booking.spaceName}`
    : booking?.title ?? "—";

  const currency = overview?.sales.currency ?? financial?.currencyHint ?? "USD";
  const sold = overview?.sales.ticketsSold ?? 0;
  const capacity = overview?.capacity.configured ?? 0;
  const checkedIn = overview?.tickets.checkedIn ?? 0;
  const revenue = overview
    ? formatTicketingMoney(overview.sales.grossAmount, overview.sales.currency)
    : "—";

  const primaryCurrency = financial?.currencies?.[0];
  const resultLabel = primaryCurrency?.operationalResult
    ? formatTicketingMoney(primaryCurrency.operationalResult, primaryCurrency.currency)
    : financial?.revenue.grossOperationalRevenue
      ? formatTicketingMoney(
          financial.revenue.grossOperationalRevenue,
          financial.currencyHint ?? undefined,
        )
      : "—";

  const soldPct =
    capacity > 0 ? Math.min(100, Math.round((sold / capacity) * 100)) : null;

  const timelineItems: { label: string; at: string }[] = [];
  if (booking?.startAt) timelineItems.push({ label: "Reserva · início", at: booking.startAt });
  if (event.startDate) timelineItems.push({ label: "Evento · início", at: event.startDate });
  if (event.endDate) timelineItems.push({ label: "Evento · término", at: event.endDate });
  if (booking?.endAt) timelineItems.push({ label: "Reserva · término", at: booking.endAt });

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <header
        className={cn(
          BCH_CARD,
          "overflow-hidden border-sky-500/15 bg-gradient-to-br from-[#0a1220] via-[#0c1018] to-[#070b12] p-0",
        )}
      >
        <div className="flex flex-col gap-4 p-4 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <BostonCityHallLogo size="lg" className="shrink-0 ring-1 ring-amber-500/30" />
            <div className="min-w-0 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-sky-400/80">
                Centro do evento
              </p>
              <h1 className="text-2xl font-semibold text-slate-50 sm:text-3xl">
                {bchEventDisplayName(event.name)}
              </h1>
              <p className="text-sm text-slate-400">{formatWhen(event.startDate, event.endDate)}</p>
              <p className="text-sm text-slate-400">
                <span className="text-slate-500">Espaço / reserva:</span> {venueLabel}
              </p>
              {booking ? (
                <Link
                  href={`${BCH_BASE}/operacao/${encodeURIComponent(booking.bookingId)}`}
                  className="inline-flex text-sm text-sky-300 hover:text-sky-200"
                >
                  Ver reserva operacional
                </Link>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-100">
              {EVENT_STATUS_LABEL[event.status] ?? event.status}
            </span>
            <Button asChild className={cn("min-h-[44px]", BCH_BTN_PRIMARY)}>
              <Link href={setupHref}>Preparar evento</Link>
            </Button>
          </div>
        </div>

        <div className="grid border-t border-slate-800/80 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <QuickStat label="Preparação" value={readiness.summary} href={setupHref} />
          <QuickStat label="Equipe" value="Em breve" href={`${BCH_BASE}/operacao`} muted />
          <QuickStat
            label="Bilheteria"
            value={
              ticketing?.ticketingEnabled
                ? soldPct != null
                  ? `${soldPct}% vendido`
                  : `${sold} vendidos`
                : "Desligada"
            }
            href={ticketingHref}
          />
          <QuickStat
            label="Check-in"
            value={checkedIn > 0 ? `${checkedIn} presentes` : "Sem entradas"}
            href={checkinHref}
          />
          <QuickStat
            label="Bar"
            value={
              financial?.revenue.bar.applicable
                ? formatTicketingMoney(
                    financial.revenue.bar.amount,
                    financial.revenue.bar.currency ?? currency,
                  )
                : "—"
            }
            href={barHref}
          />
          <QuickStat label="Resultado" value={resultLabel} href={financeHref} accent />
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[1fr_minmax(240px,280px)]">
        <div className="grid gap-4 md:grid-cols-2">
        <AreaCard
          title="Preparação"
          icon={Wrench}
          status={readiness.ok ? "Pronto" : "Atenção"}
          statusTone={readiness.ok ? "ok" : "warn"}
          href={setupHref}
          hrefLabel="Abrir preparação"
        >
          <p>{readiness.summary}</p>
          {ticketing?.capacityHint?.message ? (
            <p className="mt-2 text-xs text-amber-300/90">{ticketing.capacityHint.message}</p>
          ) : null}
        </AreaCard>

        <AreaCard title="Equipe e fornecedores" icon={Users} status="Indisponível" statusTone="muted">
          <p>Equipe, fornecedores e credenciais estarão disponíveis nesta área em uma próxima versão.</p>
        </AreaCard>

        <AreaCard
          title="Bilheteria"
          icon={Ticket}
          status={ticketing?.ticketingEnabled ? "Ativa" : "Desligada"}
          statusTone={ticketing?.ticketingEnabled ? "ok" : "muted"}
          href={ticketingHref}
          hrefLabel="Operar bilheteria"
        >
          <p>
            Vendidos: <span className="font-medium text-slate-200">{sold}</span>
            {capacity ? ` / ${capacity}` : ""}
          </p>
          <p className="mt-1">
            Receita: <span className="font-medium text-amber-200/90">{revenue}</span>
          </p>
        </AreaCard>

        <AreaCard
          title="Check-in"
          icon={UserCheck}
          status={checkedIn > 0 ? `${checkedIn} entrada(s)` : "Sem entradas"}
          statusTone={checkedIn > 0 ? "ok" : "muted"}
          href={checkinHref}
          hrefLabel="Abrir check-in"
        >
          <p>
            Emitidos ativos: {overview?.tickets.activeIssued ?? "—"} · No-show:{" "}
            {overview?.tickets.noShow ?? "—"}
          </p>
        </AreaCard>

        <AreaCard
          title="Bar e estoque"
          icon={Package}
          status={
            financial?.revenue.bar.applicable ? "Com movimento" : "Sem bar no evento"
          }
          statusTone={financial?.revenue.bar.applicable ? "ok" : "muted"}
          href={barHref}
          hrefLabel="Estoque de evento"
        >
          {financial?.revenue.bar.applicable ? (
            <>
              <p>
                Vendas POS: {financial.revenue.bar.salesCount ?? 0} · Receita bar:{" "}
                {formatTicketingMoney(
                  financial.revenue.bar.amount,
                  financial.revenue.bar.currency ?? currency,
                )}
              </p>
              {financial.revenue.bar.marginIncomplete ? (
                <p className="mt-2 text-xs text-amber-300/90">Custos de bar incompletos.</p>
              ) : null}
            </>
          ) : (
            <p>Bar não aplicável ou sem lançamentos para este evento.</p>
          )}
        </AreaCard>

        <AreaCard
          title="Resultado"
          icon={Wallet}
          status={primaryCurrency?.marginIncomplete ? "Custos parciais" : "Consolidado"}
          statusTone={primaryCurrency?.marginIncomplete ? "warn" : "ok"}
          href={financeHref}
          hrefLabel="Resultado financeiro"
        >
          <p>
            Resultado operacional:{" "}
            <span className="font-medium text-slate-100">{resultLabel}</span>
          </p>
          {financial?.completeness && !financial.completeness.resultComplete ? (
            <p className="mt-2 text-xs text-amber-300/90">
              Alguns custos ainda não foram lançados — margem pode estar incompleta.
            </p>
          ) : null}
        </AreaCard>
        </div>

        <aside className={cn(BCH_CARD, "h-fit xl:sticky xl:top-4")}>
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-sky-400/80" aria-hidden />
            <h2 className="text-sm font-semibold text-slate-100">Linha do tempo</h2>
          </div>
          {timelineItems.length === 0 ? (
            <p className="text-sm text-slate-500">Sem marcos de data cadastrados.</p>
          ) : (
            <ol className="space-y-3 border-l border-slate-800 pl-3">
              {timelineItems.map((item) => (
                <li key={`${item.label}-${item.at}`} className="relative">
                  <span className="absolute -left-[1.05rem] top-1.5 h-2 w-2 rounded-full bg-sky-500/80" />
                  <p className="text-xs font-medium text-slate-300">{item.label}</p>
                  <p className="text-xs text-slate-500">
                    {item.at
                      ? new Date(item.at).toLocaleString("pt-BR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "—"}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </div>
  );
}

function QuickStat({
  label,
  value,
  href,
  muted,
  accent,
}: {
  label: string;
  value: string;
  href: string;
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[76px] flex-col justify-center border-slate-800/80 px-4 py-3 transition-colors hover:bg-sky-500/5 sm:border-r xl:last:border-r-0 [&:not(:last-child)]:border-b sm:[&:not(:last-child)]:border-b-0 xl:[&:not(:last-child)]:border-b-0"
    >
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <span
        className={cn(
          "mt-1 truncate text-sm font-semibold",
          muted ? "text-slate-500" : accent ? "text-amber-200/95" : "text-slate-100",
        )}
      >
        {value}
      </span>
    </Link>
  );
}
