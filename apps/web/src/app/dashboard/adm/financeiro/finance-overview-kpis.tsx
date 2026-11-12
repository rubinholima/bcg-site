"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/cup360/KpiCard";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

type Summary = {
  receitas: number;
  despesas: number;
  resultado: number;
  contasAPagar: number;
  contasAReceber: number;
  vencidoAPagar: number;
  vencidoAReceber: number;
  periodStart: string;
  periodEnd: string;
};

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function FinanceOverviewKpis({ tenantId }: { tenantId: string }) {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    const qs = new URLSearchParams({
      tenantId,
      periodPreset: "this_month",
      dateBasis: "due",
      view: "obligation",
      direction: "ambos",
    });
    void api.get<Summary>(`/financeiro/relatorios/resumo?${qs.toString()}`).then(({ data }) => setSummary(data));
  }, [tenantId]);

  if (!summary) return null;

  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-base">Resumo do período</CardTitle>
        <Button asChild size="sm" variant="outline">
          <Link href="/dashboard/adm/financeiro/relatorios">Relatórios</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          {summary.periodStart} a {summary.periodEnd} · base: vencimento · obrigações
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="A pagar" value={money(summary.contasAPagar)} tone="warning" />
          <KpiCard label="A receber" value={money(summary.contasAReceber)} tone="info" />
          <KpiCard label="Vencidos (pagar)" value={money(summary.vencidoAPagar)} tone="danger" />
          <KpiCard label="Resultado do mês" value={money(summary.resultado)} />
        </div>
      </CardContent>
    </Card>
  );
}
