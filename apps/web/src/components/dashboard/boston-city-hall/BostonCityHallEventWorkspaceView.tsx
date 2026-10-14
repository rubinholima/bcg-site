"use client";

import Link from "next/link";
import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ClipboardCheck,
  Loader2,
  Package,
  Ticket,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { BostonCityHallEventAlertsBanner } from "@/components/dashboard/boston-city-hall/BostonCityHallEventAlertsBanner";
import { bchEventDisplayName } from "@/components/dashboard/boston-city-hall/bch-operational-display";
import type { useBchEventOperationalSnapshot } from "@/components/dashboard/boston-city-hall/use-bch-event-operational-snapshot";
import { BCH_BASE } from "@/components/dashboard/boston-city-hall/bch-navigation.config";
import { BCH_BTN_PRIMARY, BCH_CARD } from "@/components/dashboard/boston-city-hall/bch-ui-classes";
import { Button } from "@/components/ui/button";
import { EVENT_STATUS_LABEL, formatTicketingMoney } from "@/types/boston-city-hall";
import { cn } from "@/lib/utils";

type Snapshot = ReturnType<typeof useBchEventOperationalSnapshot>;

const SECTIONS = [
  { id: "resumo", label: "Resumo" },
  { id: "planejamento", label: "Planejamento" },
  { id: "equipe", label: "Equipe e fornecedores" },
  { id: "bilheteria", label: "Bilheteria e entrada" },
  { id: "bar", label: "Bar e estoque" },
  { id: "financeiro", label: "Financeiro" },
  { id: "fechamento", label: "Fechamento" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

function formatEventRange(start: string | null, end: string | null): string {
  if (!start) return "Data a definir";
  const s = new Date(start);
  if (Number.isNaN(s.getTime())) return "Data a definir";
  const startPart = s.toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });
  if (!end) return startPart;
  const e = new Date(end);
  if (Number.isNaN(e.getTime())) return startPart;
  return `${startPart} – ${e.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

function primaryNextAction(snapshot: Snapshot): { label: string; href: string } {
  const { event, links, readiness, ticketing } = snapshot;
  if (!event?.startDate) return { label: "Definir data e setup", href: links.setup };
  if (event.status === "draft") return { label: "Publicar preparação", href: links.setup };
  if (ticketing?.ticketingEnabled && !readiness.ok) return { label: "Ajustar bilheteria", href: links.setup };
  if (ticketing?.ticketingEnabled) return { label: "Operar bilheteria", href: links.ticketing };
  return { label: "Ver planejamento", href: links.setup };
}

export function BostonCityHallEventWorkspaceView({ snapshot }: { snapshot: Snapshot }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const section = (searchParams.get("sec") as SectionId | null) ?? "resumo";

  const { loading, error, event, ticketing, overview, financial, booking, readiness, links, reload } =
    snapshot;

  const setSection = useCallback(
    (id: SectionId) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set("sec", id);
      router.replace(`${links.workspace}?${p.toString()}`, { scroll: false });
    },
    [router, searchParams, links.workspace],
  );

  const nextAction = useMemo(() => primaryNextAction(snapshot), [snapshot]);

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

  const venueLine =
    booking?.spaceName?.trim() ||
    event.locationLabel?.trim() ||
    null;

  const currency = overview?.sales.currency ?? financial?.currencyHint ?? "USD";
  const sold = overview?.sales.ticketsSold ?? 0;
  const capacity = overview?.capacity.configured ?? 0;
  const checkedIn = overview?.tickets.checkedIn ?? 0;
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
    <div className="w-full space-y-4 pb-6">
      <header className="rounded-xl border border-slate-800/80 bg-gradient-to-r from-[#0a101c] via-[#0c1222] to-[#0a101c] px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="-ml-2 h-9 gap-1 text-slate-400 hover:text-slate-200"
            >
              <Link href={`${BCH_BASE}/eventos`}>
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Voltar aos eventos
              </Link>
            </Button>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-400/80">
              Evento
            </p>
            <h1 className="text-xl font-bold text-slate-50 sm:text-2xl">
              {bchEventDisplayName(event.name)}
            </h1>
            <p className="text-sm text-slate-400">{formatEventRange(event.startDate, event.endDate)}</p>
            <p className="text-sm text-slate-400">
              <span className="text-slate-500">Espaço:</span> {venueLine ?? "—"}
            </p>
            <span className="inline-flex rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-0.5 text-xs font-semibold text-emerald-200">
              {EVENT_STATUS_LABEL[event.status] ?? event.status}
            </span>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col lg:items-end">
            <Button asChild className={cn("min-h-[44px]", BCH_BTN_PRIMARY)}>
              <Link href={nextAction.href}>{nextAction.label}</Link>
            </Button>
            {booking ? (
              <Button asChild variant="outline" className="min-h-[44px] border-slate-700">
                <Link href={links.reservas}>Reserva vinculada</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <BostonCityHallEventAlertsBanner eventId={event.id} />

      <nav
        aria-label="Operação do evento"
        className="flex gap-1 overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/40 p-1"
      >
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-colors sm:text-sm",
              section === s.id
                ? "bg-sky-600/90 text-white"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100",
            )}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {section === "resumo" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryTile label="Preparação" value={readiness.summary} href={links.setup} />
          <SummaryTile
            label="Bilheteria"
            value={
              ticketing?.ticketingEnabled
                ? sold + (capacity ? ` / ${capacity}` : " vendidos")
                : "Desligada"
            }
            href={links.ticketing}
          />
          <SummaryTile
            label="Check-in"
            value={checkedIn > 0 ? `${checkedIn} presentes` : "—"}
            href={links.checkin}
          />
          <SummaryTile label="Resultado" value={resultLabel ?? "—"} href={links.finance} />
        </div>
      ) : null}

      {section === "planejamento" ? (
        <SectionPanel title="Planejamento" icon={Wrench}>
          <p className="text-sm text-slate-400">{readiness.summary}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <ActionLink href={links.setup} primary>
              Event setup
            </ActionLink>
            {booking ? (
              <ActionLink href={links.reservas}>Editar reserva</ActionLink>
            ) : (
              <ActionLink href={`${BCH_BASE}/reservas`}>Reservas do venue</ActionLink>
            )}
            <ActionLink href={`${BCH_BASE}/agenda`}>Calendário</ActionLink>
          </div>
        </SectionPanel>
      ) : null}

      {section === "equipe" ? (
        <SectionPanel title="Equipe e fornecedores" icon={Users}>
          <p className="text-sm text-slate-400">
            {booking
              ? "Operação ligada à reserva do evento. Fornecedores e serviços do contrato ficam no fluxo comercial."
              : "Nenhuma reserva vinculada. Vincule uma reserva para rastrear operação e contatos."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <ActionLink href={links.operation} primary>
              {booking ? "Detalhe da operação" : "Operações do venue"}
            </ActionLink>
            <ActionLink href={`${BCH_BASE}/servicos`}>Catálogo de serviços</ActionLink>
          </div>
        </SectionPanel>
      ) : null}

      {section === "bilheteria" ? (
        <SectionPanel title="Bilheteria e entrada" icon={Ticket}>
          {ticketing?.ticketingEnabled ? (
            <>
              <p className="text-lg font-semibold tabular-nums text-slate-50">
                {sold}
                {capacity ? ` / ${capacity}` : ""} vendidos
              </p>
              {revenue ? <p className="text-sm text-amber-200/90">{revenue}</p> : null}
            </>
          ) : (
            <p className="text-sm text-slate-400">
              Bilheteria opcional. Ative no setup se o evento for público com ingressos.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <ActionLink href={links.ticketing} primary>
              Hub de bilheteria
            </ActionLink>
            <ActionLink href={links.checkin}>Check-in</ActionLink>
            <ActionLink href={links.setup}>Configurar ingressos</ActionLink>
          </div>
        </SectionPanel>
      ) : null}

      {section === "bar" ? (
        <SectionPanel title="Bar e estoque" icon={Package}>
          {financial?.revenue.bar.applicable ? (
            <p className="font-semibold text-slate-100">
              {formatTicketingMoney(
                financial.revenue.bar.amount,
                financial.revenue.bar.currency ?? currency,
              )}
            </p>
          ) : (
            <p className="text-sm text-slate-400">Sem receita de bar registrada para este evento.</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <ActionLink href={links.barInventory} primary>
              Estoque do evento
            </ActionLink>
            <ActionLink href={links.barPos}>POS</ActionLink>
          </div>
        </SectionPanel>
      ) : null}

      {section === "financeiro" ? (
        <SectionPanel title="Financeiro" icon={Wallet}>
          {resultLabel ? (
            <p className="text-xl font-semibold text-amber-200/95">{resultLabel}</p>
          ) : (
            <p className="text-sm text-slate-400">Resultado parcial ainda não consolidado.</p>
          )}
          {financial?.completeness && !financial.completeness.resultComplete ? (
            <p className="mt-2 text-xs text-amber-300/90">Custos operacionais incompletos.</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <ActionLink href={links.finance} primary>
              Resultado do evento
            </ActionLink>
            <ActionLink href={`${BCH_BASE}/financeiro`}>Financeiro do venue</ActionLink>
          </div>
        </SectionPanel>
      ) : null}

      {section === "fechamento" ? (
        <SectionPanel title="Fechamento" icon={ClipboardCheck}>
          <p className="text-sm text-slate-400">
            Fechamento operacional de bar e conferências usa os módulos existentes de contagem e close.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <ActionLink href={links.closing} primary>
              Fechamento de bar
            </ActionLink>
            <ActionLink href={`${BCH_BASE}/bar/physical-counts`}>Contagem física</ActionLink>
            <ActionLink href={`${BCH_BASE}/alerts?eventId=${encodeURIComponent(event.id)}`}>
              Alertas do evento
            </ActionLink>
          </div>
        </SectionPanel>
      ) : null}
    </div>
  );
}

function SummaryTile({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link
      href={href}
      className={cn(
        BCH_CARD,
        "block min-h-[88px] transition-colors hover:border-sky-500/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40",
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-100">{value}</p>
    </Link>
  );
}

function SectionPanel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Wrench;
  children: React.ReactNode;
}) {
  return (
    <section className={cn(BCH_CARD)}>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-5 w-5 text-sky-400/80" aria-hidden />
        <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function ActionLink({
  href,
  children,
  primary,
}: {
  href: string;
  children: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <Button
      asChild
      variant={primary ? "default" : "outline"}
      className={cn(
        "min-h-[44px]",
        primary ? "bg-sky-600 hover:bg-sky-500" : "border-slate-700 bg-slate-900/30",
      )}
    >
      <Link href={href}>{children}</Link>
    </Button>
  );
}
