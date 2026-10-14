"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  BCH_BTN_SECONDARY,
  BCH_CARD,
} from "@/components/dashboard/boston-city-hall/bch-ui-classes";
import { BCH_BASE } from "@/components/dashboard/boston-city-hall/bch-navigation.config";
import type { VenueOperationListItem } from "@/types/boston-city-hall";
import {
  BOOKING_STATUS_LABEL,
  formatProposalDate,
  VENUE_CONTRACT_STATUS_LABEL,
  VENUE_PROPOSAL_STATUS_LABEL,
} from "@/types/boston-city-hall";
import { FeedbackModal } from "@/components/ui/feedback-modal";

type EligibleBooking = {
  bookingId: string;
  title: string;
  startAt: string;
  endAt: string;
  spaceName: string;
  linkedToThisEvent: boolean;
};

export function BostonCityHallEventCommercialPanel({
  eventId,
  booking,
  onLinked,
}: {
  eventId: string;
  booking: VenueOperationListItem | null;
  onLinked?: () => void;
}) {
  const [eligible, setEligible] = useState<EligibleBooking[]>([]);
  const [pickId, setPickId] = useState("");
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [linking, setLinking] = useState(false);
  const [feedback, setFeedback] = useState<{ title: string; message: string; variant: "success" | "error" } | null>(
    null,
  );

  const loadEligible = useCallback(async () => {
    setLoadingEligible(true);
    try {
      const res = await api.get<EligibleBooking[]>(
        `/boston-city-hall/events/${encodeURIComponent(eventId)}/eligible-bookings`,
      );
      setEligible(Array.isArray(res.data) ? res.data : []);
    } catch {
      setEligible([]);
    } finally {
      setLoadingEligible(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (!booking) void loadEligible();
  }, [booking, loadEligible]);

  const linkBooking = async () => {
    if (!pickId) return;
    setLinking(true);
    try {
      await api.post(`/boston-city-hall/bookings/${encodeURIComponent(pickId)}/event-link`, { eventId });
      setFeedback({ title: "Reserva vinculada", message: "O evento foi associado à reserva comercial.", variant: "success" });
      onLinked?.();
    } catch (e) {
      setFeedback({
        title: "Não foi possível vincular",
        message: e instanceof Error ? e.message : "Verifique elegibilidade da reserva.",
        variant: "error",
      });
    } finally {
      setLinking(false);
    }
  };

  return (
    <section className={BCH_CARD + " space-y-3"}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-100">Relacionamento comercial</h2>
        <Button type="button" variant="outline" size="sm" className={BCH_BTN_SECONDARY} asChild>
          <Link href={`${BCH_BASE}/reservas`}>Ver reservas</Link>
        </Button>
      </div>

      {booking ? (
        <div className="grid gap-3 text-sm lg:grid-cols-2">
          <div className="space-y-2 rounded-lg border border-slate-800/80 bg-slate-950/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reserva</p>
            <p className="font-medium text-slate-100">{booking.title}</p>
            <p className="text-slate-400">
              {BOOKING_STATUS_LABEL[booking.bookingStatus as keyof typeof BOOKING_STATUS_LABEL] ?? booking.bookingStatus}
              {" · "}
              {booking.spaceName}
            </p>
            <p className="text-xs text-slate-500">
              {formatProposalDate(booking.startAt)} —{" "}
              {new Date(booking.endAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </p>
            <Button type="button" variant="outline" size="sm" className={BCH_BTN_SECONDARY} asChild>
              <Link href={`${BCH_BASE}/operacao/${booking.bookingId}`}>Abrir operação</Link>
            </Button>
          </div>

          <div className="space-y-2 rounded-lg border border-slate-800/80 bg-slate-950/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contato / lead</p>
            <p>{booking.contactName ?? "—"}</p>
            <p className="text-slate-400">{booking.companyName ?? "—"}</p>
            {booking.pipelineLeadId ? (
              <Button type="button" variant="outline" size="sm" className={BCH_BTN_SECONDARY} asChild>
                <Link href={`${BCH_BASE}/pipeline`}>Abrir funil comercial</Link>
              </Button>
            ) : (
              <p className="text-xs text-slate-500">Sem lead vinculado na reserva.</p>
            )}
          </div>

          <div className="space-y-2 rounded-lg border border-slate-800/80 bg-slate-950/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Proposta</p>
            {booking.proposal ? (
              <>
                <p>
                  {booking.proposal.proposalNumber} ·{" "}
                  {VENUE_PROPOSAL_STATUS_LABEL[booking.proposal.status as keyof typeof VENUE_PROPOSAL_STATUS_LABEL] ??
                    booking.proposal.status}
                </p>
                <Button type="button" variant="outline" size="sm" className={BCH_BTN_SECONDARY} asChild>
                  <Link href={`${BCH_BASE}/propostas/${booking.proposal.id}`}>Abrir proposta</Link>
                </Button>
              </>
            ) : (
              <p className="text-slate-500">Nenhuma proposta vinculada.</p>
            )}
          </div>

          <div className="space-y-2 rounded-lg border border-slate-800/80 bg-slate-950/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contrato</p>
            {booking.contract ? (
              <>
                <p>
                  {booking.contract.contractNumber} ·{" "}
                  {VENUE_CONTRACT_STATUS_LABEL[booking.contract.status as keyof typeof VENUE_CONTRACT_STATUS_LABEL] ??
                    booking.contract.status}
                </p>
                <Button type="button" variant="outline" size="sm" className={BCH_BTN_SECONDARY} asChild>
                  <Link href={`${BCH_BASE}/contratos/${booking.contract.id}`}>Abrir contrato</Link>
                </Button>
              </>
            ) : (
              <p className="text-slate-500">Nenhum contrato vinculado.</p>
            )}
          </div>

          <div className="space-y-2 rounded-lg border border-slate-800/80 bg-slate-950/30 p-3 lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recebíveis</p>
            {booking.finance && booking.receivableId ? (
              <>
                <p className="text-slate-300">
                  Status: {booking.finance.status} · Saldo {booking.finance.balance}
                </p>
                <Button type="button" variant="outline" size="sm" className={BCH_BTN_SECONDARY} asChild>
                  <Link href={`${BCH_BASE}/financeiro/${booking.receivableId}`}>Ver recebível</Link>
                </Button>
              </>
            ) : (
              <p className="text-slate-500">Sem recebível registrado para esta reserva.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3 text-sm text-slate-400">
          <p>Evento sem reserva comercial. Isso é válido para eventos internos.</p>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-1">
              <Label>Vincular reserva confirmada existente</Label>
              {loadingEligible ? (
                <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
              ) : (
                <NativeSelect value={pickId} onChange={(e) => setPickId(e.target.value)}>
                  <option value="">Selecione…</option>
                  {eligible.map((b) => (
                    <option key={b.bookingId} value={b.bookingId}>
                      {b.title} · {b.spaceName} · {new Date(b.startAt).toLocaleDateString("pt-BR")}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </div>
            <Button type="button" disabled={!pickId || linking} className="min-h-[44px]" onClick={() => void linkBooking()}>
              {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Vincular"}
            </Button>
          </div>
          <Button type="button" variant="outline" size="sm" className={BCH_BTN_SECONDARY} onClick={() => void loadEligible()}>
            Atualizar lista
          </Button>
        </div>
      )}

      <FeedbackModal
        open={!!feedback}
        onOpenChange={(o) => !o && setFeedback(null)}
        variant={feedback?.variant ?? "error"}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
      />
    </section>
  );
}
