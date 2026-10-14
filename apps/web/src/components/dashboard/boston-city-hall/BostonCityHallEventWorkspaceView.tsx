"use client";

import Link from "next/link";
import {
  ArrowRight,
  Loader2,
  Package,
  Ticket,
  UserCheck,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { BchOperationalActionCard } from "@/components/dashboard/boston-city-hall/BchOperationalActionCard";
import { bchEventDisplayName } from "@/components/dashboard/boston-city-hall/bch-operational-display";
import type { useBchEventOperationalSnapshot } from "@/components/dashboard/boston-city-hall/use-bch-event-operational-snapshot";
import { BCH_BASE } from "@/components/dashboard/boston-city-hall/bch-navigation.config";
import { BCH_BTN_PRIMARY, BCH_CARD } from "@/components/dashboard/boston-city-hall/bch-ui-classes";
import { BostonCityHallLogo } from "@/components/dashboard/boston-city-hall/BostonCityHallLogo";
import { Button } from "@/components/ui/button";
import { getPublicImageUrl } from "@/lib/media-url";
import { EVENT_STATUS_LABEL, formatTicketingMoney } from "@/types/boston-city-hall";
import { cn } from "@/lib/utils";

type Snapshot = ReturnType<typeof useBchEventOperationalSnapshot>;

function formatEventRange(start: string | null, end: string | null): string {
  if (!start) return "Data a definir";
  const s = new Date(start);
  if (Number.isNaN(s.getTime())) return "—";
  const startPart = s.toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });
  if (!end) return startPart;
  const e = new Date(end);
  if (Number.isNaN(e.getTime())) return startPart;
  return `${startPart} — ${e.toLocaleString("pt-BR", { timeStyle: "short" })}`;
}

function dateBadge(start: string | null): { weekday: string; day: string; month: string } | null {
  if (!start) return null;
  const d = new Date(start);
  if (Number.isNaN(d.getTime())) return null;
  return {
    weekday: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").toUpperCase(),
    day: d.toLocaleDateString("pt-BR", { day: "2-digit" }),
    month: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase(),
  };
}

