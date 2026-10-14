"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Circle,
  Loader2,
  Ticket,
} from "lucide-react";
import { BostonCityHallEventAlertsBanner } from "@/components/dashboard/boston-city-hall/BostonCityHallEventAlertsBanner";
import { BostonCityHallEventFinancial } from "@/components/dashboard/boston-city-hall/BostonCityHallEventFinancial";
import { BostonCityHallEventSetup } from "@/components/dashboard/boston-city-hall/BostonCityHallEventSetup";
import { BostonCityHallEventWorkspaceBarTab } from "@/components/dashboard/boston-city-hall/BostonCityHallEventWorkspaceBarTab";
import { BostonCityHallTicketingHub } from "@/components/dashboard/boston-city-hall/BostonCityHallTicketingHub";
import { bchEventDisplayName } from "@/components/dashboard/boston-city-hall/bch-operational-display";
import type {
  BchWorkspaceSection,
  useBchEventOperationalSnapshot,
} from "@/components/dashboard/boston-city-hall/use-bch-event-operational-snapshot";
import { BCH_BASE } from "@/components/dashboard/boston-city-hall/bch-navigation.config";
import { BCH_BTN_PRIMARY, BCH_CARD } from "@/components/dashboard/boston-city-hall/bch-ui-classes";
import { Button } from "@/components/ui/button";
import {
  BOOKING_STATUS_LABEL,
  EVENT_STATUS_LABEL,
  formatCatalogMoney,
  formatProposalDate,
  formatTicketingMoney,
  VENUE_CONTRACT_STATUS_LABEL,
  VENUE_PROPOSAL_STATUS_LABEL,
} from "@/types/boston-city-hall";
import { cn } from "@/lib/utils";
import { getPublicImageUrl } from "@/lib/media-url";

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

const STAGES = [
  { id: "planejamento", label: "Planejamento" },
  { id: "preparacao", label: "Preparação" },
  { id: "execucao", label: "Execução" },
  { id: "fechamento", label: "Fechamento" },
] as const;

