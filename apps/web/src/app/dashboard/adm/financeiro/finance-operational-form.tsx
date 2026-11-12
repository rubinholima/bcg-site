"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectField } from "@/components/ui/native-select";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { FinanceAllocationEditor, type AllocationRow } from "./finance-allocation-editor";
import { FinanceInstallmentSection } from "./finance-installment-section";
import { FinanceEmployeePicker, type FinanceEmployeeOption } from "./finance-employee-picker";
import { FinancePrivateFileUpload, type FinanceUploadedFile } from "./finance-private-file-upload";
import { extractFinanceError } from "./finance-api-helpers";

type Modo = "pagar" | "receber";

type CatalogAccount = { id: string; name: string; accountType: string };
type CatalogCategory = { id: string; name: string; parentId: string | null };
type CatalogMethod = { id: string; name: string; semanticKey?: string | null };

export function FinanceOperationalForm({
  tenantId,
  tipo,
  onCreated,
}: {
  tenantId: string;
  tipo: Modo;
  onCreated?: () => void;
}) {
  const router = useRouter();
  const [accounts, setAccounts] = useState<CatalogAccount[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [methods, setMethods] = useState<CatalogMethod[]>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
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

  const [paymentMode, setPaymentMode] = useState<"avista" | "parcelado">("avista");
  const [installmentCount, setInstallmentCount] = useState(2);
  const [firstDueDate, setFirstDueDate] = useState("");
  const [allocationRows, setAllocationRows] = useState<AllocationRow[]>([]);
  const [useSplitAllocation, setUseSplitAllocation] = useState(false);
  const [pendingDocs, setPendingDocs] = useState<Array<FinanceUploadedFile & { docType: string }>>([]);
  const [employee, setEmployee] = useState<FinanceEmployeeOption | null>(null);

  const amountNum = useMemo(() => Number(valor.replace(",", ".")) || 0, [valor]);

  const selectedMethod = methods.find((m) => m.id === financePaymentMethodId);
  const isPayrollDeduction = selectedMethod?.semanticKey === "PAYROLL_DEDUCTION";

  useEffect(() => {
    if (!tenantId) return;
    void Promise.all([
      api.get<CatalogAccount[]>(`/financeiro/contas?tenantId=${tenantId}&activeOnly=true`),
      api.get<CatalogCategory[]>(`/financeiro/categorias?tenantId=${tenantId}&activeOnly=true`),
      api.get<CatalogMethod[]>(`/financeiro/formas-pagamento?tenantId=${tenantId}&activeOnly=true`),
      api.get<Array<{ id: string; name: string }>>(`/compras/suppliers?tenantId=${encodeURIComponent(tenantId)}`),
    ]).then(([acc, cat, met, sup]) => {
      setAccounts(Array.isArray(acc.data) ? acc.data : []);
      setCategories(Array.isArray(cat.data) ? cat.data : []);
      setMethods(Array.isArray(met.data) ? met.data : []);
      setSuppliers(Array.isArray(sup.data) ? sup.data : []);
    });
  }, [tenantId]);

  function buildBasePayload() {
    return {
      financeAccountId: financeAccountId || undefined,
      financeCategoryId: financeCategoryId || undefined,
      financePaymentMethodId: financePaymentMethodId || undefined,
      supplierId: tipo === "pagar" && supplierId ? supplierId : undefined,
      customerId: tipo === "receber" && customerId ? customerId : undefined,
      contraparte: contraparte.trim() || undefined,
      documentType: documentType || undefined,
      documentNumber: documentNumber.trim() || undefined,
      issueDate: issueDate || undefined,
      competenceDate: competenceDate || undefined,
      scheduledPaymentDate: scheduledPaymentDate || undefined,
      boletoDigitableLine: documentType === "BOLETO" ? boletoDigitableLine.trim() || undefined : undefined,
      boletoBarcode: documentType === "BOLETO" ? boletoBarcode.trim() || undefined : undefined,
      notas: notas.trim() || undefined,
      employeeId: employee?.employeeId,
    };
  }

  function resolveAllocationLines(): AllocationRow[] {
    if (useSplitAllocation && allocationRows.length > 0) return allocationRows;
    if (financeCategoryId && amountNum > 0) {
      return [{ financeCategoryId, amount: amountNum }];
    }
    return allocationRows;
  }

  function validateAllocation(lines: AllocationRow[]): boolean {
    if (lines.length === 0) return true;
    const total = lines.reduce((s, r) => s + (r.amount || 0), 0);
    return Math.abs(total - amountNum) < 0.01;
  }

  async function applyAllocation(lancamentoId: string, lines: AllocationRow[]) {
    if (lines.length === 0) return;
    await api.post(`/financeiro/lancamentos/${lancamentoId}/rateio`, { tenantId, lines });
  }

  async function applyDocuments(lancamentoId: string) {
    for (const d of pendingDocs) {
      await api.post(`/financeiro/lancamentos/${lancamentoId}/documentos`, {
        tenantId,
        docType: d.docType,
        fileKey: d.fileKey,
        fileName: d.fileName,
        mimeType: d.mimeType,
      });
    }
  }

  async function schedulePayrollForInstallments(rows: Array<{ id: string; valor: number; dueDate: string }>) {
    if (!employee?.employmentId) return;
    for (const row of rows) {
      const month = row.dueDate.slice(0, 7) + "-01";
      await api.post(`/financeiro/receber/${row.id}/desconto-folha`, {
        tenantId,
        employmentId: employee.employmentId,
        employeeId: employee.employeeId,
        competenceMonth: month,
        idempotencyKey: `payroll-${row.id}`,
        amount: row.valor,
      });
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!descricao.trim() || !dueDate || amountNum <= 0) {
      setFeedback({ title: "Campos obrigatórios", message: "Preencha descrição, valor e vencimento." });
      return;
    }
    if (isPayrollDeduction && tipo === "receber" && (!employee?.employmentId || !employee.employeeId)) {
      setFeedback({ title: "Colaborador", message: "Selecione o colaborador para desconto em folha." });
      return;
    }
    const lines = resolveAllocationLines();
    if (!validateAllocation(lines)) {
      setFeedback({
        title: "Rateio",
        message: "O total do rateio não corresponde ao valor do documento.",
      });
      return;
    }

    setSaving(true);
    try {
      const idempotencyKey = `op-${tenantId}-${Date.now()}`;

      if (paymentMode === "parcelado") {
        const first = firstDueDate || dueDate;
        const { data: created } = await api.post<Array<{ id: string; valor: number; dueDate: string }>>(
          "/financeiro/parcelas/gerar",
          {
            tenantId,
            tipo,
            descricao: descricao.trim(),
            totalAmount: amountNum,
            installmentCount,
            firstDueDate: `${first}T12:00:00.000Z`,
            employeeId: employee?.employeeId,
            idempotencyKey,
            basePayload: buildBasePayload(),
          },
        );
        const rows = Array.isArray(created) ? created : [];
        for (const row of rows) {
          if (lines.length > 0) {
            const scaled = lines.map((l) => ({
              ...l,
              amount: Math.round(((l.amount / amountNum) * row.valor) * 100) / 100,
            }));
            await applyAllocation(row.id, scaled);
          }
        }
        if (isPayrollDeduction) await schedulePayrollForInstallments(rows);
        if (pendingDocs.length && rows[0]) await applyDocuments(rows[0].id);
        if (rows[0]) router.push(`/dashboard/adm/financeiro/lancamentos/${rows[0].id}`);
      } else {
        const { data: row } = await api.post<{ id: string }>("/financeiro/lancamentos/operacional", {
          tenantId,
          tipo,
          descricao: descricao.trim(),
          valor: amountNum,
          originalAmount: amountNum,
          dueDate,
          ...buildBasePayload(),
        });
        const lancId = row.id;
        await applyAllocation(lancId, lines);
        if (pendingDocs.length) await applyDocuments(lancId);
        if (isPayrollDeduction && employee?.employmentId) {
          const month = (competenceDate || dueDate).slice(0, 7) + "-01";
          await api.post(`/financeiro/receber/${lancId}/desconto-folha`, {
            tenantId,
            employmentId: employee.employmentId,
            employeeId: employee.employeeId,
            competenceMonth: month,
            idempotencyKey: `payroll-${lancId}`,
            amount: amountNum,
          });
        }
        router.push(`/dashboard/adm/financeiro/lancamentos/${lancId}`);
      }

      setFeedback({
        title: "Salvo",
        message: paymentMode === "parcelado" ? "Parcelas criadas." : tipo === "pagar" ? "Conta a pagar criada." : "Conta a receber criada.",
      });
      onCreated?.();
      setDescricao("");
      setValor("");
      setPendingDocs([]);
    } catch (err) {
      setFeedback({ title: "Erro", message: extractFinanceError(err) });
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
              <Input id="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} className="text-foreground" />
            </div>
            {tipo === "pagar" ? (
              <div className="sm:col-span-2">
                <Label>Fornecedor</Label>
                <NativeSelectField
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  placeholder="Selecione o fornecedor…"
                  options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="customerId">Cliente (ID opcional)</Label>
                <Input id="customerId" value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="text-foreground" />
              </div>
            )}
            {tipo === "receber" && isPayrollDeduction ? (
              <div className="sm:col-span-2">
                <FinanceEmployeePicker tenantId={tenantId} value={employee} onChange={setEmployee} />
              </div>
            ) : null}
            <div>
              <Label htmlFor="contraparte">Contraparte (texto)</Label>
              <Input id="contraparte" value={contraparte} onChange={(e) => setContraparte(e.target.value)} className="text-foreground" />
            </div>
            <div>
              <Label htmlFor="documentType">Tipo documento</Label>
              <NativeSelect id="documentType" value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
                <option value="">—</option>
                <option value="BOLETO">Boleto</option>
                <option value="NOTA_FISCAL">Nota fiscal</option>
                <option value="RECIBO">Recibo</option>
                <option value="COMPROVANTE">Comprovante</option>
                <option value="OTHER">Outro</option>
              </NativeSelect>
            </div>
            <div>
              <Label htmlFor="documentNumber">Nº documento</Label>
              <Input id="documentNumber" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} className="text-foreground" />
            </div>
            {documentType === "BOLETO" ? (
              <>
                <div className="sm:col-span-2">
                  <Label htmlFor="boletoLinha">Linha digitável</Label>
                  <Input id="boletoLinha" value={boletoDigitableLine} onChange={(e) => setBoletoDigitableLine(e.target.value)} className="text-foreground" />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="boletoBarcode">Código de barras</Label>
                  <Input id="boletoBarcode" value={boletoBarcode} onChange={(e) => setBoletoBarcode(e.target.value)} className="text-foreground" />
                </div>
              </>
            ) : null}
            <div>
              <Label htmlFor="issueDate">Emissão</Label>
              <Input id="issueDate" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="text-foreground [&::-webkit-datetime-edit]:text-foreground" />
            </div>
            <div>
              <Label htmlFor="competenceDate">Competência</Label>
              <Input id="competenceDate" type="date" value={competenceDate} onChange={(e) => setCompetenceDate(e.target.value)} className="text-foreground [&::-webkit-datetime-edit]:text-foreground" />
            </div>
            <div>
              <Label htmlFor="dueDate">Vencimento</Label>
              <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="text-foreground [&::-webkit-datetime-edit]:text-foreground" />
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
              <Input id="valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} className="text-foreground" />
            </div>
            <div>
              <Label htmlFor="financeAccountId">Conta planejada</Label>
              <NativeSelect id="financeAccountId" value={financeAccountId} onChange={(e) => setFinanceAccountId(e.target.value)}>
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
              <NativeSelect id="financeCategoryId" value={financeCategoryId} onChange={(e) => setFinanceCategoryId(e.target.value)}>
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
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={useSplitAllocation} onChange={(e) => setUseSplitAllocation(e.target.checked)} />
                Rateio em várias linhas
              </label>
            </div>
            {useSplitAllocation && amountNum > 0 ? (
              <div className="sm:col-span-2">
                <FinanceAllocationEditor
                  documentTotal={amountNum}
                  categories={categories}
                  simpleCategoryId={financeCategoryId || undefined}
                  onChange={setAllocationRows}
                />
              </div>
            ) : null}
            <div className="sm:col-span-2">
              <FinanceInstallmentSection
                amount={amountNum}
                paymentMode={paymentMode}
                onPaymentModeChange={setPaymentMode}
                installmentCount={installmentCount}
                onInstallmentCountChange={setInstallmentCount}
                firstDueDate={firstDueDate || dueDate}
                onFirstDueDateChange={setFirstDueDate}
              />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label>Anexos (após salvar, vinculados ao título)</Label>
              <div className="flex flex-wrap items-center gap-2">
                <NativeSelect
                  value={pendingDocs[0]?.docType ?? "BOLETO"}
                  onChange={(e) => {
                    const t = e.target.value;
                    setPendingDocs((prev) => prev.map((p, i) => (i === prev.length - 1 ? { ...p, docType: t } : p)));
                  }}
                >
                  <option value="BOLETO">Boleto</option>
                  <option value="NOTA_FISCAL">Nota fiscal</option>
                  <option value="OTHER">Outro</option>
                </NativeSelect>
                <FinancePrivateFileUpload
                  tenantId={tenantId}
                  onUploaded={(f) =>
                    setPendingDocs((prev) => [...prev, { ...f, docType: documentType || "BOLETO" }])
                  }
                />
              </div>
              {pendingDocs.length > 0 ? (
                <p className="text-xs text-muted-foreground">{pendingDocs.length} arquivo(s) na fila de anexo.</p>
              ) : null}
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="notas">Notas</Label>
              <Textarea id="notas" value={notas} onChange={(e) => setNotas(e.target.value)} className="text-foreground" rows={2} />
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
        <FeedbackModal open onOpenChange={() => setFeedback(null)} title={feedback.title} message={feedback.message} />
      ) : null}
    </>
  );
}
