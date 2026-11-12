"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { KpiCard } from "@/components/dashboard/cup360/KpiCard";

export type RhDashboardKpiData = {
  employees: number;
  activeEmployments: number;
  pendingHiring: number;
  medicalPending: number;
  legalPending: number;
  accountingPending: number;
};

type Props = {
  tenantId: string;
  onFilterHiring?: (status: string) => void;
};

export function RhDashboardKpis({ tenantId, onFilterHiring }: Props) {
  const [data, setData] = useState<RhDashboardKpiData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
      const { data: res } = await api.get<RhDashboardKpiData>(`/rh/dashboard/kpis${qs}`);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando indicadores…
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <KpiCard label="Colaboradores" value={String(data.employees)} />
      <KpiCard label="Vínculos ativos" value={String(data.activeEmployments)} />
      <button type="button" className="text-left" onClick={() => onFilterHiring?.("")}>
        <KpiCard label="Contratações em andamento" value={String(data.pendingHiring)} />
      </button>
      <button type="button" className="text-left" onClick={() => onFilterHiring?.("exame_agendado")}>
        <KpiCard label="Exame pendente" value={String(data.medicalPending)} />
      </button>
      <button type="button" className="text-left" onClick={() => onFilterHiring?.("juridico")}>
        <KpiCard label="Jurídico" value={String(data.legalPending)} />
      </button>
      <button type="button" className="text-left" onClick={() => onFilterHiring?.("contabilidade")}>
        <KpiCard label="Contabilidade" value={String(data.accountingPending)} />
      </button>
    </div>
  );
}

export function RhProfileLink({ employeeId }: { employeeId: string }) {
  return (
    <Link
      href={`/dashboard/adm/rh/colaboradores/${employeeId}`}
      className="text-violet-400 hover:text-violet-300 text-sm font-medium min-h-[44px] inline-flex items-center"
    >
      Ver ficha unificada
    </Link>
  );
}
