"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchBchPublicOrder, type BchPublicOrder } from "@/lib/bch-public-checkout";
import { BchPublicTicketsList } from "@/components/portfolio/bch/BchPublicTicketsList";

export function BchPublicOrderPoll({
  token,
  lang,
  initialOrder,
}: {
  token: string;
  lang: "pt" | "en";
  initialOrder: BchPublicOrder;
}) {
  const [order, setOrder] = useState(initialOrder);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const next = await fetchBchPublicOrder(token);
      if (next) setOrder(next);
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (order.status === "confirmed" && (order.ticketCount ?? 0) > 0) return;
    if (order.status !== "pending" && order.status !== "confirmed") return;
    const id = window.setInterval(() => void refresh(), 6000);
    return () => window.clearInterval(id);
  }, [order.status, order.ticketCount, refresh]);

  const showTickets = order.status === "confirmed" && order.tickets?.length > 0;
  const waitingTickets =
    order.status === "confirmed" && (!order.tickets || order.tickets.length === 0);

  return (
    <>
      {(order.status === "pending" || waitingTickets) && (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-zinc-900/60 p-4">
          <p className="text-center text-sm text-zinc-400">
            {lang === "pt"
              ? "Aguardando confirmação e emissão dos ingressos…"
              : "Waiting for confirmation and ticket issuance…"}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[44px]"
            disabled={refreshing}
            onClick={() => void refresh()}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : lang === "pt" ? (
              "Atualizar"
            ) : (
              "Refresh"
            )}
          </Button>
        </div>
      )}

      {showTickets ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-white">
            {lang === "pt" ? `Ingressos (${order.ticketCount})` : `Tickets (${order.ticketCount})`}
          </h2>
          <p className="mt-2 text-xs text-zinc-500">
            {lang === "pt"
              ? "Apresente o código de barras na entrada (Code 128 · BCH-…)."
              : "Show the barcode at entry (Code 128 · BCH-…)."}
          </p>
          <BchPublicTicketsList tickets={order.tickets} lang={lang} />
        </section>
      ) : null}
    </>
  );
}
