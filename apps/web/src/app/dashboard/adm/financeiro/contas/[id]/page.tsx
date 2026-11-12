"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useFinanceiroTenant } from "../../financeiro-tenant-shell";

type Summary = {
  account: { id: string; name: string; accountType: string; currency: string };
  pendingPayables: { count: number; total: number };
  pendingReceivables: { count: number; total: number };
  recentMovements: Array<{ id: string; descricao: string; tipo: string; status: string; valor: number; dueDate: string }>;
};

export default function FinanceiroContaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { tenantId } = useFinanceiroTenant();
  const [summary, setSummary] = useState<Summary | null>(null);

  const load = useCallback(async () => {
    if (!tenantId || !id) return;
    const { data } = await api.get<Summary>(`/financeiro/contas/${id}/resumo?tenantId=${tenantId}`);
    setSummary(data);
  }, [tenantId, id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!tenantId || !summary) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{summary.account.name}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p>Tipo: {summary.account.accountType}</p>
          <p>Moeda: {summary.account.currency}</p>
          <p>
            A pagar planejados: {summary.pendingPayables.count} ·{" "}
            {summary.pendingPayables.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
          <p>
            A receber planejados: {summary.pendingReceivables.count} ·{" "}
            {summary.pendingReceivables.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
          <p className="sm:col-span-2 text-xs text-muted-foreground">
            Totais baseados em movimentações registradas no CUP360 — não são saldo bancário oficial.
          </p>
          <Link
            href={`/dashboard/adm/financeiro/contas/fila?tenantId=${tenantId}`}
            className="text-primary text-sm underline-offset-2 hover:underline sm:col-span-2"
          >
            Ver fila de pendentes por conta
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Movimentos recentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {summary.recentMovements.map((m) => (
            <div key={m.id} className="flex justify-between gap-2 border-b border-border/30 pb-2">
              <Link href={`/dashboard/adm/financeiro/lancamentos/${m.id}`} className="text-primary hover:underline">
                {m.descricao}
              </Link>
              <span className="tabular-nums text-foreground">
                {m.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
