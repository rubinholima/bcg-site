"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { extractFinanceError } from "./finance-api-helpers";

type AccountOpt = { id: string; name: string };
type MethodOpt = { id: string; name: string };

function parseMoney(v: string): number {
  return Number(v.replace(/\s/g, "").replace(",", ".")) || 0;
}

export function FinanceSettlementDialog({
  open,
  onOpenChange,
  tenantId,
  lancamentoId,
  plannedAccountId,
  plannedAccountName,
  originalAmount,
  remainingBalance,
  accounts,
  paymentMethods,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId: string;
  lancamentoId: string;
  plannedAccountId?: string | null;
  plannedAccountName?: string | null;
  originalAmount: number;
  remainingBalance: number;
  accounts: AccountOpt[];
  paymentMethods: MethodOpt[];
  onDone?: () => void;
}) {
  const idempotencyRef = useRef("");
  const proofRef = useRef<HTMLInputElement>(null);
  const [settledAt, setSettledAt] = useState(new Date().toISOString().slice(0, 10));
  const [amountSettled, setAmountSettled] = useState(String(remainingBalance));
  const [interest, setInterest] = useState("0");
  const [penalty, setPenalty] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [abatement, setAbatement] = useState("0");
  const [otherAdj, setOtherAdj] = useState("0");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [actualAccountId, setActualAccountId] = useState(plannedAccountId ?? "");
  const [overrideReason, setOverrideReason] = useState("");
  const [manual, setManual] = useState(false);
  const [manualReason, setManualReason] = useState("");
  const [referenceNotes, setReferenceNotes] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    if (open) {
      idempotencyRef.current = `${lancamentoId}-${crypto.randomUUID()}`;
      setAmountSettled(String(remainingBalance));
      setActualAccountId(plannedAccountId ?? "");
    }
  }, [open, lancamentoId, remainingBalance, plannedAccountId]);

  const needsOverride =
    Boolean(plannedAccountId) && Boolean(actualAccountId) && plannedAccountId !== actualAccountId;

  const finalPreview = useMemo(() => {
    const base = parseMoney(amountSettled);
    return (
      base +
      parseMoney(interest) +
      parseMoney(penalty) -
      parseMoney(discount) -
      parseMoney(abatement) +
      parseMoney(otherAdj)
    );
  }, [amountSettled, interest, penalty, discount, abatement, otherAdj]);

  const remainingAfter = Math.max(0, Math.round((remainingBalance - finalPreview) * 100) / 100);

  async function uploadProof(settlementId: string) {
    if (!proofFile) return;
    const fd = new FormData();
    fd.append("file", proofFile);
    fd.append("tenantId", tenantId);
    await api.postForm(`/financeiro/baixas/${settlementId}/comprovante`, fd);
  }

  async function submit() {
    if (!actualAccountId) {
      setFeedback({ title: "Conta obrigatória", message: "Selecione a conta efetivamente utilizada." });
      return;
    }
    if (needsOverride && !overrideReason.trim()) {
      setFeedback({
        title: "Conta diferente",
        message: "A conta utilizada é diferente da conta programada. Informe o motivo.",
      });
      return;
    }
  if (manual && !manualReason.trim()) {
      setFeedback({ title: "Baixa manual", message: "Informe o motivo da baixa manual." });
      return;
    }
    setSaving(true);
    let settlementId: string | undefined;
    try {
      const { data } = await api.post<{ id: string }>("/financeiro/baixas", {
        tenantId,
        financeiroLancamentoId: lancamentoId,
        idempotencyKey: idempotencyRef.current,
        settledAt: `${settledAt}T12:00:00.000Z`,
        amountSettled: parseMoney(amountSettled),
        interestAmount: parseMoney(interest),
        penaltyAmount: parseMoney(penalty),
        discountAmount: parseMoney(discount),
        abatementAmount: parseMoney(abatement),
        otherAdjustmentAmount: parseMoney(otherAdj),
        financePaymentMethodId: paymentMethodId || undefined,
        actualFinanceAccountId: actualAccountId,
        accountOverrideReason: needsOverride ? overrideReason : undefined,
        manualSettlement: manual,
        manualReason: manual ? manualReason : undefined,
        referenceNotes: referenceNotes.trim() || undefined,
      });
      settlementId = data?.id;
      if (proofFile && settlementId) {
        try {
          await uploadProof(settlementId);
        } catch {
          setFeedback({
            title: "Baixa registrada",
            message: "A baixa foi salva, mas o comprovante não foi anexado. Anexe na ficha do título.",
          });
          onOpenChange(false);
          onDone?.();
          return;
        }
      }
      onOpenChange(false);
      onDone?.();
    } catch (e) {
      setFeedback({ title: "Erro", message: extractFinanceError(e) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar baixa</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 text-sm">
            <p className="text-muted-foreground">
              Original:{" "}
              <span className="text-foreground tabular-nums">
                {originalAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
              {" · "}
              Saldo:{" "}
              <span className="text-foreground tabular-nums">
                {remainingBalance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </p>
            {plannedAccountName ? (
              <p className="text-xs text-muted-foreground">
                Conta planejada: <span className="text-foreground">{plannedAccountName}</span>
              </p>
            ) : null}
            <div>
              <Label htmlFor="settledAt">Data</Label>
              <Input
                id="settledAt"
                type="date"
                className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                value={settledAt}
                onChange={(e) => setSettledAt(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="amountSettled">Valor da baixa</Label>
              <Input
                id="amountSettled"
                className="text-foreground"
                value={amountSettled}
                onChange={(e) => setAmountSettled(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div>
                <Label>Juros</Label>
                <Input className="text-foreground" value={interest} onChange={(e) => setInterest(e.target.value)} />
              </div>
              <div>
                <Label>Multa</Label>
                <Input className="text-foreground" value={penalty} onChange={(e) => setPenalty(e.target.value)} />
              </div>
              <div>
                <Label>Desconto</Label>
                <Input className="text-foreground" value={discount} onChange={(e) => setDiscount(e.target.value)} />
              </div>
              <div>
                <Label>Abatimento</Label>
                <Input className="text-foreground" value={abatement} onChange={(e) => setAbatement(e.target.value)} />
              </div>
              <div>
                <Label>Outro ajuste</Label>
                <Input className="text-foreground" value={otherAdj} onChange={(e) => setOtherAdj(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Valor final:{" "}
              <span className="text-foreground tabular-nums">
                {finalPreview.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
              {" · "}
              Saldo restante (previsto):{" "}
              <span className="text-foreground tabular-nums">
                {remainingAfter.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </p>
            <div>
              <Label>Forma de pagamento</Label>
              <NativeSelect value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)}>
                <option value="">—</option>
                {paymentMethods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div>
              <Label>Conta efetiva</Label>
              <NativeSelect value={actualAccountId} onChange={(e) => setActualAccountId(e.target.value)}>
                <option value="">Selecione…</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            {needsOverride ? (
              <p className="text-xs text-amber-400">Conta efetiva diferente da planejada — motivo obrigatório.</p>
            ) : null}
            {needsOverride ? (
              <div>
                <Label>Motivo</Label>
                <Textarea className="text-foreground" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} rows={2} />
              </div>
            ) : null}
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={manual} onChange={(e) => setManual(e.target.checked)} />
              Baixa manual
            </label>
            {manual ? (
              <Textarea
                className="text-foreground"
                placeholder="Motivo da baixa manual"
                value={manualReason}
                onChange={(e) => setManualReason(e.target.value)}
              />
            ) : null}
            <div>
              <Label>Observação</Label>
              <Textarea
                className="text-foreground"
                value={referenceNotes}
                onChange={(e) => setReferenceNotes(e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <Label>Comprovante (opcional)</Label>
              <input
                ref={proofRef}
                type="file"
                accept=".pdf,image/*"
                className="text-sm text-foreground file:mr-2 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1"
                onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={saving} onClick={() => void submit()}>
              {saving ? "Salvando…" : "Confirmar baixa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {feedback ? (
        <FeedbackModal open onOpenChange={() => setFeedback(null)} title={feedback.title} message={feedback.message} />
      ) : null}
    </>
  );
}
