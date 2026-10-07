"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BCH_PASSWORDLESS_NEUTRAL_MESSAGE,
  fetchBchMyTickets,
  requestBchMyTicketsAccess,
  type BchMyTicketsList,
} from "@/lib/bch-my-tickets";
import { formatCheckoutMoney } from "@/lib/bch-public-checkout";
import { BchPublicTicketsList } from "@/components/portfolio/bch/BchPublicTicketsList";
import { FeedbackModal } from "@/components/ui/feedback-modal";

type Props = {
  lang: "pt" | "en";
};

export function BchMyTicketsClient({ lang }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [data, setData] = useState<BchMyTicketsList | null | undefined>(undefined);
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);

  const loadList = useCallback(async () => {
    setListLoading(true);
    try {
      const result = await fetchBchMyTickets();
      setData(result);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const out = await requestBchMyTicketsAccess(email.trim());
      setFeedback({
        title: lang === "pt" ? "Solicitação recebida" : "Request received",
        message: out.message || BCH_PASSWORDLESS_NEUTRAL_MESSAGE,
      });
    } catch (err) {
      setFeedback({
        title: lang === "pt" ? "Não foi possível continuar" : "Could not continue",
        message: err instanceof Error ? err.message : "Erro",
      });
    } finally {
      setLoading(false);
    }
  }

  const hasSession = data !== null && data !== undefined;

  return (
    <>
      <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-xl border border-white/10 bg-zinc-900/80 p-5">
        <label className="block text-sm text-zinc-400">
          {lang === "pt" ? "E-mail usado na compra" : "Purchase email"}
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-3 text-foreground text-white"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-60 min-h-[44px]"
        >
          {loading
            ? lang === "pt"
              ? "Enviando…"
              : "Sending…"
            : lang === "pt"
              ? "Enviar link de acesso"
              : "Send access link"}
        </button>
      </form>

      {listLoading ? (
        <p className="mt-8 text-center text-sm text-zinc-500">{lang === "pt" ? "Carregando…" : "Loading…"}</p>
      ) : hasSession && data && data.orders.length > 0 ? (
        <div className="mt-10 space-y-8">
          <p className="text-sm text-zinc-400">
            {lang === "pt" ? "Ingressos para" : "Tickets for"} <span className="text-zinc-200">{data.email}</span>
          </p>
          {data.orders.map((order) => (
            <section key={order.publicAccessToken} className="rounded-xl border border-white/10 bg-zinc-900/60 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-semibold text-white">{order.event.name}</h2>
                <Link href={order.orderPath} className="text-xs text-amber-400 hover:underline">
                  {order.orderNumber}
                </Link>
              </div>
              <p className="mt-1 text-sm text-zinc-500">
                {formatCheckoutMoney(order.total, order.currency)} · {order.ticketCount}{" "}
                {lang === "pt" ? "ingresso(s)" : "ticket(s)"}
              </p>
              <Link href={order.event.detailPath} className="mt-2 inline-block text-xs text-zinc-400 hover:text-amber-400">
                {lang === "pt" ? "Ver evento" : "View event"}
              </Link>
              <BchPublicTicketsList tickets={order.tickets} lang={lang} />
            </section>
          ))}
        </div>
      ) : hasSession && data ? (
        <p className="mt-8 text-center text-sm text-zinc-500">
          {lang === "pt"
            ? "Nenhum pedido confirmado encontrado para esta sessão."
            : "No confirmed orders for this session."}
        </p>
      ) : (
        <p className="mt-6 text-center text-xs text-zinc-500">
          {lang === "pt"
            ? "Após abrir o link do e-mail, seus ingressos aparecem aqui."
            : "After opening the email link, your tickets appear here."}
        </p>
      )}

      <FeedbackModal
        open={Boolean(feedback)}
        onOpenChange={(open) => !open && setFeedback(null)}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
      />
    </>
  );
}
