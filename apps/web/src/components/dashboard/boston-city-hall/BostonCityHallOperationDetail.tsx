"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, ExternalLink, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { authFetch } from "@/lib/authFetch";
import { agendaHubUrl, AGENDA_VISAO } from "@/lib/agenda-hub";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { BostonCityHallBookingEventDialog } from "@/components/dashboard/boston-city-hall/BostonCityHallBookingEventDialog";
import type { VenueOperationDetail } from "@/types/boston-city-hall";
import {
  BOOKING_STATUS_LABEL,
  formatCatalogMoney,
  formatProposalDate,
  PIPELINE_STAGE_LABEL,
  RECEIVABLE_STATUS_COLOR,
  RECEIVABLE_STATUS_LABEL,
  BOOKING_STATUSES,
  EVENT_STATUS_LABEL,
  VENUE_CONTRACT_STATUS_LABEL,
  VENUE_PROPOSAL_STATUS_LABEL,
} from "@/types/boston-city-hall";
import { cn } from "@/lib/utils";
import { bchEventSetupPathWithBooking } from "@/components/dashboard/boston-city-hall/bch-event-setup-path";
import { BCH_BASE } from "./boston-city-hall-lead-shared";

function formatWhen(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const date = start.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const t1 = start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const t2 = end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${t1}–${t2}`;
}

function alertClass(severity: string): string {
  if (severity === "danger") return "bg-red-500/15 text-red-200 ring-red-500/30";
  if (severity === "warning") return "bg-amber-500/15 text-amber-200 ring-amber-500/30";
  return "bg-sky-500/15 text-sky-200 ring-sky-500/30";
}

export function BostonCityHallOperationDetail({ bookingId }: { bookingId: string }) {
  const [row, setRow] = useState<VenueOperationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [eventDialogOpen, setEventDialogOpen] = useState(false);

  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: "success" | "error";
  }>({ open: false, title: "", message: "", variant: "success" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<VenueOperationDetail>(`/boston-city-hall/operations/${bookingId}`);
      setRow(res.data);
      setStatus(res.data.bookingStatus);
      setNotes(res.data.notes ?? "");
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Operação não encontrada.",
        variant: "error",
      });
      setRow(null);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveBooking = async () => {
    setSaving(true);
    try {
      await api.patch(`/boston-city-hall/bookings/${bookingId}`, {
        status,
        notes: notes.trim() || null,
      });
      await load();
      setFeedback({
        open: true,
        title: "Salvo",
        message: "Reserva atualizada.",
        variant: "success",
      });
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível salvar.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const downloadContractPdf = async (contractId: string, contractNumber: string) => {
    try {
      const res = await authFetch(`/api/boston-city-hall/contracts/${contractId}/pdf`);
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contrato-${contractNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setFeedback({
        open: true,
        title: "PDF",
        message: e instanceof Error ? e.message : "Falha ao baixar PDF.",
        variant: "error",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!row) {
    return <p className="text-sm text-muted-foreground">Evento indisponível.</p>;
  }

  const primaryProposal = row.proposal ?? row.proposals[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" asChild className="w-fit">
          <Link href={`${BCH_BASE}/operacao`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild className="min-h-[44px]">
            <Link href={agendaHubUrl(AGENDA_VISAO.BOSTON_HALL)}>
              <CalendarDays className="mr-2 h-4 w-4" />
              Abrir na agenda
            </Link>
          </Button>
          <Button variant="outline" asChild className="min-h-[44px]">
            <Link href={`${BCH_BASE}/reservas?edit=${encodeURIComponent(bookingId)}`}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir reserva
            </Link>
          </Button>
        </div>
      </div>

      {row.alerts.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {row.alerts.map((a) => (
            <span
              key={a.code}
              className={cn(
                "inline-flex rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                alertClass(a.severity),
              )}
            >
              {a.label}
            </span>
          ))}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Resumo do evento</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <span className="text-muted-foreground">Título</span>
            <p className="font-medium">{row.title}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Tipo</span>
            <p>{row.eventType ?? "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Data e horário</span>
            <p>{formatWhen(row.startAt, row.endAt)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Espaço</span>
            <p>{row.spaceName}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Convidados</span>
            <p>{row.guestCount ?? "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Status da reserva</span>
            <p>{BOOKING_STATUS_LABEL[row.bookingStatus] ?? row.bookingStatus}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cliente</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <span className="text-muted-foreground">Contato</span>
            <p className="font-medium">{row.contactName ?? "—"}</p>
            {row.companyName ? <p className="text-muted-foreground">{row.companyName}</p> : null}
          </div>
          <div>
            <span className="text-muted-foreground">E-mail / telefone</span>
            <p>{row.contactEmail ?? "—"}</p>
            <p>{row.contactPhone ?? "—"}</p>
          </div>
          {row.lead ? (
            <div className="sm:col-span-2">
              <span className="text-muted-foreground">Lead</span>
              <p>
                <Link href={`${BCH_BASE}/crm`} className="text-violet-300 hover:underline">
                  {row.lead.contactName}
                </Link>
                <span className="text-muted-foreground">
                  {" "}
                  · {PIPELINE_STAGE_LABEL[row.lead.stage] ?? row.lead.stage}
                </span>
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comercial</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {primaryProposal ? (
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Link
                  href={`${BCH_BASE}/propostas/${primaryProposal.id}`}
                  className="font-medium text-violet-300 hover:underline"
                >
                  {primaryProposal.proposalNumber}
                </Link>
                <p className="text-muted-foreground">
                  {VENUE_PROPOSAL_STATUS_LABEL[primaryProposal.status] ?? primaryProposal.status} ·{" "}
                  {formatCatalogMoney(primaryProposal.total)}
                </p>
              </div>
              <Button variant="link" size="sm" asChild className="h-auto p-0">
                <Link href={`${BCH_BASE}/propostas/${primaryProposal.id}`}>Abrir proposta</Link>
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground">Sem proposta vinculada.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contrato</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {row.contract ? (
            <div className="space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Link
                    href={`${BCH_BASE}/contratos/${row.contract.id}`}
                    className="font-medium text-violet-300 hover:underline"
                  >
                    {row.contract.contractNumber}
                  </Link>
                  <p className="text-muted-foreground">
                    {VENUE_CONTRACT_STATUS_LABEL[row.contract.status] ?? row.contract.status} ·{" "}
                    {formatCatalogMoney(row.contract.total)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`${BCH_BASE}/contratos/${row.contract.id}`}>Abrir contrato</Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void downloadContractPdf(row.contract!.id, row.contract!.contractNumber)}
                  >
                    PDF
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Sem contrato.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Evento (plataforma)</CardTitle>
          {row.event ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild className="min-h-[44px]">
                <Link href={bchEventSetupPathWithBooking(row.event.id, bookingId)}>
                  Preparar evento
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="min-h-[44px]">
                <Link
                  href={`${BCH_BASE}/eventos/${row.event.id}/financeiro?bookingId=${encodeURIComponent(bookingId)}`}
                >
                  Resultado financeiro
                </Link>
              </Button>
            </div>
          ) : row.bookingStatus === "confirmed" ? (
            <Button
              type="button"
              size="sm"
              className="min-h-[44px]"
              onClick={() => setEventDialogOpen(true)}
            >
              Criar evento
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="text-sm">
          {row.event ? (
            <>
              <p className="font-medium">{row.event.name}</p>
              <p className="text-muted-foreground">
                {EVENT_STATUS_LABEL[row.event.status] ?? row.event.status}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">
              {row.bookingStatus === "confirmed"
                ? "Evento ainda não criado para esta reserva."
                : "Criação disponível apenas para reserva confirmada."}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Financeiro</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          {row.finance && row.receivableId ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                    RECEIVABLE_STATUS_COLOR[row.finance.status] ?? RECEIVABLE_STATUS_COLOR.unpaid,
                  )}
                >
                  {RECEIVABLE_STATUS_LABEL[row.finance.status] ?? row.finance.status}
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <div>
                  <span className="text-muted-foreground">Contratado</span>
                  <p>{formatCatalogMoney(row.finance.originalAmount)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Pago</span>
                  <p>{formatCatalogMoney(row.finance.totalPaid)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Saldo</span>
                  <p className="font-medium">{formatCatalogMoney(row.finance.balance)}</p>
                </div>
              </div>
              {row.finance.nextDueDate ? (
                <p className="text-muted-foreground">
                  Próximo venc.: {formatProposalDate(row.finance.nextDueDate)}
                  {row.finance.nextDueAmount
                    ? ` · ${formatCatalogMoney(row.finance.nextDueAmount)}`
                    : ""}
                </p>
              ) : null}
              <Button variant="outline" size="sm" asChild className="min-h-[44px]">
                <Link href={`${BCH_BASE}/financeiro/${row.receivableId}`}>Abrir financeiro</Link>
              </Button>
            </>
          ) : (
            <p className="text-muted-foreground">Financeiro não criado.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Observações operacionais</CardTitle>
          <Button
            type="button"
            size="sm"
            disabled={saving}
            onClick={() => void saveBooking()}
            className="min-h-[44px]"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="op-status">Status da reserva</Label>
            <NativeSelect
              id="op-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {BOOKING_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {BOOKING_STATUS_LABEL[s] ?? s}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="op-notes">Notas (campo da reserva)</Label>
            <Textarea
              id="op-notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <BostonCityHallBookingEventDialog
        bookingId={bookingId}
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
        onCreated={async () => {
          await load();
          setFeedback({
            open: true,
            title: "Evento criado",
            message: "Rascunho vinculado. Continue em Preparar evento para publicar.",
            variant: "success",
          });
        }}
        onError={(message) =>
          setFeedback({
            open: true,
            title: "Evento",
            message,
            variant: "error",
          })
        }
      />

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.variant}
      />
    </div>
  );
}
