"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  ClipboardCheck,
  FileText,
  Loader2,
  Map,
  RefreshCw,
  Stethoscope,
  Target,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelectField } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import { ExecutiveKpiStrip } from "./ExecutiveKpiStrip";
import { ExecutiveActionList } from "./ExecutiveActionList";
import {
  CT_STATUS_LABEL,
  PLAYER_STATUS_LABEL,
  SPORTS_SITUATION_LABEL,
} from "@/lib/futebol-executive-access";
import type {
  ExecutiveDashboardDto,
  ExecutiveQuickAction,
  TenantOption,
} from "@/lib/futebol-executive-types";
import { getCategoryLabel } from "@/lib/fixture-categories";
import { formatDateDayMonYear } from "@/lib/format-date";
import type { FixtureCategoryItem } from "@/lib/fixture-categories";

function Panel({
  title,
  icon: Icon,
  children,
  id,
  className,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "rounded-xl border border-border/80 bg-zinc-950/60 shadow-sm backdrop-blur-sm",
        className,
      )}
    >
      <header className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold tracking-wide text-foreground">{title}</h2>
      </header>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}

function StatRow({ label, value, href }: { label: string; value: number; href?: string }) {
  const content = (
    <div className="flex items-center justify-between gap-2 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block rounded-md transition-colors hover:bg-muted/30">
        {content}
      </Link>
    );
  }
  return content;
}

function BreakdownGrid({
  data,
  labels,
}: {
  data: Record<string, number>;
  labels?: Record<string, string>;
}) {
  const entries = Object.entries(data).filter(([, v]) => v > 0);
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem dados no filtro atual.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
      {entries.map(([key, val]) => (
        <div key={key} className="flex items-center justify-between gap-2 text-sm">
          <span className="truncate text-muted-foreground">
            {labels?.[key] ?? getCategoryLabel(key, "pt") ?? key}
          </span>
          <span className="shrink-0 font-medium tabular-nums">{val}</span>
        </div>
      ))}
    </div>
  );
}

function QuickActionsGrid({ actions }: { actions: ExecutiveQuickAction[] }) {
  if (actions.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {actions.map((a) => (
        <Link
          key={`${a.href}-${a.label}`}
          href={a.href}
          className="rounded-lg border border-border/70 bg-zinc-900/50 px-3 py-2.5 text-center text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-zinc-900"
        >
          {a.label}
        </Link>
      ))}
    </div>
  );
}

