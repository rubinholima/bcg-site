"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CalendarDays,
  Clock,
  Loader2,
  MapPin,
  Package,
  Ticket,
  UserCheck,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { BchEmptyState } from "@/components/dashboard/boston-city-hall/BchEmptyState";
import { BchOperationalActionCard } from "@/components/dashboard/boston-city-hall/BchOperationalActionCard";
import { BostonCityHallCreateBchEventDialog } from "@/components/dashboard/boston-city-hall/BostonCityHallCreateBchEventDialog";
import { pickFeaturedTicketingEvent } from "@/components/dashboard/boston-city-hall/bch-featured-event";
import { bchEventDisplayName } from "@/components/dashboard/boston-city-hall/bch-operational-display";
import { useBchAppShellEvent } from "@/components/dashboard/boston-city-hall/bch-app-shell-event-context";
import { useBchEventOperationalSnapshot } from "@/components/dashboard/boston-city-hall/use-bch-event-operational-snapshot";
import { useBchTicketingEvents } from "@/components/dashboard/boston-city-hall/use-bch-ticketing-events";
import { BCH_BASE } from "@/components/dashboard/boston-city-hall/bch-navigation.config";
import { BCH_BTN_PRIMARY, BCH_CARD } from "@/components/dashboard/boston-city-hall/bch-ui-classes";
import { NativeSelectField } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { getPublicImageUrl } from "@/lib/media-url";
import type { BchOperationalAlert } from "@/types/boston-city-hall";
import { EVENT_STATUS_LABEL, formatTicketingMoney } from "@/types/boston-city-hall";
import { cn } from "@/lib/utils";

function formatEventRange(start: string | null, end: string | null): string {
  if (!start) return "Data a definir";
  const s = new Date(start);
  if (Number.isNaN(s.getTime())) return "—";
  const startPart = s.toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });
  if (!end) return startPart;
  const e = new Date(end);
  if (Number.isNaN(e.getTime())) return startPart;
  const endPart = e.toLocaleString("pt-BR", { timeStyle: "short" });
  return `${startPart} — ${endPart}`;
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