function formatEventRange(start: string | null, end: string | null): string {
  const s = start ? new Date(start) : null;
  if (!s || Number.isNaN(s.getTime())) return "Data a definir";
  const startPart = s.toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });
  if (!end) return startPart;
  const e = new Date(end);
  if (Number.isNaN(e.getTime())) return startPart;
  return `${startPart} – ${e.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

function stageIndex(stage: string): number {
  return STAGES.findIndex((s) => s.id === stage);
}

function primaryNextAction(snapshot: Snapshot): { label: string; href: string } {
  const { event, links, workspace } = snapshot;
  if (!event) return { label: "Eventos", href: `${BCH_BASE}/eventos` };
  if (!event.startAt && !event.startDate) {
    return { label: "Definir planejamento", href: `${links.workspace}?sec=planejamento` };
  }
  if (workspace?.ticketing.enabled) {
    return { label: "Operar bilheteria", href: `${links.workspace}?sec=bilheteria` };
  }
  return { label: "Ver planejamento", href: `${links.workspace}?sec=planejamento` };
}

export function BostonCityHallEventWorkspaceView({ snapshot }: { snapshot: Snapshot }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const section = (searchParams.get("sec") as SectionId | null) ?? "resumo";

  const {
    loading,
    error,
    event,
    workspace,
    ticketing,
    overview,
    financial,
    financialError,
    booking,
    links,
    reload,
    ensureSectionData,
  } = snapshot;

  useEffect(() => {
    if (!event?.id) return;
    void ensureSectionData(section as BchWorkspaceSection);
  }, [ensureSectionData, event?.id, section]);

  const setSection = useCallback(
    (id: SectionId) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set("sec", id);
      if (id !== "bar") p.delete("barTab");
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

  if (error || !event || !workspace) {
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
    booking?.spaceName?.trim() || event.locationLabel?.trim() || "—";
  const scheduleLine =
    booking?.startAt && booking?.endAt
      ? formatEventRange(booking.startAt, booking.endAt)
      : formatEventRange(event.startAt ?? event.startDate, event.endAt ?? event.endDate);

  const sold = overview?.sales.ticketsSold ?? workspace.ticketKpis.ticketsSold;
  const capacity = overview?.capacity.configured ?? workspace.ticketKpis.capacityConfigured ?? 0;
  const checkedIn = overview?.tickets.checkedIn ?? workspace.ticketKpis.checkedIn;
  const currency = overview?.sales.currency ?? workspace.ticketKpis.currency ?? "USD";
  const ticketRevenue = workspace.ticketKpis.grossAmount
    ? formatTicketingMoney(workspace.ticketKpis.grossAmount, currency)
    : null;

  const primaryCurrency = financial?.currencies?.[0];
  const resultLabel = primaryCurrency?.operationalResult
    ? formatTicketingMoney(primaryCurrency.operationalResult, primaryCurrency.currency)
    : financial?.revenue.grossOperationalRevenue
      ? formatTicketingMoney(
          financial.revenue.grossOperationalRevenue,
          financial.currencyHint ?? financial.consolidatedCurrency ?? undefined,
        )
      : null;

  const stageIdx = stageIndex(workspace.operationalStage);
  const logoSrc = event.logoUrl ? getPublicImageUrl(event.logoUrl) : null;

  return (
    <div className="w-full space-y-4 pb-8">
      <header className="overflow-hidden rounded-xl border border-slate-800/80 bg-gradient-to-r from-[#070d18] via-[#0c1222] to-[#070d18]">
        <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-4">
            {logoSrc ? (
              <div className="relative hidden h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-slate-700/80 sm:block">
                <Image src={logoSrc} alt="" fill className="object-cover" sizes="112px" />
              </div>
            ) : null}
            <div className="min-w-0 space-y-2">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="-ml-2 h-9 gap-1 text-slate-400 hover:text-slate-200"
              >
                <Link href={`${BCH_BASE}/eventos`}>
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Eventos
                </Link>
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-sky-500/40 bg-sky-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-200">
                  Evento
                </span>
                <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-200">
                  {EVENT_STATUS_LABEL[event.status] ?? event.status}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-50 sm:text-3xl">
                {bchEventDisplayName(event.name)}
              </h1>
              <p className="text-sm text-slate-300">{scheduleLine}</p>
              <p className="text-sm text-slate-400">
                <span className="text-slate-500">Espaço:</span> {venueLine}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col lg:items-end">
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

        <div className="border-t border-slate-800/80 px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {STAGES.map((st, i) => {
                const done = i < stageIdx;
                const current = i === stageIdx;
                return (
                  <div key={st.id} className="flex items-center gap-1.5 text-xs">
                    {done ? (
                      <Check className="h-4 w-4 text-emerald-400" aria-hidden />
                    ) : (
                      <Circle
                        className={cn("h-3.5 w-3.5", current ? "text-sky-400 fill-sky-400/20" : "text-slate-600")}
                        aria-hidden
                      />
                    )}
                    <span className={cn(current ? "font-semibold text-sky-200" : "text-slate-400")}>
                      {st.label}
                    </span>
                    {i < STAGES.length - 1 ? (
                      <span className="mx-1 hidden text-slate-600 sm:inline">→</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-500">
              Etapa atual:{" "}
              <span className="font-medium text-slate-300">
                {STAGES[stageIdx]?.label ?? workspace.operationalStage}
              </span>
            </p>
          </div>
        </div>
      </header>

      {section === "resumo" || section === "fechamento" ? (
        <BostonCityHallEventAlertsBanner
          eventId={event.id}
          lazy={section !== "fechamento"}
          openCountHint={workspace.alertOpenCount}
        />
      ) : null}

      <nav
        aria-label="Operação do evento"
        className="flex gap-1 overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/50 p-1"
      >
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-colors sm:text-sm",
              section === s.id
                ? "bg-sky-600/90 text-white shadow-sm shadow-sky-900/40"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100",
            )}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {section === "resumo" ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard
              label="Vendas de ingressos"
              value={
                workspace.ticketing.enabled
                  ? `${sold}${capacity ? ` / ${capacity}` : ""}`
                  : "N/A"
              }
              sub={
                workspace.ticketing.enabled && capacity
                  ? `${Math.min(100, Math.round((sold / capacity) * 100))}%`
                  : undefined
              }
              accent="emerald"
            />
            <KpiCard
              label="Check-in"
              value={workspace.ticketing.enabled ? `${checkedIn} presente${checkedIn === 1 ? "" : "s"}` : "N/A"}
              accent="sky"
            />
            <KpiCard label="Receita ingressos" value={ticketRevenue ?? "—"} accent="violet" />
            <KpiCard
              label="Despesas previstas"
              value={
                financial?.cost.totalKnownOperationalCost
                  ? formatCatalogMoney(financial.cost.totalKnownOperationalCost)
                  : "—"
              }
              accent="amber"
            />
            <KpiCard label="Resultado projetado" value={resultLabel ?? "—"} accent="teal" />
          </div>

          {financialError ? (
            <p className="text-xs text-amber-300/90">Resultado financeiro parcial indisponível: {financialError}</p>
          ) : null}

          <div className="grid gap-3 lg:grid-cols-3">
            <Panel title="Informações do evento">
              <InfoRow label="Nome" value={event.name} />
              <InfoRow label="Data" value={scheduleLine} />
              <InfoRow label="Espaço" value={venueLine} />
              <InfoRow label="Tipo" value={event.category || "—"} />
              <InfoRow label="Status" value={EVENT_STATUS_LABEL[event.status] ?? event.status} />
              <InfoRow
                label="Reserva"
                value={booking ? `${booking.title} (${BOOKING_STATUS_LABEL[booking.bookingStatus] ?? booking.bookingStatus})` : "Não vinculada"}
              />
              <InfoRow
                label="Contato"
                value={booking?.contactName ?? booking?.companyName ?? "—"}
              />
              <InfoRow
                label="Proposta"
                value={
                  booking?.proposal
                    ? `${booking.proposal.proposalNumber} · ${VENUE_PROPOSAL_STATUS_LABEL[booking.proposal.status] ?? booking.proposal.status}`
                    : "—"
                }
              />
              <InfoRow
                label="Contrato"
                value={
                  booking?.contract
                    ? `${booking.contract.contractNumber} · ${VENUE_CONTRACT_STATUS_LABEL[booking.contract.status] ?? booking.contract.status}`
                    : "—"
                }
              />
            </Panel>

            <Panel title="Prontidão operacional">
              <ul className="space-y-2 text-sm">
                {workspace.readiness.map((r) => (
                  <li key={r.code} className="flex items-start gap-2">
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                        r.ok ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/15 text-amber-200",
                      )}
                    >
                      {r.ok ? "✓" : "!"}
                    </span>
                    <div>
                      <p className="text-slate-200">{r.label}</p>
                      {r.detail ? <p className="text-xs text-slate-500">{r.detail}</p> : null}
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-slate-500">
                Checklist operacional persistido (tarefas por evento) ainda não está disponível nesta fase.
              </p>
            </Panel>

            <Panel title="Agenda (reserva)">
              {booking ? (
                <ul className="space-y-2 text-sm text-slate-300">
                  <li>Montagem / preparo: conforme operação do venue</li>
                  <li>
                    Início: {formatProposalDate(booking.startAt)}{" "}
                    {new Date(booking.startAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </li>
                  <li>
                    Término: {new Date(booking.endAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </li>
                </ul>
              ) : (
                <p className="text-sm text-slate-500">Sem reserva — horários dependem apenas do cadastro do evento.</p>
              )}
            </Panel>
          </div>
        </div>
      ) : null}

      {section === "planejamento" ? (
        <BostonCityHallEventSetup
          eventId={event.id}
          bookingId={booking?.bookingId ?? null}
          embedded
          backHref={links.workspace}
          backLabel="Voltar ao workspace"
        />
      ) : null}

      {section === "equipe" ? (
        <Panel title="Equipe, contatos e comercial">
          {booking ? (
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <InfoRow label="Operação" value={booking.title} />
              <InfoRow label="Contato" value={booking.contactName ?? "—"} />
              <InfoRow label="Empresa" value={booking.companyName ?? "—"} />
              <InfoRow
                label="Financeiro venue"
                value={booking.finance ? `${booking.finance.status} · saldo ${booking.finance.balance}` : "—"}
              />
              <InfoRow
                label="Alertas da reserva"
                value={booking.alerts.length ? booking.alerts.map((a) => a.label).join("; ") : "Nenhum"}
              />
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              Nenhuma reserva vinculada a este evento. Vincule uma reserva para rastrear contato, contrato e recebíveis.
            </p>
          )}
          <p className="mt-4 text-xs text-slate-500">
            Atribuições de equipe, turnos e compromissos com fornecedores exigem modelos operacionais da próxima fase
            (sem dados inventados aqui).
          </p>
          {booking ? (
            <Button asChild variant="outline" className="mt-4 min-h-[44px] border-slate-700">
              <Link href={links.operation}>Abrir ficha da operação (reserva)</Link>
            </Button>
          ) : null}
        </Panel>
      ) : null}

      {section === "bilheteria" ? (
        <div className="space-y-3">
          {!workspace.ticketing.enabled ? (
            <div className={cn(BCH_CARD, "flex items-start gap-3 text-sm text-slate-300")}>
              <Ticket className="mt-0.5 h-5 w-5 shrink-0 text-sky-400/80" aria-hidden />
              <div>
                <p className="font-medium text-slate-100">Bilheteria desligada</p>
                <p className="mt-1 text-slate-400">
                  Eventos privados podem operar sem ingressos. Ative no planejamento se precisar vender ou fazer check-in.
                </p>
                <Button asChild size="sm" className="mt-3 min-h-[40px]" variant="secondary">
                  <Link href={`${links.workspace}?sec=planejamento`}>Configurar no planejamento</Link>
                </Button>
              </div>
            </div>
          ) : (
            <BostonCityHallTicketingHub fixedEventId={event.id} embedded />
          )}
        </div>
      ) : null}

      {section === "bar" ? (
        <Suspense fallback={<Loader2 className="mx-auto h-8 w-8 animate-spin text-sky-400" />}>
          <BostonCityHallEventWorkspaceBarTab eventId={event.id} workspacePath={links.workspace} />
        </Suspense>
      ) : null}

      {section === "financeiro" ? (
        <BostonCityHallEventFinancial
          eventId={event.id}
          backHref={links.workspace}
          backLabel="Voltar ao workspace"
          embedded
        />
      ) : null}

      {section === "fechamento" ? (
        <div className="space-y-4">
          <Panel title="Estado do fechamento">
            <p className="text-sm text-slate-400">
              Fechamento global do evento (bilheteria, caixa, fornecedores e aprovação final) ainda não está implementado.
              O fechamento de bar e contagem física estão disponíveis na aba Bar e estoque.
            </p>
            {financial?.completeness.barCloseFinalized ? (
              <p className="mt-2 text-sm text-emerald-300/90">Fechamento de bar finalizado para este evento.</p>
            ) : (
              <p className="mt-2 text-sm text-amber-200/90">Fechamento de bar pendente ou não aplicável.</p>
            )}
          </Panel>
          <BostonCityHallEventAlertsBanner eventId={event.id} />
        </div>
      ) : null}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: "emerald" | "sky" | "violet" | "amber" | "teal";
}) {
  const ring = {
    emerald: "border-emerald-500/25 bg-emerald-500/5",
    sky: "border-sky-500/25 bg-sky-500/5",
    violet: "border-violet-500/25 bg-violet-500/5",
    amber: "border-amber-500/25 bg-amber-500/5",
    teal: "border-teal-500/25 bg-teal-500/5",
  }[accent];
  return (
    <div className={cn(BCH_CARD, "min-h-[88px]", ring)}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-slate-50">{value}</p>
      {sub ? <p className="text-xs text-slate-400">{sub}</p> : null}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={cn(BCH_CARD)}>
      <h2 className="mb-3 text-sm font-semibold text-slate-100">{title}</h2>
      {children}
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-800/60 py-2 last:border-0 sm:flex-row sm:justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm text-slate-200 sm:text-right">{value}</span>
    </div>
  );
}
