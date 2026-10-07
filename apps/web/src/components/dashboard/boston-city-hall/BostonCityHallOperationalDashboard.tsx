"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  ContactRound,
  Kanban,
  UserPlus,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/cup360/KpiCard";
import { BostonCityHallOverviewCharts } from "@/components/dashboard/boston-city-hall/BostonCityHallOverviewCharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { agendaHubUrl, AGENDA_VISAO } from "@/lib/agenda-hub";
import type { VenueOverview } from "@/types/boston-city-hall";
import {
  BOOKING_STATUS_COLOR,
  BOOKING_STATUS_LABEL,
  formatCatalogMoney,
  LEAD_SOURCE_LABEL,
  PIPELINE_STAGE_CHART_COLOR,
  PIPELINE_STAGE_LABEL,
  PIPELINE_STAGES,
} from "@/types/boston-city-hall";

const BCH = "/dashboard/eventos/boston-city-hall";

const QUICK_ACTIONS = [
  { href: `${BCH}/pipeline`, label: "Novo lead", icon: UserPlus },
  { href: `${BCH}/reservas`, label: "Nova reserva", icon: CalendarPlus },
  { href: agendaHubUrl(AGENDA_VISAO.BOSTON_HALL), label: "Agenda", icon: CalendarDays },
  { href: `${BCH}/pipeline`, label: "Pipeline", icon: Kanban },
  { href: `${BCH}/crm`, label: "CRM", icon: ContactRound },
] as const;

