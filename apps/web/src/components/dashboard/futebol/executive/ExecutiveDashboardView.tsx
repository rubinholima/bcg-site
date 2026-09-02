"use client";

import { Loader2 } from "lucide-react";
import { ExecutiveTopBar } from "./ExecutiveTopBar";
import { ExecutiveKpiStrip } from "./ExecutiveKpiStrip";
import { ExecutiveSportPanel } from "./ExecutiveSportPanel";
import { ExecutiveDecisionsAlertsColumn } from "./ExecutiveDecisionsAlertsColumn";
import { ExecutiveHealthPanel } from "./ExecutiveHealthPanel";
import { ExecutivePerformancePanel } from "./ExecutivePerformancePanel";
import { ExecutiveCaptacaoPipeline } from "./ExecutiveCaptacaoPipeline";
import {
  ExecutiveAgendaPanel,
  ExecutiveContractsPanel,
  ExecutiveFinancePanel,
  ExecutiveLogisticsPanel,
  ExecutiveQuickActionsGrid,
} from "./ExecutiveBottomPanels";
import type { ExecutiveDashboardDto, TenantOption } from "@/lib/futebol-executive-types";
import type { FixtureCategoryItem } from "@/lib/fixture-categories";

function showFinancePanel(data: ExecutiveDashboardDto): boolean {
  const finance = data.finance;
  if (!finance) return false;
  return (
    finance.pendingFinanceiroApprovals > 0 ||
    finance.pendingDiretoriaApprovals > 0 ||
    (finance.lancamentosPendentes ?? 0) > 0 ||
    (finance.lancamentosVencidos ?? 0) > 0
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
  if (loading && !data) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Não foi possível carregar o dashboard.
      </p>
    );
  }

  const financeVisible = showFinancePanel(data);

  return (
    <div className="mx-auto w-full max-w-[1680px] space-y-3 pb-6">
      <ExecutiveTopBar
        tenants={tenants}
        categories={categories}
        tenantId={tenantId}
        category={category}
        periodDays={periodDays}
        generatedAt={data.generatedAt}
        loading={loading}
        onTenantChange={onTenantChange}
        onCategoryChange={onCategoryChange}
        onPeriodChange={onPeriodChange}
        onRefresh={onRefresh}
      />

      <ExecutiveKpiStrip kpis={data.kpis} />

      <div className="grid grid-cols-12 items-start gap-3">
        <div className="col-span-12 space-y-3 xl:col-span-8">
          <ExecutiveSportPanel
            squad={data.squad}
            performance={data.performance}
            logistics={data.logistics}
            agenda={data.agenda}
          />
          {(data.health || data.performance) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {data.health ? <ExecutiveHealthPanel health={data.health} /> : null}
              {data.performance ? (
                <ExecutivePerformancePanel performance={data.performance} />
              ) : null}
            </div>
          )}
          {data.captacao ? <ExecutiveCaptacaoPipeline captacao={data.captacao} /> : null}
          {data.logistics ? <ExecutiveLogisticsPanel logistics={data.logistics} /> : null}
          {financeVisible && data.finance ? (
            <ExecutiveFinancePanel finance={data.finance} />
          ) : null}
        </div>

        <div className="col-span-12 space-y-3 xl:col-span-4">
          <ExecutiveDecisionsAlertsColumn decisions={data.decisions} alerts={data.alerts} />
          {data.contracts ? <ExecutiveContractsPanel contracts={data.contracts} /> : null}
          <ExecutiveAgendaPanel agenda={data.agenda} />
          <ExecutiveQuickActionsGrid actions={data.quickActions} compact />
        </div>
      </div>
    </div>
  );
}
