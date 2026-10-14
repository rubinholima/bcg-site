"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { BCH_BASE } from "@/components/dashboard/boston-city-hall/bch-navigation.config";
import type { BchEventFinancialResult } from "@/types/boston-city-hall";

type CheckinSummary = { issued: number; accepted: number; duplicate: number; rejected: number };

export function BostonCityHallEventClosingPanel({ eventId }: { eventId: string }) {
  const [financial, setFinancial] = useState<BchEventFinancialResult | null>(null);
  const [checkin, setCheckin] = useState<CheckinSummary | null>(null);
  const [openCash, setOpenCash] = useState(0);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [fin, chk, cash] = await Promise.all([
        api.get<BchEventFinancialResult>(`/boston-city-hall/events/${encodeURIComponent(eventId)}/financial-result`),
        api.get<CheckinSummary>(`/boston-city-hall/events/${encodeURIComponent(eventId)}/checkin/summary`),
        api.get<{ id: string; status: string }[]>(
          `/boston-city-hall/events/${encodeURIComponent(eventId)}/pos/cash-sessions?limit=50`,
        ),
      ]);
      setFinancial(fin.data);
      setCheckin(chk.data);
      const sessions = Array.isArray(cash.data) ? cash.data : [];
      setOpenCash(sessions.filter((s) => s.status === "open").length);
    } catch {
      setFinancial(null);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const complete = financial?.completeness.resultComplete ?? false;
  const items = [
    {
      label: "Bilheteria configurada ou desligada",
      ok:
        !!financial?.completeness.ticketingConfigured ||
        (financial?.revenue.ticketing.confirmedOrderCount ?? 0) === 0,
    },
    { label: "Fechamento de bar finalizado", ok: financial?.completeness.barCloseFinalized ?? false },
    { label: "Custos de bar completos", ok: financial?.completeness.barCostComplete ?? false },
    { label: "Recebível venue vinculado (se reserva)", ok: financial?.completeness.receivableLinked ?? false },
    { label: "Caixas POS fechados", ok: openCash === 0 },
    { label: "Contrato assinado (se aplicável)", ok: financial?.completeness.venueContractLinked ?? false },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-800/80 p-4">
        <p className="text-sm font-medium text-slate-200">Prontidão financeira</p>
        <p className="mt-1 text-xs text-slate-400">
          Resultado operacional: {complete ? "completo para fechar" : "pendências abertas"}
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          {items.map((it) => (
            <li key={it.label} className={it.ok ? "text-emerald-300" : "text-amber-200"}>
              {it.ok ? "✓" : "○"} {it.label}
            </li>
          ))}
        </ul>
      </div>

      {checkin ? (
        <div className="rounded-lg border border-slate-800/80 p-4 text-sm text-slate-300">
          <p className="font-medium text-slate-100">Check-in</p>
          <p className="mt-1">
            {checkin.accepted} entradas · {checkin.duplicate} duplicadas · {checkin.rejected} rejeitadas ·{" "}
            {checkin.issued} emitidos
          </p>
        </div>
      ) : null}

      {financial ? (
        <div className="rounded-lg border border-slate-800/80 p-4 text-sm">
          <p className="font-medium text-slate-100">Resumo financeiro</p>
          <dl className="mt-2 grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-slate-400">Receita bruta</dt>
              <dd>{financial.result.grossOperationalRevenue ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Custo conhecido</dt>
              <dd>{financial.cost.totalKnownOperationalCost ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Mão de obra / serviços</dt>
              <dd>{financial.cost.otherKnownOperationalCost ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Resultado</dt>
              <dd>{financial.result.operationalResult ?? "—"}</dd>
            </div>
          </dl>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" className="min-h-[44px]">
          <Link href={`${BCH_BASE}/eventos/${encodeURIComponent(eventId)}?sec=bar`}>Bar e estoque</Link>
        </Button>
        <Button asChild variant="outline" className="min-h-[44px]">
          <Link href={`${BCH_BASE}/eventos/${encodeURIComponent(eventId)}/pos`}>POS tablet</Link>
        </Button>
        <Button asChild variant="outline" className="min-h-[44px]">
          <Link href={`${BCH_BASE}/eventos/${encodeURIComponent(eventId)}?sec=financeiro`}>Financeiro</Link>
        </Button>
      </div>
    </div>
  );
}
