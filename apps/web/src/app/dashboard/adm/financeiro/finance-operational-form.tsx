"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";

type Modo = "pagar" | "receber";

type CatalogAccount = { id: string; name: string; accountType: string };
type CatalogCategory = { id: string; name: string; parentId: string | null };
type CatalogMethod = { id: string; name: string };

export function FinanceOperationalForm({
  tenantId,
  tipo,
  onCreated,
}: {
  tenantId: string;
  tipo: Modo;
  onCreated?: () => void;
}) {
  const [accounts, setAccounts] = useState<CatalogAccount[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [methods, setMethods] = useState<CatalogMethod[]>([]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);

  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [competenceDate, setCompetenceDate] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [scheduledPaymentDate, setScheduledPaymentDate] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [financeAccountId, setFinanceAccountId] = useState("");
  const [financeCategoryId, setFinanceCategoryId] = useState("");
  const [financePaymentMethodId, setFinancePaymentMethodId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [contraparte, setContraparte] = useState("");
  const [notas, setNotas] = useState("");
  const [boletoDigitableLine, setBoletoDigitableLine] = useState("");
  const [boletoBarcode, setBoletoBarcode] = useState("");

  useEffect(() => {
    if (!tenantId) return;
    void Promise.all([
      api.get<CatalogAccount[]>(`/financeiro/contas?tenantId=${tenantId}&activeOnly=true`),
      api.get<CatalogCategory[]>(`/financeiro/categorias?tenantId=${tenantId}&activeOnly=true`),
      api.get<CatalogMethod[]>(`/financeiro/formas-pagamento?tenantId=${tenantId}&activeOnly=true`),
    ]).then(([acc, cat, met]) => {
      setAccounts(Array.isArray(acc.data) ? acc.data : []);
      setCategories(Array.isArray(cat.data) ? cat.data : []);
      setMethods(Array.isArray(met.data) ? met.data : []);
    }).catch(() => {
      setAccounts([]);
      setCategories([]);
      setMethods([]);
    });
  }, [tenantId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(valor.replace(",", "."));
    if (!descricao.trim() || !dueDate || !Number.isFinite(amount) || amount <= 0) {
      setFeedback({ title: "Campos obrigatórios", message: "Preencha descrição, valor e vencimento." });
      return;
    }
    setSaving(true);
    try {
      await api.post("/financeiro/lancamentos/operacional", {
        tenantId,
        tipo,
        descricao: descricao.trim(),
        valor: amount,
        originalAmount: amount,
        dueDate,
        competenceDate: competenceDate || undefined,
        issueDate: issueDate || undefined,
        scheduledPaymentDate: scheduledPaymentDate || undefined,
        documentType: documentType || undefined,
        documentNumber: documentNumber.trim() || undefined,
        financeAccountId: financeAccountId || undefined,
        financeCategoryId: financeCategoryId || undefined,
        financePaymentMethodId: financePaymentMethodId || undefined,
        supplierId: tipo === "pagar" && supplierId ? supplierId : undefined,
        customerId: tipo === "receber" && customerId ? customerId : undefined,
        contraparte: contraparte.trim() || undefined,
        notas: notas.trim() || undefined,
        boletoDigitableLine: documentType === "BOLETO" ? boletoDigitableLine.trim() || undefined : undefined,
        boletoBarcode: documentType === "BOLETO" ? boletoBarcode.trim() || undefined : undefined,
      });
      setFeedback({ title: "Salvo", message: tipo === "pagar" ? "Conta a pagar criada." : "Conta a receber criada." });
      onCreated?.();
      setDescricao("");
      setValor("");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? String((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Erro ao salvar")
          : "Erro ao salvar";
      setFeedback({ title: "Erro", message: msg });
    } finally {
      setSaving(false);
    }
  }

  const parents = categories.filter((c) => !c.parentId);
  const children = categories.filter((c) => c.parentId);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {tipo === "pagar" ? "Nova conta a pagar" : "Nova conta a receber"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Input
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="text-foreground"
              />
            </div>
            {tipo === "pagar" ? (
              <div>
                <Label htmlFor="supplierId">Fornecedor (ID)</Label>
                <Input
                  id="supplierId"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="text-foreground"
                  placeholder="Opcional se houver contraparte"
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="customerId">Cliente (ID)</Label>
                <Input
                  id="customerId"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="text-foreground"
                />
              </div>
            )}
            <div>
              <Label htmlFor="contraparte">Contraparte</Label>
              <Input
                id="contraparte"
                value={contraparte}
                onChange={(e) => setContraparte(e.target.value)}
                className="text-foreground"
              />
            </div>
            <div>
              <Label htmlFor="documentType">Tipo documento</Label>
              <NativeSelect
                id="documentType"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
              >
                <option value="">—</option>
                <option value="BOLETO">Boleto</option>
                <option value="INVOICE">Nota fiscal</option>
                <option value="RECEIPT">Recibo</option>
                <option value="OTHER">Outro</option>
              </NativeSelect>
            </div>
            <div>
              <Label htmlFor="documentNumber">Nº documento</Label>
              <Input
                id="documentNumber"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                className="text-foreground"
              />
            </div>
            {documentType === "BOLETO" ? (
              <>
                <div className="sm:col-span-2">
                  <Label htmlFor="boletoLinha">Linha digitável</Label>
                  <Input
                    id="boletoLinha"
                    value={boletoDigitableLine}
                    onChange={(e) => setBoletoDigitableLine(e.target.value)}
                    className="text-foreground"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="boletoBarcode">Código de barras</Label>
                  <Input
                    id="boletoBarcode"
                    value={boletoBarcode}
                    onChange={(e) => setBoletoBarcode(e.target.value)}
                    className="text-foreground"
                  />
                </div>
              </>
            ) : null}
            <div>
              <Label htmlFor="issueDate">Emissão</Label>
              <Input
                id="issueDate"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
              />
            </div>
            <div>
              <Label htmlFor="competenceDate">Competência</Label>
              <Input
                id="competenceDate"
                type="date"
                value={competenceDate}
                onChange={(e) => setCompetenceDate(e.target.value)}
                className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
              />
            </div>
            <div>
              <Label htmlFor="dueDate">Vencimento</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
              />
            </div>
            <div>
              <Label htmlFor="scheduledPaymentDate">Pagamento programado</Label>
              <Input
                id="scheduledPaymentDate"
                type="date"
                value={scheduledPaymentDate}
                onChange={(e) => setScheduledPaymentDate(e.target.value)}
                className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
              />
            </div>
            <div>
              <Label htmlFor="valor">Valor original</Label>
              <Input
                id="valor"
                inputMode="decimal"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="text-foreground"
              />
            </div>
            <div>
              <Label htmlFor="financeAccountId">Conta planejada</Label>
              <NativeSelect
                id="financeAccountId"
                value={financeAccountId}
                onChange={(e) => setFinanceAccountId(e.target.value)}
              >
                <option value="">Selecione…</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.accountType})
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div>
              <Label htmlFor="financeCategoryId">Categoria</Label>
              <NativeSelect
                id="financeCategoryId"
                value={financeCategoryId}
                onChange={(e) => setFinanceCategoryId(e.target.value)}
              >
                <option value="">Selecione…</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
                {children.map((c) => {
                  const parent = categories.find((p) => p.id === c.parentId);
                  return (
                    <option key={c.id} value={c.id}>
                      {parent ? `${parent.name} › ` : ""}
                      {c.name}
                    </option>
                  );
                })}
              </NativeSelect>
            </div>
            <div>
              <Label htmlFor="financePaymentMethodId">Forma de pagamento</Label>
              <NativeSelect
                id="financePaymentMethodId"
                value={financePaymentMethodId}
                onChange={(e) => setFinancePaymentMethodId(e.target.value)}
              >
                <option value="">Selecione…</option>
                {methods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="notas">Notas</Label>
              <Textarea
                id="notas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="text-foreground"
                rows={2}
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {feedback ? (
        <FeedbackModal
          open
          onOpenChange={() => setFeedback(null)}
          title={feedback.title}
          message={feedback.message}
        />
      ) : null}
    </>
  );
}