function formatBookingWhen(startIso: string, endIso: string): { date: string; time: string } {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const date = start.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
  const time = `${start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} – ${end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  return { date, time };
}

function formatRelativeUpdated(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Hoje";
  if (days === 1) return "Ontem";
  if (days < 7) return `${days} dias`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

type Props = {
  overview: VenueOverview;
};

export function BostonCityHallOperationalDashboard({ overview }: Props) {
  const conversionPct =
    overview.leadsTotal > 0 ? Math.round((overview.leadsWon / overview.leadsTotal) * 100) : 0;

  const upcoming = overview.upcomingBookings ?? [];
  const attention = overview.leadsNeedingAttention ?? [];

  const agendaByDay = useMemo(() => {
    const map = new Map<string, typeof upcoming>();
    const horizon = Date.now() + 14 * 24 * 60 * 60 * 1000;
    for (const b of upcoming) {
      const t = new Date(b.startAt).getTime();
      if (t > horizon) continue;
      const key = b.startAt.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(b);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [upcoming]);

  const pipelineStages = useMemo(
    () =>
      PIPELINE_STAGES.map((stage) => ({
        stage,
        label: PIPELINE_STAGE_LABEL[stage] ?? stage,
        count: overview.pipelineByStage?.[stage] ?? 0,
        color: PIPELINE_STAGE_CHART_COLOR[stage] ?? "#94a3b8",
      })),
    [overview.pipelineByStage],
  );

  const pipelineMax = Math.max(1, ...pipelineStages.map((s) => s.count));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
          <Button key={label} variant="outline" size="sm" className="min-h-[40px] gap-2" asChild>
            <Link href={href}>
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </Link>
          </Button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
        <KpiCard label="Reservas hoje" value={overview.bookingsToday ?? 0} tone="accent" />
        <KpiCard
          label="Próximas reservas"
          value={overview.upcomingBookingsTotal ?? 0}
          hint="Ativas à frente"
          tone="info"
        />
        <KpiCard label="Reservas no mês" value={overview.bookingsThisMonth} />
        <KpiCard label="Leads em aberto" value={overview.leadsOpen} tone="warning" />
        <KpiCard label="Novos leads no mês" value={overview.leadsNewThisMonth ?? 0} />
        <KpiCard
          label="Taxa de conversão"
          value={`${conversionPct}%`}
          hint={`${overview.leadsWon ?? 0} / ${overview.leadsTotal ?? 0}`}
        />
        <KpiCard label="Espaços ativos" value={overview.spacesCount}>
          <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
            <Link href={`${BCH}/espacos`}>Gerenciar espaços</Link>
          </Button>
        </KpiCard>
        {overview.finance ? (
          <>
            <KpiCard
              label="Saldo em aberto"
              value={formatCatalogMoney(overview.finance.openBalance)}
              tone="warning"
            />
            <KpiCard
              label="Vencido"
              value={formatCatalogMoney(overview.finance.overdueBalance)}
              tone={Number.parseFloat(overview.finance.overdueBalance) > 0 ? "danger" : undefined}
            />
          </>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold">Próximas reservas</CardTitle>
            <Button variant="ghost" size="sm" className="h-8" asChild>
              <Link href={`${BCH}/reservas`}>Ver todas</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma reserva à frente.</p>
            ) : (
              upcoming.slice(0, 8).map((b) => {
                const when = formatBookingWhen(b.startAt, b.endAt);
                const contact = b.contactName?.trim() || b.title;
                return (
                  <Link
                    key={b.id}
                    href={`${BCH}/reservas?edit=${encodeURIComponent(b.id)}`}
                    className="flex flex-col gap-1 rounded-lg border border-border/80 bg-muted/20 px-3 py-2.5 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{contact}</p>
                      <p className="text-xs text-muted-foreground">
                        {when.date} · {when.time}
                        {b.spaceName ? ` · ${b.spaceName}` : ""}
                        {b.eventType ? ` · ${b.eventType}` : ""}
                        {b.guestCount != null ? ` · ${b.guestCount} conv.` : ""}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 self-start rounded-md border px-2 py-0.5 text-xs font-medium sm:self-center",
                        BOOKING_STATUS_COLOR[b.status] ?? "bg-muted text-muted-foreground",
                      )}
                    >
                      {BOOKING_STATUS_LABEL[b.status] ?? b.status}
                    </span>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold">Leads que precisam de atenção</CardTitle>
            <Button variant="ghost" size="sm" className="h-8" asChild>
              <Link href={`${BCH}/crm`}>Abrir CRM</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {attention.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhum lead em aberto.</p>
            ) : (
              attention.map((lead) => (
                <Link
                  key={lead.id}
                  href={`${BCH}/pipeline`}
                  className="block rounded-lg border border-border/80 bg-muted/20 px-3 py-2.5 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{lead.contactName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {lead.companyName?.trim() || "—"} · {LEAD_SOURCE_LABEL[lead.source] ?? lead.source}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatRelativeUpdated(lead.updatedAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-violet-300/90">
                    {PIPELINE_STAGE_LABEL[lead.stage] ?? lead.stage}
                  </p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base font-semibold">Agenda resumida</CardTitle>
          <Button variant="ghost" size="sm" className="h-8 gap-1" asChild>
            <Link href={agendaHubUrl(AGENDA_VISAO.BOSTON_HALL)}>
              <CalendarDays className="h-4 w-4" />
              Agenda
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {agendaByDay.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Nada agendado nos próximos 14 dias.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {agendaByDay.map(([day, items]) => (
                <div key={day} className="rounded-lg border border-border/60 bg-muted/15 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {new Date(`${day}T12:00:00`).toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "2-digit",
                      month: "short",
                    })}
                  </p>
                  <ul className="space-y-1.5">
                    {items.map((b) => (
                      <li key={b.id}>
                        <Link
                          href={`${BCH}/reservas?edit=${encodeURIComponent(b.id)}`}
                          className="text-sm text-foreground hover:text-violet-300"
                        >
                          {new Date(b.startAt).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          — {b.title}
                          {b.spaceName ? ` (${b.spaceName})` : ""}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base font-semibold">Pipeline comercial</CardTitle>
          <Button variant="ghost" size="sm" className="h-8" asChild>
            <Link href={`${BCH}/pipeline`}>Abrir pipeline</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {pipelineStages.every((s) => s.count === 0) ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Sem leads no pipeline.</p>
          ) : (
            pipelineStages.map(({ stage, label, count, color }) => (
              <div key={stage} className="flex items-center gap-3">
                <span className="w-[7.5rem] shrink-0 truncate text-xs text-muted-foreground sm:w-36">{label}</span>
                <div className="relative h-6 min-w-0 flex-1 overflow-hidden rounded-md bg-muted/40">
                  <div
                    className="absolute inset-y-0 left-0 rounded-md transition-all"
                    style={{
                      width: `${Math.max(count > 0 ? 8 : 0, (count / pipelineMax) * 100)}%`,
                      backgroundColor: color,
                      opacity: count > 0 ? 0.85 : 0,
                    }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums">{count}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <BostonCityHallOverviewCharts overview={overview} />
    </div>
  );
}
