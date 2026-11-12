"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { useFinanceiroTenant } from "../financeiro-tenant-shell";
import { extractFinanceError } from "../finance-api-helpers";

type Stmt = {
  id: string;
  financeAccountId: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string | null;
  status: string;
};

export default function FinanceiroCartoesPage() {
  const { tenantId } = useFinanceiroTenant();
  const [cards, setCards] = useState<Array<{ id: string; name: string }>>([]);
  const [bankAccounts, setBankAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [cardId, setCardId] = useState("");
  const [statements, setStatements] = useState<Stmt[]>([]);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [payFrom, setPayFrom] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payStmtId, setPayStmtId] = useState("");
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);

  const load = useCallback(async () => {
    if (!tenantId) return;
    const { data: acc } = await api.get<Array<{ id: string; name: string; accountType: string }>>(
      `/financeiro/contas?tenantId=${tenantId}&activeOnly=true`,
    );
    const list = Array.isArray(acc) ? acc : [];
    setCards(list.filter((a) => a.accountType === "CREDIT_CARD"));
    setBankAccounts(list.filter((a) => a.accountType === "BANK" || a.accountType === "CASH"));
    const { data: stm } = await api.get<Stmt[]>(
      `/financeiro/cartoes/faturas?tenantId=${tenantId}${cardId ? `&financeAccountId=${cardId}` : ""}`,
    );
    setStatements(Array.isArray(stm) ? stm : []);
  }, [tenantId, cardId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createStatement(e: React.FormEvent) {
    e.preventDefault();
    if (!cardId || !periodStart || !periodEnd) return;
    try {
      await api.post("/financeiro/cartoes/faturas", {
        tenantId,
        financeAccountId: cardId,
        periodStart: `${periodStart}T00:00:00.000Z`,
        periodEnd: `${periodEnd}T23:59:59.999Z`,
      });
      await load();
    } catch (err) {
      setFeedback({ title: "Erro", message: extractFinanceError(err) });
    }
  }

  async function payStatement(e: React.FormEvent) {
    e.preventDefault();
    if (!payStmtId || !payFrom) return;
    try {
      await api.post(`/financeiro/cartoes/faturas/${payStmtId}/pagamento`, {
        tenantId,
        fromFinanceAccountId: payFrom,
        amount: Number(payAmount.replace(",", ".")),
        paidAt: new Date().toISOString(),
      });
      setFeedback({
        title: "Pagamento de fatura",
        message: "Movimento entre conta e cartão — não gera despesa operacional adicional.",
      });
      await load();
    } catch (err) {
      setFeedback({ title: "Erro", message: extractFinanceError(err) });
    }
  }

  if (!tenantId) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cartão — nova fatura</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createStatement} className="grid gap-3 sm:grid-cols-2 max-w-2xl">
            <div>
              <Label>Cartão</Label>
              <NativeSelect value={cardId} onChange={(e) => setCardId(e.target.value)}>
                <option value="">Selecione…</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="hidden sm:block" />
            <div>
              <Label>Início período</Label>
              <Input type="date" className="text-foreground [&::-webkit-datetime-edit]:text-foreground" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div>
              <Label>Fim período</Label>
              <Input type="date" className="text-foreground [&::-webkit-datetime-edit]:text-foreground" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit">Abrir fatura</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Faturas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {statements.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma fatura.</p>
          ) : (
            statements.map((s) => (
              <div key={s.id} className="rounded border border-border/50 px-3 py-2">
                <p className="text-foreground">
                  {new Date(s.periodStart).toLocaleDateString("pt-BR")} — {new Date(s.periodEnd).toLocaleDateString("pt-BR")} ·{" "}
                  {s.status}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pagar fatura</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={payStatement} className="grid gap-3 sm:grid-cols-2 max-w-2xl">
            <div>
              <Label>Fatura</Label>
              <NativeSelect value={payStmtId} onChange={(e) => setPayStmtId(e.target.value)}>
                <option value="">Selecione…</option>
                {statements.filter((s) => s.status !== "paid").map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id.slice(0, 8)}… ({s.status})
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div>
              <Label>Conta origem</Label>
              <NativeSelect value={payFrom} onChange={(e) => setPayFrom(e.target.value)}>
                <option value="">Selecione…</option>
                {bankAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div>
              <Label>Valor</Label>
              <Input className="text-foreground" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit">Registrar pagamento</Button>
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
