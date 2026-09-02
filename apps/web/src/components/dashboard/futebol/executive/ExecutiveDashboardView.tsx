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
  ExecutiveBottomPanels,
  ExecutiveQuickActionsGrid,
} from "./ExecutiveBottomPanels";
import type { ExecutiveDashboardDto, TenantOption } from "@/lib/futebol-executive-types";
import type { FixtureCategoryItem } from "@/lib/fixture-categories";

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

      <div className="grid grid-cols-12 gap-3">
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
        </div>
        <div className="col-span-12 xl:col-span-4">
          <ExecutiveDecisionsAlertsColumn decisions={data.decisions} alerts={data.alerts} />
        </div>
      </div>

      <ExecutiveBottomPanels
        contracts={data.contracts}
        logistics={data.logistics}
        agenda={data.agenda}
        finance={data.finance}
      />

      <ExecutiveQuickActionsGrid actions={data.quickActions} />
    </div>
  );
}
