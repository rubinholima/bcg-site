"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";

type AccountOpt = { id: string; name: string };

export function FinanceSettlementDialog({
  open,
  onOpenChange,
  tenantId,
  lancamentoId,
  plannedAccountId,
  remainingBalance,
  accounts,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId: string;
  lancamentoId: string;
  plannedAccountId?: string | null;
  remainingBalance: number;
  accounts: AccountOpt[];
  onDone?: () => void;
}) {
  const [settledAt, setSettledAt] = useState(new Date().toISOString().slice(0, 10));
  const [amountSettled, setAmountSettled] = useState(String(remainingBalance));
  const [interest, setInterest] = useState("0");
  const [penalty, setPenalty] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [actualAccountId, setActualAccountId] = useState(plannedAccountId ?? "");
  const [overrideReason, setOverrideReason] = useState("");
  const [manual, setManual] = useState(false);
  const [manualReason, setManualReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);

  const needsOverride =
    Boolean(plannedAccountId) && Boolean(actualAccountId) && plannedAccountId !== actualAccountId;

  async function submit() {
    setSaving(true);
    try {
      await api.post("/financeiro/baixas", {
        tenantId,
        financeiroLancamentoId: lancamentoId,
        idempotencyKey: `${lancamentoId}-${Date.now()}`,
        settledAt: `${settledAt}T12:00:00.000Z`,
        amountSettled: Number(amountSettled.replace(",", ".")),
        interestAmount: Number(interest.replace(",", ".") || 0),
        penaltyAmount: Number(penalty.replace(",", ".") || 0),
        discountAmount: Number(discount.replace(",", ".") || 0),
        actualFinanceAccountId: actualAccountId,
        accountOverrideReason: needsOverride ? overrideReason : undefined,
        manualSettlement: manual,
        manualReason: manual ? manualReason : undefined,
      });
      onOpenChange(false);
      onDone?.();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? String((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Erro")
          : "Erro ao registrar baixa";
      setFeedback({ title: "Erro", message: msg });
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
          <div className="grid gap-3">
            <div>
              <Label htmlFor="settledAt">Data</Label>
              <Input
                id="settledAt"
                type="date"
                className="text-foreground"
                value={settledAt}
                onChange={(e) => setSettledAt(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="amountSettled">Valor baixa</Label>
              <Input
                id="amountSettled"
                className="text-foreground"
                value={amountSettled}
                onChange={(e) => setAmountSettled(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
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
              <div>
                <Label>Motivo — conta diferente da planejada</Label>
                <Textarea
                  className="text-foreground"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  rows={2}
                />
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
