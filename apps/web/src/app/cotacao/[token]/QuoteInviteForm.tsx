"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { buildBackendUrl } from "@/lib/apiProxy";
import { formatDateDayMonYear } from "@/lib/format-date";

export type QuoteInviteItem = {
  lineId: string;
  description: string;
  quantity: number;
  unit?: string;
};

export type QuoteInviteSubmittedLine = {
  lineId?: string;
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
};

export type QuoteInviteFormData = {
  tenantName: string;
  supplierName: string;
  departmentName: string | null;
  requestedAt: string;
  items: QuoteInviteItem[];
  status: string;
  alreadySubmitted: boolean;
  expiresAt: string | null;
  submittedQuote?: {
    totalAmount: number;
    deliveryDays: number | null;
    notes: string | null;
    lines: QuoteInviteSubmittedLine[];
  } | null;
};

export function QuoteInviteForm({ token, initial }: { token: string; initial: QuoteInviteFormData }) {
  const [prices, setPrices] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const item of initial.items) map[item.lineId] = "";
    return map;
  });
  const [deliveryDays, setDeliveryDays] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(initial.alreadySubmitted);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ open: false, title: "", message: "" });

  const totalPreview = useMemo(() => {
    let sum = 0;
    for (const item of initial.items) {
      const raw = prices[item.lineId]?.replace(",", ".");
      const unit = parseFloat(raw ?? "");
      if (!Number.isFinite(unit)) continue;
      sum += unit * item.quantity;
    }
    return sum;
  }, [initial.items, prices]);

  const handleSubmit = async () => {
    const lines = initial.items.map((item) => {
      const raw = prices[item.lineId]?.replace(",", ".");
      const unitPrice = parseFloat(raw ?? "");
      return { lineId: item.lineId, unitPrice };
    });
    if (lines.some((l) => !Number.isFinite(l.unitPrice) || l.unitPrice < 0)) {
      setFeedback({
        open: true,
        title: "Atenção",
        message: "Informe o preço unitário de cada item.",
      });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        buildBackendUrl(`/public/purchase-quote-invite/${encodeURIComponent(token)}/submit`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lines,
            deliveryDays: deliveryDays ? parseInt(deliveryDays, 10) : undefined,
            notes: notes.trim() || undefined,
          }),
        },
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(err?.message ?? "Não foi possível enviar a cotação.");
      }
      setSubmitted(true);
      setFeedback({
        open: true,
        title: "Enviado",
        message: "Sua cotação foi registrada. Obrigado!",
      });
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Falha ao enviar.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Cotação de preços</CardTitle>
          <p className="text-sm text-muted-foreground">
            {initial.tenantName}
            {initial.departmentName ? ` · ${initial.departmentName}` : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            Solicitação de {formatDateDayMonYear(initial.requestedAt)} · Fornecedor:{" "}
            <span className="text-foreground">{initial.supplierName}</span>
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {submitted ? (
            <div className="space-y-3">
              <p className="text-sm text-green-600 dark:text-green-400">
                Cotação enviada. Obrigado pela participação.
              </p>
              {initial.submittedQuote ? (
                <>
                  <div className="space-y-2">
                    {(initial.submittedQuote.lines.length
                      ? initial.submittedQuote.lines
                      : initial.items.map((it) => ({
                          ...it,
                          unitPrice: 0,
                        }))
                    ).map((line) => (
                      <div
                        key={line.lineId ?? line.description}
                        className="flex flex-wrap justify-between gap-2 rounded-md border border-border/70 px-3 py-2 text-sm"
                      >
                        <span>
                          {line.description} — {line.quantity} {line.unit ?? "un"}
                        </span>
                        <span className="font-medium">
                          {line.unitPrice.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}{" "}
                          / un
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm font-semibold">
                    Total:{" "}
                    {initial.submittedQuote.totalAmount.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </p>
                  {initial.submittedQuote.deliveryDays != null ? (
                    <p className="text-xs text-muted-foreground">
                      Prazo de entrega: {initial.submittedQuote.deliveryDays} dias
                    </p>
                  ) : null}
                  {initial.submittedQuote.notes ? (
                    <p className="text-xs text-muted-foreground">Obs.: {initial.submittedQuote.notes}</p>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {initial.items.map((item) => (
                  <div key={item.lineId} className="rounded-md border border-border/70 p-3 space-y-2">
                    <p className="text-sm font-medium">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Qtd: {item.quantity} {item.unit ?? "un"}
                    </p>
                    <div className="grid gap-1">
                      <Label htmlFor={`price-${item.lineId}`}>Preço unitário (R$)</Label>
                      <Input
                        id={`price-${item.lineId}`}
                        type="number"
                        min={0}
                        step="0.01"
                        inputMode="decimal"
                        className="text-foreground"
                        value={prices[item.lineId] ?? ""}
                        onChange={(e) =>
                          setPrices((prev) => ({ ...prev, [item.lineId]: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-1">
                  <Label htmlFor="delivery">Prazo de entrega (dias)</Label>
                  <Input
                    id="delivery"
                    type="number"
                    min={0}
                    className="text-foreground"
                    value={deliveryDays}
                    onChange={(e) => setDeliveryDays(e.target.value)}
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <p className="text-sm text-muted-foreground">Total estimado</p>
                  <p className="text-lg font-semibold">
                    {totalPreview.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </div>
              </div>
              <div className="grid gap-1">
                <Label htmlFor="notes">Observações</Label>
                <textarea
                  id="notes"
                  className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <Button type="button" className="w-full" disabled={saving} onClick={() => void handleSubmit()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar cotação"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
      />
    </div>
  );
}