export function ExecutiveDashboardView({
  data,
  loading,
  tenants,
  categories,
  tenantId,
  category,
  periodDays,
  onTenantChange,
  onCategoryChange,
  onPeriodChange,
  onRefresh,
}: {
  data: ExecutiveDashboardDto | null;
  loading: boolean;
  tenants: TenantOption[];
  categories: FixtureCategoryItem[];
  tenantId: string;
  category: string;
  periodDays: number;
  onTenantChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
  onPeriodChange: (v: number) => void;
  onRefresh: () => void;
}) {
  const generated = data?.generatedAt
    ? new Date(data.generatedAt).toLocaleString("pt-BR")
    : null;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 pb-8">
      <header className="flex flex-col gap-4 border-b border-border/60 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/90">
            CUP360
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Dashboard Executivo
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visão estratégica e operacional do futebol
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          {tenants.length > 1 ? (
            <div className="min-w-[180px]">
              <label className="mb-1 block text-[11px] text-muted-foreground">Clube</label>
              <NativeSelectField
                value={tenantId}
                onChange={(e) => onTenantChange(e.target.value)}
                placeholder="Todos"
                options={[{ value: "", label: "Todos os clubes" }, ...tenants.map((t) => ({ value: t.id, label: t.name }))]}
              />
            </div>
          ) : null}
          <div className="min-w-[140px]">
            <label className="mb-1 block text-[11px] text-muted-foreground">Categoria</label>
            <NativeSelectField
              value={category}
              onChange={(e) => onCategoryChange(e.target.value)}
              placeholder="Todas"
              options={[
                { value: "", label: "Todas" },
                ...categories.map((c) => ({ value: c.value, label: c.labelPT })),
              ]}
            />
          </div>
          <div className="min-w-[120px]">
            <label className="mb-1 block text-[11px] text-muted-foreground">Período</label>
            <NativeSelectField
              value={String(periodDays)}
              onChange={(e) => onPeriodChange(Number(e.target.value))}
              options={[
                { value: "7", label: "7 dias" },
                { value: "14", label: "14 dias" },
                { value: "30", label: "30 dias" },
              ]}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 shrink-0"
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Atualizar
          </Button>
        </div>
      </header>

      {generated ? (
        <p className="text-xs text-muted-foreground">
          Dados atualizados · {generated}
        </p>
      ) : null}

      {loading && !data ? (
        <div className="flex min-h-[320px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : data ? (
        <>
          <ExecutiveKpiStrip kpis={data.kpis} />

          <div className="grid gap-4 xl:grid-cols-12">
            <Panel
              id="decisoes"
              title="Central de Decisões"
              icon={ClipboardCheck}
              className="xl:col-span-7"
            >
              <ExecutiveActionList
                items={data.decisions}
                emptyLabel="Nenhuma decisão pendente no escopo atual."
              />
            </Panel>
            <Panel
              id="alertas"
              title="Alertas"
              icon={AlertTriangle}
              className="xl:col-span-5"
            >
              <ExecutiveActionList
                items={data.alerts}
                emptyLabel="Nenhum alerta operacional derivado."
                compact
              />
            </Panel>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.squad ? (
              <Panel title="Elenco" icon={Users}>
                <StatRow label="Atletas ativos" value={data.squad.total} href="/dashboard/cadastros/jogadores" />
                <StatRow label="Suspensos" value={data.squad.suspended} />
                <StatRow label="Próx. suspensão" value={data.squad.nearSuspension} />
                <div className="mt-3 border-t border-border/50 pt-3">
                  <p className="mb-2 text-[11px] font-medium uppercase text-muted-foreground">
                    Por situação
                  </p>
                  <BreakdownGrid data={data.squad.bySituation} labels={SPORTS_SITUATION_LABEL} />
                </div>
                <div className="mt-3 border-t border-border/50 pt-3">
                  <p className="mb-2 text-[11px] font-medium uppercase text-muted-foreground">
                    Disponibilidade
                  </p>
                  <BreakdownGrid data={data.squad.byStatus} labels={PLAYER_STATUS_LABEL} />
                </div>
              </Panel>
            ) : null}

            {data.captacao ? (
              <Panel title="Captação / Try-out" icon={UserPlus}>
                <StatRow label="Prospects ativos" value={data.captacao.active} href="/dashboard/futebol/captacao" />
                <StatRow label="Sem agendamento CT" value={data.captacao.awaitingSchedule} />
                <StatRow label="Aprovação supervisor" value={data.captacao.supervisorApprovalPending} />
                <StatRow label="Fisio pendente" value={data.captacao.physioPending} />
                <StatRow label="Fisio reprovada" value={data.captacao.physioRejected} />
                <div className="mt-3 border-t border-border/50 pt-3">
                  <p className="mb-2 text-[11px] font-medium uppercase text-muted-foreground">
                    Status CT
                  </p>
                  <BreakdownGrid data={data.captacao.byCtStatus} labels={CT_STATUS_LABEL} />
                </div>
                {data.captacao.items.length > 0 ? (
                  <div className="mt-3 border-t border-border/50 pt-1">
                    <ExecutiveActionList items={data.captacao.items.slice(0, 5)} emptyLabel="" compact />
                  </div>
                ) : null}
              </Panel>
            ) : null}

            {data.health ? (
              <Panel title="Saúde — operacional" icon={Stethoscope}>
                <StatRow label="Indisponíveis" value={data.health.unavailable} />
                <StatRow label="Fisio ativo" value={data.health.activePhysio} href="/dashboard/saude/fisioterapia" />
                <StatRow label="Em transição" value={data.health.inTransition} />
                <StatRow label="Saídas CT abertas" value={data.health.medicalDeparturesOpen} />
                <StatRow label="Retorno em atraso" value={data.health.medicalDeparturesOverdue} />
                <StatRow label="Clearance try-out pend." value={data.health.tryoutClearancePending} />
                <StatRow label="Clearance reprovada" value={data.health.tryoutClearanceRejected} />
              </Panel>
            ) : null}

            {data.performance ? (
              <Panel title="Performance" icon={TrendingUp}>
                <StatRow label="Aptos (BID)" value={data.performance.available} />
                <StatRow label="Não aptos" value={data.performance.unavailable} />
                <StatRow
                  label="Avaliações CT pendentes"
                  value={data.performance.pendingCoachEvaluations}
                  href="/dashboard/futebol/treinadores/avaliacao-jogador"
                />
                <StatRow label="Transições ativas" value={data.performance.activeTransitions} />
              </Panel>
            ) : null}

            {data.contracts ? (
              <Panel title="Contratos / RH" icon={FileText}>
                <StatRow label="Vencendo (60d)" value={data.contracts.expiringSoon} href="/dashboard/juridico" />
                <StatRow label="Vencidos" value={data.contracts.expired} />
                <StatRow label="Assinatura pendente" value={data.contracts.pendingSignature} />
                <StatRow label="Cadastro RH pendente" value={data.contracts.registrationPending} href="/dashboard/adm/rh" />
              </Panel>
            ) : null}

            {data.logistics ? (
              <Panel title="Logística" icon={Map}>
                <StatRow label="Próximas viagens/jogos" value={data.logistics.upcoming} href="/dashboard/futebol/logistica" />
                <StatRow label="Planejamento incompleto" value={data.logistics.incompleteConvocation} />
                {data.logistics.items.length > 0 ? (
                  <div className="mt-2 border-t border-border/50 pt-1">
                    <ExecutiveActionList items={data.logistics.items.slice(0, 4)} emptyLabel="" compact />
                  </div>
                ) : null}
              </Panel>
            ) : null}

            {data.finance ? (
              <Panel title="Financeiro" icon={Wallet}>
                <StatRow
                  label="Compras — financeiro"
                  value={data.finance.pendingFinanceiroApprovals}
                  href="/dashboard/adm/financeiro/aprovacoes"
                />
                <StatRow
                  label="Compras — diretoria"
                  value={data.finance.pendingDiretoriaApprovals}
                  href="/dashboard/diretoria/aprovacoes-compras"
                />
                {data.finance.lancamentosPendentes != null ? (
                  <StatRow label="Lançamentos a pagar" value={data.finance.lancamentosPendentes} />
                ) : null}
                {data.finance.lancamentosVencidos != null ? (
                  <StatRow label="Lançamentos vencidos" value={data.finance.lancamentosVencidos} />
                ) : null}
              </Panel>
            ) : null}
          </div>

          <Panel title="Agenda executiva" icon={Calendar}>
            {data.agenda.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhum compromisso no período selecionado.
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {data.agenda.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.actionUrl ?? "/dashboard/futebol/agenda"}
                      className="flex flex-col gap-0.5 py-2.5 transition-colors hover:bg-muted/20 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.type}
                          {item.category ? ` · ${getCategoryLabel(item.category, "pt")}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {formatDateDayMonYear(item.startAt.slice(0, 10))}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {data.quickActions.length > 0 ? (
            <Panel title="Acesso rápido" icon={Target}>
              <QuickActionsGrid actions={data.quickActions} />
            </Panel>
          ) : null}
        </>
      ) : (
        <p className="py-12 text-center text-muted-foreground">
          Não foi possível carregar o dashboard.
        </p>
      )}
    </div>
  );
}