export function BostonCityHallEventWorkspaceView({
  snapshot,
}: {
  snapshot: Snapshot;
}) {
  const { loading, error, event, ticketing, overview, financial, booking, readiness, links, reload } =
    snapshot;

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-sky-400/80" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className={cn(BCH_CARD, "mx-auto max-w-lg text-center")}>
        <p className="text-sm text-red-300">{error ?? "Evento não encontrado."}</p>
        <Button type="button" variant="outline" className="mt-4 min-h-[44px]" onClick={() => void reload()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  const heroImage = event.logoUrl ? getPublicImageUrl(event.logoUrl) : null;
  const badge = dateBadge(event.startDate);
  const venueLine =
    booking?.spaceName?.trim() ||
    event.locationLabel?.trim() ||
    (booking?.title ? booking.title : null);

  const currency = overview?.sales.currency ?? financial?.currencyHint ?? "USD";
  const sold = overview?.sales.ticketsSold ?? 0;
  const capacity = overview?.capacity.configured ?? 0;
  const soldPct = capacity > 0 ? Math.min(100, Math.round((sold / capacity) * 100)) : null;
  const checkedIn = overview?.tickets.checkedIn ?? 0;
  const activeIssued = overview?.tickets.activeIssued ?? 0;
  const revenue = overview
    ? formatTicketingMoney(overview.sales.grossAmount, overview.sales.currency)
    : null;
  const primaryCurrency = financial?.currencies?.[0];
  const resultLabel = primaryCurrency?.operationalResult
    ? formatTicketingMoney(primaryCurrency.operationalResult, primaryCurrency.currency)
    : financial?.revenue.grossOperationalRevenue
      ? formatTicketingMoney(
          financial.revenue.grossOperationalRevenue,
          financial.currencyHint ?? undefined,
        )
      : null;

  return (
    <div className="w-full space-y-5">
      <section className="overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0a101c] shadow-lg shadow-black/20">
        <div className="grid lg:grid-cols-[minmax(140px,200px)_1fr]">
          <div className="relative min-h-[180px] border-b border-slate-800/80 bg-[#070b12] lg:min-h-[220px] lg:border-b-0 lg:border-r">
            {heroImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-sky-950/40 via-[#0c1222] to-[#070b12]">
                <BostonCityHallLogo size="lg" className="opacity-90 ring-1 ring-amber-500/25" />
              </div>
            )}
            {badge ? (
              <div className="absolute left-3 top-3 rounded-lg border border-slate-700/80 bg-black/55 px-2.5 py-2 text-center backdrop-blur-sm">
                <p className="text-[10px] font-semibold text-sky-300">{badge.weekday}</p>
                <p className="text-xl font-bold leading-none text-white">{badge.day}</p>
                <p className="text-[10px] font-medium text-slate-400">{badge.month}</p>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col justify-between gap-4 p-4 sm:p-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-sky-400/80">
                Centro do evento
              </p>
              <h1 className="text-2xl font-semibold text-slate-50 sm:text-3xl">
                {bchEventDisplayName(event.name)}
              </h1>
              <p className="text-sm text-slate-400">{formatEventRange(event.startDate, event.endDate)}</p>
              <p className="text-sm text-slate-400">
                <span className="text-slate-500">Espaço / reserva:</span> {venueLine ?? "—"}
              </p>
              {capacity > 0 ? (
                <p className="text-sm text-slate-400">
                  <span className="text-slate-500">Capacidade:</span> {capacity}
                </p>
              ) : null}
              {booking ? (
                <Link
                  href={links.reservas}
                  className="inline-flex text-sm text-sky-300 hover:text-sky-200"
                >
                  Ver reserva
                </Link>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                {EVENT_STATUS_LABEL[event.status] ?? event.status}
              </span>
              <Button asChild className={cn("min-h-[44px]", BCH_BTN_PRIMARY)}>
                <Link href={links.setup}>Preparar evento</Link>
              </Button>
              <Button asChild variant="outline" className="min-h-[44px] border-slate-700 bg-slate-900/40">
                <Link href={`${BCH_BASE}/eventos`}>Todos os eventos</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <BchOperationalActionCard
          title="Preparação"
          subtitle="Setup e ingressos"
          metric={readiness.summary}
          href={links.setup}
          actionLabel="Abrir preparação"
          icon={Wrench}
          accent="emerald"
        />
        <BchOperationalActionCard
          title="Equipe"
          subtitle="Operação e turnos"
          metric={booking ? "Reserva vinculada" : null}
          metricHint={booking ? undefined : "Em breve"}
          href={links.operation}
          actionLabel="Ver operação"
          icon={Users}
          accent="sky"
        />
        <BchOperationalActionCard
          title="Bilheteria"
          subtitle="Vendas e ingressos"
          metric={
            ticketing?.ticketingEnabled
              ? soldPct != null
                ? `${soldPct}% vendido`
                : `${sold} vendidos`
              : "Desligada"
          }
          metricHint={revenue ? `Receita ${revenue}` : undefined}
          href={links.ticketing}
          actionLabel="Operar bilheteria"
          icon={Ticket}
          accent="violet"
        />
        <BchOperationalActionCard
          title="Check-in"
          subtitle="Entrada e público"
          metric={checkedIn > 0 ? `${checkedIn} presentes` : activeIssued > 0 ? `${activeIssued} emitidos` : null}
          href={links.checkin}
          actionLabel="Abrir check-in"
          icon={UserCheck}
          accent="cyan"
        />
        <BchOperationalActionCard
          title="Bar e estoque"
          subtitle="POS e inventário"
          metric={
            financial?.revenue.bar.applicable
              ? formatTicketingMoney(
                  financial.revenue.bar.amount,
                  financial.revenue.bar.currency ?? currency,
                )
              : null
          }
          metricHint={
            financial?.revenue.bar.applicable ? "Receita de bar" : "Sem movimento registrado"
          }
          href={links.barInventory}
          actionLabel="Estoque do evento"
          icon={Package}
          accent="amber"
        />
        <BchOperationalActionCard
          title="Resultado"
          subtitle="Receitas e custos do evento"
          metric={resultLabel}
          metricHint={
            financial?.completeness && !financial.completeness.resultComplete
              ? "Custos parciais"
              : undefined
          }
          href={links.finance}
          actionLabel="Resultado financeiro"
          icon={Wallet}
          accent="gold"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <DetailCard title="Preparação" href={links.setup} action="Abrir setup">
          <p>{readiness.summary}</p>
        </DetailCard>
        <DetailCard title="Bilheteria" href={links.ticketing} action="Vender">
          {ticketing?.ticketingEnabled ? (
            <>
              <p className="text-lg font-semibold tabular-nums text-slate-50">
                {sold}
                {capacity ? ` / ${capacity}` : ""}
              </p>
              {revenue ? <p className="mt-1 text-sm text-amber-200/90">{revenue}</p> : null}
            </>
          ) : (
            <p className="text-sm text-slate-500">Bilheteria desligada.</p>
          )}
        </DetailCard>
        <DetailCard title="Check-in" href={links.checkin} action="Check-in">
          <p className="text-lg font-semibold text-emerald-300">{checkedIn}</p>
          <p className="text-xs text-slate-500">presentes</p>
        </DetailCard>
        <DetailCard title="Bar" href={links.barPos} action="POS">
          {financial?.revenue.bar.applicable ? (
            <p className="font-semibold text-slate-100">
              {formatTicketingMoney(
                financial.revenue.bar.amount,
                financial.revenue.bar.currency ?? currency,
              )}
            </p>
          ) : (
            <p className="text-sm text-slate-500">Sem bar aplicável.</p>
          )}
        </DetailCard>
        <DetailCard title="Resultado" href={links.finance} action="Detalhar">
          {resultLabel ? (
            <p className="font-semibold text-amber-200/95">{resultLabel}</p>
          ) : (
            <p className="text-sm text-slate-500">Sem consolidado.</p>
          )}
          {financial?.completeness && !financial.completeness.resultComplete ? (
            <p className="mt-2 text-xs text-amber-300/90">Custos ainda incompletos.</p>
          ) : null}
        </DetailCard>
        <DetailCard title="Equipe" href={links.operation} action="Operação">
          <p className="text-sm text-slate-400">Módulo dedicado de equipe em desenvolvimento.</p>
        </DetailCard>
      </div>

      <section className={cn(BCH_CARD)}>
        <h2 className="mb-3 text-sm font-semibold text-slate-100">Ações do evento</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Preparar", href: links.setup },
            { label: "Bilheteria", href: links.ticketing },
            { label: "Check-in", href: links.checkin },
            { label: "Estoque bar", href: links.barInventory },
            { label: "POS bar", href: links.barPos },
            { label: "Resultado", href: links.finance },
          ].map((item) => (
            <Button
              key={item.label}
              asChild
              variant="outline"
              size="sm"
              className="min-h-[40px] border-slate-700 bg-slate-900/30"
            >
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
}

function DetailCard({
  title,
  href,
  action,
  children,
}: {
  title: string;
  href: string;
  action: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn(BCH_CARD, "flex flex-col")}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
        <Link href={href} className="inline-flex items-center text-xs text-sky-300 hover:text-sky-200">
          {action}
          <ArrowRight className="ml-1 h-3 w-3" aria-hidden />
        </Link>
      </div>
      <div className="flex-1 text-sm text-slate-400">{children}</div>
    </section>
  );
}
