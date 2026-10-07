"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import type { BchPublicEventDetail } from "@/lib/bch-public-events";
import { BCH_TICKET_AVAILABILITY_LABEL } from "@/lib/bch-public-events";
import {
  canPurchaseTickets,
  formatCheckoutMoney,
  generateCheckoutIdempotencyKey,
  submitBchPublicOrder,
  type CheckoutLineSelection,
} from "@/lib/bch-public-checkout";
import { FeedbackModal } from "@/components/ui/feedback-modal";

type Step = "tickets" | "buyer" | "review" | "done";

function maxQtyForType(purchaseLimit: number | null): number {
  if (purchaseLimit != null && purchaseLimit > 0) return purchaseLimit;
  return 10;
}

export function BchCheckoutFlow({
  event,
  portfolioSlug,
  lang,
}: {
  event: BchPublicEventDetail;
  portfolioSlug: string;
  lang: "pt" | "en";
}) {
  const [step, setStep] = useState<Step>("tickets");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [idempotencyKey] = useState(() => generateCheckoutIdempotencyKey());

  const types = event.ticketing?.types ?? [];
  const purchasable = types.filter((t) => canPurchaseTickets(t.availability));

  const lines = useMemo((): Array<CheckoutLineSelection & { label: string; unitPrice: string; currency: string }> => {
    const out: Array<CheckoutLineSelection & { label: string; unitPrice: string; currency: string }> = [];
    for (const t of purchasable) {
      const q = quantities[t.ticketTypeId] ?? 0;
      if (q <= 0) continue;
      const price = t.currentLot?.price ?? t.price ?? "0";
      out.push({
        ticketTypeId: t.ticketTypeId,
        ticketLotId: t.currentLot?.ticketLotId ?? null,
        quantity: q,
        label: t.currentLot ? `${t.name} — ${t.currentLot.name}` : t.name,
        unitPrice: price,
        currency: t.currency,
      });
    }
    return out;
  }, [purchasable, quantities]);

  const reviewSubtotal = useMemo(() => {
    let sum = 0;
    for (const line of lines) {
      sum += Number(line.unitPrice) * line.quantity;
    }
    return sum;
  }, [lines]);

  const currency = types[0]?.currency ?? "USD";

  const setQty = useCallback((typeId: string, delta: number, max: number) => {
    setQuantities((prev) => {
      const cur = prev[typeId] ?? 0;
      const next = Math.min(max, Math.max(0, cur + delta));
      return { ...prev, [typeId]: next };
    });
  }, []);

  const t = {
    stepTickets: lang === "pt" ? "Ingressos" : "Tickets",
    stepBuyer: lang === "pt" ? "Seus dados" : "Your details",
    stepReview: lang === "pt" ? "Revisar" : "Review",
    next: lang === "pt" ? "Continuar" : "Continue",
    back: lang === "pt" ? "Voltar" : "Back",
    submit: lang === "pt" ? "Confirmar pedido" : "Confirm order",
    name: lang === "pt" ? "Nome completo" : "Full name",
    email: lang === "pt" ? "E-mail" : "Email",
    phone: lang === "pt" ? "Telefone (opcional)" : "Phone (optional)",
    empty: lang === "pt" ? "Selecione ao menos um ingresso." : "Select at least one ticket.",
    reviewNote:
      lang === "pt"
        ? "Valores finais confirmados pelo servidor ao criar o pedido."
        : "Final amounts are confirmed by the server when the order is created.",
    eventLabel: lang === "pt" ? "Evento" : "Event",
    total: lang === "pt" ? "Total estimado" : "Estimated total",
    unavailable:
      lang === "pt"
        ? "Não há ingressos disponíveis para compra no momento."
        : "No tickets available for purchase at this time.",
  };

  async function handleSubmit() {
    if (!lines.length) {
      setErrorMessage(t.empty);
      setErrorOpen(true);
      return;
    }
    setSubmitting(true);
    try {
      const order = await submitBchPublicOrder(event.slug, {
        idempotencyKey,
        items: lines.map(({ ticketTypeId, ticketLotId, quantity }) => ({
          ticketTypeId,
          ticketLotId,
          quantity,
        })),
        customer: { name: name.trim(), email: email.trim(), phone: phone.trim() || undefined },
      });
      window.location.href = order.orderPath;
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Erro ao criar pedido.");
      setErrorOpen(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (!event.ticketing?.enabled || purchasable.length === 0) {
    return (
      <p className="rounded-xl border border-white/10 bg-zinc-900/80 p-6 text-center text-zinc-400">
        {t.unavailable}
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <ol className="mb-8 flex gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500 sm:text-sm">
        <li className={step === "tickets" ? "text-amber-400" : ""}>1. {t.stepTickets}</li>
        <li className={step === "buyer" ? "text-amber-400" : ""}>2. {t.stepBuyer}</li>
        <li className={step === "review" ? "text-amber-400" : ""}>3. {t.stepReview}</li>
      </ol>

      {step === "tickets" && (
        <div className="space-y-4">
          {purchasable.map((type) => {
            const max = maxQtyForType(type.purchaseLimit);
            const q = quantities[type.ticketTypeId] ?? 0;
            const unit = type.currentLot?.price ?? type.price;
            return (
              <div
                key={type.ticketTypeId}
                className="rounded-xl border border-white/10 bg-zinc-900/80 p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-medium text-white">{type.name}</p>
                    {type.currentLot && (
                      <p className="text-sm text-zinc-500">{type.currentLot.name}</p>
                    )}
                    <p className="mt-1 text-sm text-amber-400/90">
                      {unit ? formatCheckoutMoney(unit, type.currency) : "—"}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {BCH_TICKET_AVAILABILITY_LABEL[type.availability]}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label={lang === "pt" ? "Diminuir quantidade" : "Decrease quantity"}
                      className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-zinc-950 text-white hover:bg-white/5"
                      onClick={() => setQty(type.ticketTypeId, -1, max)}
                      disabled={q <= 0}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="min-w-[2rem] text-center text-lg font-semibold">{q}</span>
                    <button
                      type="button"
                      aria-label={lang === "pt" ? "Aumentar quantidade" : "Increase quantity"}
                      className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-zinc-950 text-white hover:bg-white/5"
                      onClick={() => setQty(type.ticketTypeId, 1, max)}
                      disabled={q >= max}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          <button
            type="button"
            className="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-amber-500/90 font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
            disabled={lines.length === 0}
            onClick={() => setStep("buyer")}
          >
            {t.next}
          </button>
        </div>
      )}

      {step === "buyer" && (
        <div className="space-y-4">
          <div>
            <label htmlFor="bch-name" className="mb-1 block text-sm text-zinc-400">
              {t.name}
            </label>
            <input
              id="bch-name"
              className="w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-foreground"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>
          <div>
            <label htmlFor="bch-email" className="mb-1 block text-sm text-zinc-400">
              {t.email}
            </label>
            <input
              id="bch-email"
              type="email"
              className="w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-foreground"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="bch-phone" className="mb-1 block text-sm text-zinc-400">
              {t.phone}
            </label>
            <input
              id="bch-phone"
              type="tel"
              className="w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-foreground"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              className="min-h-[48px] flex-1 rounded-xl border border-white/10 text-zinc-300"
              onClick={() => setStep("tickets")}
            >
              {t.back}
            </button>
            <button
              type="button"
              className="min-h-[48px] flex-1 rounded-xl bg-amber-500/90 font-semibold text-zinc-950 hover:bg-amber-400"
              disabled={!name.trim() || !email.trim()}
              onClick={() => setStep("review")}
            >
              {t.next}
            </button>
          </div>
        </div>
      )}

      {step === "review" && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-500">{t.reviewNote}</p>
          <div className="rounded-xl border border-white/10 bg-zinc-900/80 p-4 text-sm">
            <p className="text-zinc-400">{t.eventLabel}</p>
            <p className="font-medium text-white">{event.name}</p>
            <ul className="mt-4 space-y-2 border-t border-white/10 pt-4">
              {lines.map((line) => (
                <li key={line.ticketTypeId} className="flex justify-between gap-4">
                  <span className="text-zinc-300">
                    {line.quantity}× {line.label}
                  </span>
                  <span className="text-zinc-400">
                    {formatCheckoutMoney(String(Number(line.unitPrice) * line.quantity), line.currency)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex justify-between border-t border-white/10 pt-4 font-semibold text-white">
              <span>{t.total}</span>
              <span>{formatCheckoutMoney(String(reviewSubtotal), currency)}</span>
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-zinc-950/50 p-4 text-sm text-zinc-400">
            <p>{name}</p>
            <p>{email}</p>
            {phone ? <p>{phone}</p> : null}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              className="min-h-[48px] flex-1 rounded-xl border border-white/10 text-zinc-300"
              onClick={() => setStep("buyer")}
              disabled={submitting}
            >
              {t.back}
            </button>
            <button
              type="button"
              className="min-h-[48px] flex-1 rounded-xl bg-amber-500/90 font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-60"
              disabled={submitting}
              onClick={() => void handleSubmit()}
            >
              {submitting ? "…" : t.submit}
            </button>
          </div>
        </div>
      )}

      <p className="mt-8 text-center text-sm">
        <Link
          href={`/portfolio/${portfolioSlug}/events/${encodeURIComponent(event.slug)}`}
          className="text-amber-400 hover:underline"
        >
          ← {lang === "pt" ? "Voltar ao evento" : "Back to event"}
        </Link>
      </p>

      <FeedbackModal
        open={errorOpen}
        onOpenChange={setErrorOpen}
        variant="error"
        title={lang === "pt" ? "Não foi possível continuar" : "Could not continue"}
        message={errorMessage}
      />
    </div>
  );
}