export function BostonCityHallHome() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setEventName } = useBchAppShellEvent();
  const { operationalEvents, loading: eventsLoading, reload: reloadEvents } = useBchTicketingEvents();

  const paramEventId = searchParams.get("eventId")?.trim() || null;
  const featured = useMemo(() => pickFeaturedTicketingEvent(operationalEvents), [operationalEvents]);
  const selectedEventId = useMemo(() => {
    if (paramEventId && operationalEvents.some((e) => e.id === paramEventId)) return paramEventId;
    return featured?.id ?? null;
  }, [featured?.id, operationalEvents, paramEventId]);

  const snapshot = useBchEventOperationalSnapshot(selectedEventId);
  const { event, overview, financial, booking, readiness, links, loading, error } = snapshot;

  const [alerts, setAlerts] = useState<BchOperationalAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    setEventName(event?.name ?? null);
    return () => setEventName(null);
  }, [event?.name, setEventName]);

  useEffect(() => {
    let cancelled = false;
    setAlertsLoading(true);
    api
      .get<BchOperationalAlert[]>("/boston-city-hall/alerts?status=open&evaluate=1")
      .then((res) => {
        if (!cancelled) setAlerts(Array.isArray(res.data) ? res.data.slice(0, 5) : []);
      })
      .catch(() => {
        if (!cancelled) setAlerts([]);
      })
      .finally(() => {
        if (!cancelled) setAlertsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onSelectEvent = useCallback(
    (id: string) => {
      const next = id.trim();
      if (!next) {
        router.replace(BCH_BASE);
        return;
      }
      router.replace(`${BCH_BASE}?eventId=${encodeURIComponent(next)}`);
    },
    [router],
  );

  const heroImage = event?.logoUrl ? getPublicImageUrl(event.logoUrl) : null;
  const badge = dateBadge(event?.startDate ?? featured?.startDate ?? null);
  const capacity = overview?.capacity.configured ?? 0;
  const sold = overview?.sales.ticketsSold ?? 0;
  const soldPct = capacity > 0 ? Math.min(100, Math.round((sold / capacity) * 100)) : null;
  const checkedIn = overview?.tickets.checkedIn ?? 0;
  const activeIssued = overview?.tickets.activeIssued ?? 0;
  const currency = overview?.sales.currency ?? financial?.currencyHint ?? "USD";
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

  const venueLine =
    booking?.spaceName?.trim() ||
    event?.locationLabel?.trim() ||
    (booking?.title ? booking.title : null);

  const timelineItems: { label: string; at: string }[] = [];
  if (booking?.startAt) timelineItems.push({ label: "Reserva · início", at: booking.startAt });
  if (event?.startDate) timelineItems.push({ label: "Evento · início", at: event.startDate });
  if (event?.endDate) timelineItems.push({ label: "Evento · término", at: event.endDate });

  if (eventsLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-sky-400/80" />
      </div>
    );
  }

  if (operationalEvents.length === 0) {
    return (
      <div className="w-full space-y-6">
        <section className={cn(BCH_CARD, "border-sky-500/15 bg-[#0c1222]/90")}>
          <h1 className="text-2xl font-semibold text-slate-50">Operação do venue</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-400">
            Selecione ou crie um evento para acompanhar preparação, bilheteria, check-in, bar e resultado.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              type="button"
              className={cn("min-h-[44px]", BCH_BTN_PRIMARY)}
              onClick={() => setCreateOpen(true)}
            >
              Criar evento
            </Button>
            <Button asChild variant="outline" className="min-h-[44px] border-slate-700">
              <Link href={`${BCH_BASE}/reservas`}>Reservas</Link>
            </Button>
          </div>
        </section>
        <BostonCityHallCreateBchEventDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={() => reloadEvents()}
        />
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 pb-8">
      <section
        className={cn(
          "overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0a101c] shadow-lg shadow-black/20",
        )}
      >
        <div className="grid lg:grid-cols-[minmax(140px,200px)_1fr] xl:grid-cols-[220px_1fr_minmax(200px,280px)]">
          <div className="relative min-h-[180px] border-b border-slate-800/80 bg-[#070b12] lg:min-h-[220px] lg:border-b-0 lg:border-r xl:min-h-[240px]">
            {heroImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-sky-950/40 via-[#0c1222] to-[#070b12]" />
            )}
            {badge ? (
              <div className="absolute left-3 top-3 rounded-lg border border-slate-700/80 bg-black/55 px-2.5 py-2 text-center backdrop-blur-sm">
                <p className="text-[10px] font-semibold text-sky-300">{badge.weekday}</p>
                <p className="text-xl font-bold leading-none text-white">{badge.day}</p>
                <p className="text-[10px] font-medium text-slate-400">{badge.month}</p>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col justify-between gap-4 p-4 sm:p-6 lg:p-6">
            <div className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="w-full max-w-md space-y-1.5">
                  <Label className="text-xs text-slate-500">Evento em foco</Label>
                  <NativeSelectField
                    value={selectedEventId ?? ""}
                    onChange={(e) => onSelectEvent(e.target.value)}
                    placeholder="Selecione o evento"
                    options={operationalEvents.map((ev) => ({
                      value: ev.id,
                      label: bchEventDisplayName(ev.name),
                    }))}
                    className="border-slate-700 bg-slate-950/60 text-foreground"
                  />
                </div>
                <span className="inline-flex w-fit rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                  {EVENT_STATUS_LABEL[event?.status ?? featured?.status ?? "draft"] ??
                    event?.status ??
                    "—"}
                </span>
              </div>

              <h1 className="text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl lg:text-[2rem]">
                {bchEventDisplayName(event?.name ?? featured?.name ?? "Evento")}
              </h1>

              <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
                <li className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 shrink-0 text-amber-500/80" aria-hidden />
                  {venueLine ?? "Espaço a definir"}
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 shrink-0 text-sky-400/80" aria-hidden />
                  {formatEventRange(event?.startDate ?? null, event?.endDate ?? null)}
                </li>
                {capacity > 0 ? (
                  <li className="inline-flex items-center gap-1.5">
                    <Ticket className="h-4 w-4 shrink-0 text-violet-400/80" aria-hidden />
                    Capacidade: {capacity}
                  </li>
                ) : null}
              </ul>
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedEventId ? (
                <>
                  <Button asChild className={cn("min-h-[44px]", BCH_BTN_PRIMARY)}>
                    <Link href={links.workspace}>Centro do evento</Link>
                  </Button>
                  <Button asChild variant="outline" className="min-h-[44px] border-slate-700 bg-slate-900/40">
                    <Link href={links.setup}>Preparar</Link>
                  </Button>
                  {booking ? (
                    <Button asChild variant="outline" className="min-h-[44px] border-slate-700 bg-slate-900/40">
                      <Link href={links.reservas}>Ver reserva</Link>
                    </Button>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>

          <div className="hidden min-h-[120px] border-t border-slate-800/80 bg-gradient-to-br from-[#0c1528] to-[#070b12] xl:block xl:border-l xl:border-t-0">
            <div className="flex h-full min-h-[200px] items-end p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-600">Boston City Hall</p>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-9 w-9 animate-spin text-sky-400/80" />
        </div>
      ) : error ? (
        <div className={cn(BCH_CARD, "text-center")}>
          <p className="text-sm text-red-300">{error}</p>
          <Button type="button" variant="outline" className="mt-4 min-h-[44px]" onClick={() => void snapshot.reload()}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <>
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
              metricHint={booking ? undefined : "Equipe dedicada em breve"}
              href={links.operation}
              actionLabel="Ver operação"
              icon={Users}
              accent="sky"
            />
            <BchOperationalActionCard
              title="Bilheteria"
              subtitle="Vendas e ingressos"
              metric={
                snapshot.ticketing?.ticketingEnabled
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
              metricHint={financial?.revenue.bar.applicable ? "Receita de bar" : "Sem movimento registrado"}
              href={links.barInventory}
              actionLabel="Estoque do evento"
              icon={Package}
              accent="amber"
            />
            <BchOperationalActionCard
              title="Resultado"
              subtitle="Receitas e custos"
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

          <div className="grid gap-4 xl:grid-cols-12">
            <OverviewPanel
              className="xl:col-span-3"
              title="Preparação"
              icon={Wrench}
              href={links.setup}
              action="Ver setup"
            >
              <p className="text-sm text-slate-300">{readiness.summary}</p>
              {snapshot.ticketing?.types?.length ? (
                <p className="mt-2 text-xs text-slate-500">
                  {snapshot.ticketing.types.filter((t) => t.active).length} tipo(s) de ingresso ativo(s)
                </p>
              ) : null}
            </OverviewPanel>

            <OverviewPanel
              className="xl:col-span-3"
              title="Bilheteria"
              icon={Ticket}
              href={links.ticketing}
              action="Vender ingresso"
            >
              {snapshot.ticketing?.ticketingEnabled ? (
                <>
                  <p className="text-2xl font-semibold tabular-nums text-slate-50">
                    {sold}
                    {capacity ? <span className="text-base text-slate-500"> / {capacity}</span> : null}
                  </p>
                  {soldPct != null ? (
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-900">
                      <div
                        className="h-full rounded-full bg-violet-500/80"
                        style={{ width: `${soldPct}%` }}
                      />
                    </div>
                  ) : null}
                  {revenue ? <p className="mt-2 text-sm text-amber-200/90">{revenue}</p> : null}
                </>
              ) : (
                <p className="text-sm text-slate-500">Bilheteria não habilitada para este evento.</p>
              )}
            </OverviewPanel>

            <OverviewPanel
              className="xl:col-span-2"
              title="Check-in"
              icon={UserCheck}
              href={links.checkin}
              action="Check-in"
            >
              <p className="text-2xl font-semibold tabular-nums text-emerald-300">{checkedIn}</p>
              <p className="text-xs text-slate-500">presentes · {activeIssued} emitidos ativos</p>
            </OverviewPanel>

            <OverviewPanel
              className="xl:col-span-2"
              title="Bar"
              icon={Package}
              href={links.barPos}
              action="Abrir POS"
            >
              {financial?.revenue.bar.applicable ? (
                <p className="text-lg font-semibold text-slate-100">
                  {formatTicketingMoney(
                    financial.revenue.bar.amount,
                    financial.revenue.bar.currency ?? currency,
                  )}
                </p>
              ) : (
                <p className="text-sm text-slate-500">Sem bar aplicável.</p>
              )}
            </OverviewPanel>

            <OverviewPanel
              className="xl:col-span-2"
              title="Resultado"
              icon={Wallet}
              href={links.finance}
              action="Detalhar"
            >
              {resultLabel ? (
                <p className="text-lg font-semibold text-amber-200/95">{resultLabel}</p>
              ) : (
                <p className="text-sm text-slate-500">Sem consolidado.</p>
              )}
            </OverviewPanel>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_minmax(260px,320px)]">
            <section className={cn(BCH_CARD, "space-y-3")}>
              <h2 className="text-sm font-semibold text-slate-100">Ações rápidas</h2>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Centro do evento", href: links.workspace },
                  { label: "Reservas", href: links.reservas },
                  { label: "Bilheteria", href: links.ticketing },
                  { label: "Check-in", href: links.checkin },
                  { label: "POS Bar", href: links.barPos },
                  { label: "Resultado", href: links.finance },
                ].map((item) => (
                  <Button
                    key={item.label}
                    asChild
                    variant="outline"
                    size="sm"
                    className="min-h-[40px] border-slate-700 bg-slate-900/30 text-slate-200"
                  >
                    <Link href={item.href}>{item.label}</Link>
                  </Button>
                ))}
              </div>
            </section>

            <section className={cn(BCH_CARD, "space-y-3")}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-100">Alertas</h2>
                <Link href={`${BCH_BASE}/alerts`} className="text-xs text-sky-300 hover:text-sky-200">
                  Ver todos
                </Link>
              </div>
              {alertsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
              ) : alerts.length === 0 ? (
                <BchEmptyState icon={AlertTriangle} message="Nenhum alerta aberto." />
              ) : (
                <ul className="space-y-2">
                  {alerts.map((a) => (
                    <li key={a.id}>
                      <Link
                        href={a.actionUrl ?? `${BCH_BASE}/alerts`}
                        className="block rounded-lg border border-slate-800/80 bg-slate-950/40 px-3 py-2 hover:border-sky-500/25"
                      >
                        <p className="text-sm font-medium text-slate-100">{a.title}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {timelineItems.length > 0 ? (
            <section className={cn(BCH_CARD)}>
              <div className="mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-sky-400/80" aria-hidden />
                <h2 className="text-sm font-semibold text-slate-100">Linha do tempo</h2>
              </div>
              <ol className="flex flex-wrap gap-4 sm:gap-6">
                {timelineItems.map((item) => (
                  <li key={`${item.label}-${item.at}`} className="min-w-[140px]">
                    <p className="text-xs font-medium text-slate-400">{item.label}</p>
                    <p className="text-sm text-slate-200">
                      {new Date(item.at).toLocaleString("pt-BR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </>
      )}

      <BostonCityHallCreateBchEventDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => reloadEvents()}
      />
    </div>
  );
}

function OverviewPanel({
  title,
  icon: Icon,
  href,
  action,
  children,
  className,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  action: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(BCH_CARD, "flex flex-col", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-sky-400/90" aria-hidden />
          <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
        </div>
        <Link href={href} className="text-xs font-medium text-sky-300 hover:text-sky-200">
          {action}
        </Link>
      </div>
      <div className="flex-1">{children}</div>
    </section>
  );
}
