"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { useFinanceiroTenant } from "../financeiro-tenant-shell";
import { extractFinanceError } from "../finance-api-helpers";

export default function FinanceiroTransferenciasPage() {
  const { tenantId } = useFinanceiroTenant();
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [sourceId, setSourceId] = useState("");
  const [destId, setDestId] = useState("");
  const [amount, setAmount] = useState("");
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    void api
      .get<Array<{ id: string; name: string }>>(`/financeiro/contas?tenantId=${tenantId}&activeOnly=true`)
      .then(({ data }) => setAccounts(Array.isArray(data) ? data : []));
  }, [tenantId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId || !sourceId || !destId) return;
    setSaving(true);
    try {
      await api.post("/financeiro/transferencias", {
        tenantId,
        sourceAccountId: sourceId,
        destAccountId: destId,
        amount: Number(amount.replace(",", ".")),
        transferDate: `${transferDate}T12:00:00.000Z`,
        description: description.trim() || undefined,
        idempotencyKey: `tr-${tenantId}-${Date.now()}`,
      });
      setFeedback({ title: "Transferência", message: "Movimento interno registrado (não é despesa operacional)." });
    } catch (err) {
      setFeedback({ title: "Erro", message: extractFinanceError(err) });
    } finally {
      setSaving(false);
    }
  }

  if (!tenantId) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transferência interna</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 max-w-2xl">
            <div>
              <Label>Conta origem</Label>
              <NativeSelect value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
                <option value="">Selecione…</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div>
              <Label>Conta destino</Label>
              <NativeSelect value={destId} onChange={(e) => setDestId(e.target.value)}>
                <option value="">Selecione…</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div>
              <Label>Valor</Label>
              <Input className="text-foreground" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
            </div>
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Descrição</Label>
              <Textarea className="text-foreground" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando…" : "Registrar transferência"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {feedback ? (
        <FeedbackModal open onOpenChange={() => setFeedback(null)} title={feedback.title} message={feedback.message} />
      ) : null}
    </div>
  );
}
