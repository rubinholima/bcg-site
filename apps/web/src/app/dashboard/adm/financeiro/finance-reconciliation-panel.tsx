"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { extractFinanceError, RECONCILIATION_LABELS } from "./finance-api-helpers";

export function FinanceReconciliationPanel({
  tenantId,
  lancamentoId,
  status,
  onUpdated,
}: {
  tenantId: string;
  lancamentoId: string;
  status: string;
  onUpdated?: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);

  const label = RECONCILIATION_LABELS[status] ?? status;

  async function markReconciled() {
    setSaving(true);
    try {
      await api.post(`/financeiro/lancamentos/${lancamentoId}/conciliacao`, {
        tenantId,
        status: "reconciled",
        notes: notes.trim() || undefined,
      });
      onUpdated?.();
    } catch (e) {
      setFeedback({ title: "Erro", message: extractFinanceError(e) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-foreground">
        Conciliação: <span className="font-medium">{label}</span>
      </p>
      {status !== "reconciled" ? (
        <>
          <div>
            <Label htmlFor="recNotes">Referência / observações</Label>
            <Textarea
              id="recNotes"
              rows={2}
              className="text-foreground"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <Button type="button" size="sm" disabled={saving} onClick={() => void markReconciled()}>
            {saving ? "Salvando…" : "Marcar como conciliado"}
          </Button>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">Baixa e conciliação são etapas independentes.</p>
      )}
      {feedback ? (
        <FeedbackModal open onOpenChange={() => setFeedback(null)} title={feedback.title} message={feedback.message} />
      ) : null}
    </div>
  );
}
