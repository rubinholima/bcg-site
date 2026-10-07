"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { VenueReceivable } from "@/types/boston-city-hall";
import {
  formatCatalogMoney,
  formatProposalDate,
  INSTALLMENT_STATUS_LABEL,
  RECEIVABLE_STATUS_COLOR,
  RECEIVABLE_STATUS_LABEL,
  VENUE_PAYMENT_METHOD_LABEL,
  VENUE_PAYMENT_METHODS,
} from "@/types/boston-city-hall";
import { cn } from "@/lib/utils";
import { BCH_BASE } from "./boston-city-hall-lead-shared";

function todayDateInput(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function BostonCityHallFinanceDetail({ receivableId }: { receivableId: string }) {
  const [row, setRow] = useState<VenueReceivable | null>(null);
  const [loading, setLoading] = useState(true);
  const [payOpen, setPayOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [installmentId, setInstallmentId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [paidAt, setPaidAt] = useState(todayDateInput());
  const [paymentMethod, setPaymentMethod] = useState("zelle");
  const [reference, setReference] = useState("");
  const [payNotes, setPayNotes] = useState("");

  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: "success" | "error";
  }>({ open: false, title: "", message: "", variant: "success" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<VenueReceivable>(`/boston-city-hall/finance/${receivableId}`);
      setRow(res.data);
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Financeiro não encontrado.",
        variant: "error",
      });
      setRow(null);
    } finally {
      setLoading(false);
    }
  }, [receivableId]);

  useEffect(() => {
    void load();
  }, [load]);

  const openInstallments = useMemo(() => {
    if (!row) return [];
    return row.installments.filter((i) => i.status !== "paid" && i.status !== "cancelled");
  }, [row]);

  const allPayments = useMemo(() => {
    if (!row) return [];
    return row.installments.flatMap((inst) =>
      inst.payments.map((p) => ({
        ...p,
        installmentLabel: inst.label ?? `Parcela ${inst.sequence}`,
      })),
    );
  }, [row]);

  const openPayDialog = () => {
    const first = openInstallments[0];
    setInstallmentId(first?.id ?? "");
    setPayAmount(first?.balance ?? "");
    setPaidAt(todayDateInput());
    setPaymentMethod("zelle");
    setReference("");
    setPayNotes("");
    setPayOpen(true);
  };

  const onInstallmentPick = (id: string) => {
    setInstallmentId(id);
    const inst = row?.installments.find((i) => i.id === id);
    if (inst) setPayAmount(inst.balance);
  };

  const submitPayment = async () => {
    setSaving(true);
    try {
      const paidIso = paidAt ? `${paidAt}T12:00:00.000Z` : new Date().toISOString();
      const res = await api.post<VenueReceivable>(
        `/boston-city-hall/finance/${receivableId}/payments`,
        {
          installmentId,
          amount: payAmount,
          paidAt: paidIso,
          paymentMethod,
          reference: reference.trim() || undefined,
          notes: payNotes.trim() || undefined,
        },
      );
      setRow(res.data);
      setPayOpen(false);
      setFeedback({
        open: true,
        title: "Pagamento registrado",
        message: "Valor aplicado à parcela.",
        variant: "success",
      });
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível registrar.",
        variant: "error",
      });
    } finally {
      setSaving(false);
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
    return <p className="text-sm text-muted-foreground">Financeiro indisponível.</p>;
  }

  const canPay = row.status !== "cancelled" && openInstallments.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" asChild className="w-fit">
          <Link href={`${BCH_BASE}/financeiro`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <Button
          type="button"
          onClick={openPayDialog}
          disabled={!canPay}
          className="min-h-[44px]"
        >
          <Plus className="mr-2 h-4 w-4" />
          Registrar pagamento
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Resumo</CardTitle>
          <span
            className={cn(
              "inline-flex rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
              RECEIVABLE_STATUS_COLOR[row.status] ?? RECEIVABLE_STATUS_COLOR.unpaid,
            )}
          >
            {RECEIVABLE_STATUS_LABEL[row.status] ?? row.status}
          </span>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <span className="text-muted-foreground">Cliente</span>
            <p className="font-medium">{row.contactName}</p>
            {row.companyName ? <p className="text-muted-foreground">{row.companyName}</p> : null}
          </div>
          <div>
            <span className="text-muted-foreground">Contrato</span>
            <p>
              <Link href={`${BCH_BASE}/contratos/${row.contractId}`} className="text-violet-300 hover:underline">
                {row.contractNumber}
              </Link>
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Evento</span>
            <p className="font-medium">{row.title}</p>
            <p className="text-muted-foreground">{formatProposalDate(row.eventDate)}</p>
          </div>
          {row.bookingId ? (
            <div>
              <span className="text-muted-foreground">Reserva</span>
              <p>
                <Link href={`${BCH_BASE}/reservas?highlight=${row.bookingId}`} className="text-violet-300 hover:underline">
                  Abrir reserva
                </Link>
              </p>
            </div>
          ) : null}
          <div className="flex justify-between sm:block">
            <span className="text-muted-foreground">Total contratado</span>
            <p className="font-semibold">{formatCatalogMoney(row.originalAmount)}</p>
          </div>
          <div className="flex justify-between sm:block">
            <span className="text-muted-foreground">Pago</span>
            <p>{formatCatalogMoney(row.totalPaid)}</p>
          </div>
          <div className="flex justify-between sm:block">
            <span className="text-muted-foreground">Saldo</span>
            <p className="font-semibold">{formatCatalogMoney(row.balance)}</p>
          </div>
          {row.nextDueDate ? (
            <div>
              <span className="text-muted-foreground">Próximo vencimento</span>
              <p>
                {formatProposalDate(row.nextDueDate)}
                {row.nextDueAmount ? ` · ${formatCatalogMoney(row.nextDueAmount)}` : ""}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Parcelas</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Pago</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {row.installments.map((inst) => (
                <TableRow key={inst.id}>
                  <TableCell>{inst.label ?? inst.sequence}</TableCell>
                  <TableCell>{formatProposalDate(inst.dueDate)}</TableCell>
                  <TableCell className="text-right">{formatCatalogMoney(inst.amount)}</TableCell>
                  <TableCell className="text-right">{formatCatalogMoney(inst.paidAmount)}</TableCell>
                  <TableCell className="text-right">{formatCatalogMoney(inst.balance)}</TableCell>
                  <TableCell>{INSTALLMENT_STATUS_LABEL[inst.status] ?? inst.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pagamentos</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {allPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead className="hidden md:table-cell">Referência</TableHead>
                  <TableHead className="hidden lg:table-cell">Obs.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allPayments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatProposalDate(p.paidAt)}</TableCell>
                    <TableCell>{p.installmentLabel}</TableCell>
                    <TableCell className="text-right">{formatCatalogMoney(p.amount)}</TableCell>
                    <TableCell>{VENUE_PAYMENT_METHOD_LABEL[p.paymentMethod] ?? p.paymentMethod}</TableCell>
                    <TableCell className="hidden md:table-cell">{p.reference ?? "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell max-w-[200px] truncate">
                      {p.notes ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar pagamento</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="pay-inst">Parcela</Label>
              <NativeSelect
                id="pay-inst"
                value={installmentId}
                onChange={(e) => onInstallmentPick(e.target.value)}
              >
                <option value="">Selecione…</option>
                {openInstallments.map((i) => (
                  <option key={i.id} value={i.id}>
                    {(i.label ?? `#${i.sequence}`) + ` · saldo ${formatCatalogMoney(i.balance)}`}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-amt">Valor</Label>
              <Input
                id="pay-amt"
                inputMode="decimal"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-date">Data</Label>
              <Input
                id="pay-date"
                type="date"
                className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-method">Método</Label>
              <NativeSelect
                id="pay-method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {VENUE_PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {VENUE_PAYMENT_METHOD_LABEL[m]}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-ref">Referência</Label>
              <Input id="pay-ref" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-notes">Observação</Label>
              <Textarea id="pay-notes" rows={2} value={payNotes} onChange={(e) => setPayNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setPayOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={saving || !installmentId || !payAmount.trim()}
              onClick={() => void submitPayment()}
              className="min-h-[44px]"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
