"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { useFinanceiroTenant } from "../../financeiro-tenant-shell";
import { FinanceDocumentsPanel } from "../../finance-documents-panel";
import { FinanceTimelinePanel } from "../../finance-timeline-panel";
import { FinanceReconciliationPanel } from "../../finance-reconciliation-panel";
import { FinanceSettlementDialog } from "../../finance-settlement-dialog";
import {
  PAYROLL_STATUS_LABELS,
  RECONCILIATION_LABELS,
  extractFinanceError,
} from "../../finance-api-helpers";

type Lancamento = {
  id: string;
  tenantId: string;
  tipo: "pagar" | "receber";
  status: string;
  descricao: string;
  valor: number;
  originalAmount: number | null;
  amountSettledTotal?: number;
  dueDate: string;
  financeAccountId: string | null;
  reconciliationStatus?: string;
  payrollDeductionStatus?: string;
  installmentGroupId?: string | null;
  installmentNumber?: number | null;
  installmentCount?: number | null;
  approvedAt?: string | null;
  approvedByUserId?: string | null;
  settledAt?: string | null;
  createdByUserId?: string | null;
};

type SettlementRow = {
  id: string;
  settledAt: string;
  amountSettled: number;
  finalAmount: number;
  manualSettlement: boolean;
  paymentMethodName?: string | null;
  actualAccountName?: string | null;
  proofs?: Array<{ id: string; fileName: string }>;
};

type InstallmentRow = Lancamento & { installmentNumber: number | null };

export default function FinanceiroLancamentoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { tenantId } = useFinanceiroTenant();
  const [lanc, setLanc] = useState<Lancamento | null>(null);
  const [settlements, setSettlements] = useState<SettlementRow[]>([]);
  const [installments, setInstallments] = useState<InstallmentRow[]>([]);
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [methods, setMethods] = useState<Array<{ id: string; name: string }>>([]);
  const [accountNames, setAccountNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [settleOpen, setSettleOpen] = useState(false);
  const [dueEdit, setDueEdit] = useState("");
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);

  const original = lanc?.originalAmount ?? lanc?.valor ?? 0;
  const settled = lanc?.amountSettledTotal ?? 0;
  const remaining = Math.max(0, Math.round((original - settled) * 100) / 100);
  const isLegacy =
    lanc?.status === "pago" && Boolean(lanc.settledAt) && settlements.length === 0;

  const plannedName = lanc?.financeAccountId ? accountNames[lanc.financeAccountId] : null;

  const load = useCallback(async () => {
    if (!tenantId || !id) return;
    setLoading(true);
    try {
      const [detail, baixas, acc, met] = await Promise.all([
        api.get<Lancamento>(`/financeiro/lancamentos/${id}`),
        api.get<SettlementRow[]>(`/financeiro/lancamentos/${id}/baixas?tenantId=${tenantId}`),
        api.get<Array<{ id: string; name: string }>>(`/financeiro/contas?tenantId=${tenantId}&activeOnly=true`),
        api.get<Array<{ id: string; name: string }>>(`/financeiro/formas-pagamento?tenantId=${tenantId}&activeOnly=true`),
      ]);
      setLanc(detail.data);
      setSettlements(Array.isArray(baixas.data) ? baixas.data : []);
      const accList = Array.isArray(acc.data) ? acc.data : [];
      setAccounts(accList);
      setAccountNames(Object.fromEntries(accList.map((a) => [a.id, a.name])));
      setMethods(Array.isArray(met.data) ? met.data : []);
      const groupId = detail.data.installmentGroupId;
      if (groupId) {
        const inst = await api.get<InstallmentRow[]>(
          `/financeiro/parcelas/grupo/${groupId}?tenantId=${tenantId}`,
        );
        setInstallments(Array.isArray(inst.data) ? inst.data : []);
      } else {
        setInstallments([]);
      }
    } catch {
      setLanc(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId, id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function approvePayment() {
    try {
      await api.post(`/financeiro/lancamentos/${id}/aprovar?tenantId=${tenantId}`);
      await load();
    } catch (e) {
      setFeedback({ title: "Erro", message: extractFinanceError(e) });
    }
  }

  async function saveInstallmentDue(lancamentoId: string) {
    if (!dueEdit) return;
    try {
      await api.patch(`/financeiro/parcelas/${lancamentoId}/vencimento`, {
        tenantId,
        dueDate: `${dueEdit}T12:00:00.000Z`,
      });
      await load();
    } catch (e) {
      setFeedback({ title: "Erro", message: extractFinanceError(e) });
    }
  }

  const statusLabel = useMemo(() => {
    if (!lanc) return "";
    if (isLegacy) return "Baixa legada";
    if (lanc.status === "parcial") return "Parcialmente liquidado";
    if (lanc.status === "pago") return "Quitado";
    if (lanc.status === "cancelado") return "Cancelado";
    return "Pendente";
  }, [lanc, isLegacy]);

  if (!tenantId) return null;
  if (loading) {
    return (
      <p className="flex items-center gap-2 py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Carregando…
      </p>
    );
  }
  if (!lanc) {
    return <p className="text-sm text-muted-foreground">Lançamento não encontrado.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold text-foreground truncate">{lanc.descricao}</h1>
          <p className="text-xs text-muted-foreground">
            {statusLabel}
            {lanc.payrollDeductionStatus
              ? ` · ${PAYROLL_STATUS_LABELS[lanc.payrollDeductionStatus] ?? lanc.payrollDeductionStatus}`
              : ""}
            {lanc.reconciliationStatus
              ? ` · ${RECONCILIATION_LABELS[lanc.reconciliationStatus] ?? lanc.reconciliationStatus}`
              : ""}
          </p>
        </div>
        {(lanc.status === "pendente" || lanc.status === "parcial") && !isLegacy ? (
          <Button type="button" size="sm" onClick={() => setSettleOpen(true)}>
            Registrar baixa
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumo</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p>
            Original:{" "}
            <span className="tabular-nums">{original.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
          </p>
          <p>
            Liquidado:{" "}
            <span className="tabular-nums">{settled.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
          </p>
          <p>
            Saldo:{" "}
            <span className="tabular-nums">{remaining.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
          </p>
          <p>Vencimento: {new Date(lanc.dueDate).toLocaleDateString("pt-BR")}</p>
          {plannedName ? <p>Conta planejada: {plannedName}</p> : null}
          {isLegacy ? <p className="text-amber-400 sm:col-span-2">Baixa legada — sem detalhe estruturado de conta/forma/comprovante.</p> : null}
          {!lanc.approvedAt && lanc.tipo === "pagar" && lanc.status === "pendente" ? (
            <div className="sm:col-span-2">
              <Button type="button" size="sm" variant="outline" onClick={() => void approvePayment()}>
                Aprovar para pagamento
              </Button>
            </div>
          ) : lanc.approvedAt ? (
            <p className="sm:col-span-2 text-muted-foreground">Aprovado para pagamento.</p>
          ) : null}
          {lanc.payrollDeductionStatus && lanc.payrollDeductionStatus !== "none" ? (
            <div className="sm:col-span-2 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                title="Registrar pagamento por outra forma (ex.: dinheiro, PIX)"
                onClick={() => setSettleOpen(true)}
              >
                Registrar pagamento por outra forma
              </Button>
              <p className="text-xs text-muted-foreground w-full">
                Se a folha ainda não finalizou o desconto, a baixa à vista cancela o agendamento quando seguro.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {installments.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Parcelas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {installments.map((p) => {
              const pOriginal = p.originalAmount ?? p.valor;
              const pSettled = p.amountSettledTotal ?? 0;
              const pRem = Math.max(0, pOriginal - pSettled);
              return (
                <div key={p.id} className="rounded-md border border-border/50 px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-foreground">
                      {p.installmentNumber}/{p.installmentCount} · {p.status}
                    </span>
                    <span className="tabular-nums">
                      {pRem.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{new Date(p.dueDate).toLocaleDateString("pt-BR")}</p>
                  {p.id !== lanc.id && p.status === "pendente" ? (
                    <div className="mt-2 flex flex-wrap items-end gap-2">
                      <div>
                        <Label className="text-xs">Novo vencimento (só esta parcela)</Label>
                        <Input
                          type="date"
                          className="h-8 text-foreground [&::-webkit-datetime-edit]:text-foreground"
                          onChange={(e) => setDueEdit(e.target.value)}
                        />
                      </div>
                      <Button type="button" size="sm" variant="secondary" onClick={() => void saveInstallmentDue(p.id)}>
                        Salvar vencimento
                      </Button>
                      <Link
                        href={`/dashboard/adm/financeiro/lancamentos/${p.id}`}
                        className="text-xs text-primary underline underline-offset-2"
                      >
                        Abrir parcela
                      </Link>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Baixas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {settlements.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma baixa estruturada.</p>
          ) : (
            settlements.map((s) => (
              <div key={s.id} className="rounded-md border border-border/40 px-3 py-2 text-sm">
                <p className="font-medium text-foreground">
                  {new Date(s.settledAt).toLocaleDateString("pt-BR")} ·{" "}
                  {s.finalAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  {s.manualSettlement ? " · manual" : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.paymentMethodName ?? "—"} · {s.actualAccountName ?? "—"}
                  {s.proofs?.length ? ` · ${s.proofs.length} comprovante(s)` : ""}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documentos</CardTitle>
        </CardHeader>
        <CardContent>
          <FinanceDocumentsPanel tenantId={tenantId} lancamentoId={lanc.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conciliação</CardTitle>
        </CardHeader>
        <CardContent>
          <FinanceReconciliationPanel
            tenantId={tenantId}
            lancamentoId={lanc.id}
            status={lanc.reconciliationStatus ?? "not_reconciled"}
            onUpdated={() => void load()}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Linha do tempo</CardTitle>
        </CardHeader>
        <CardContent>
          <FinanceTimelinePanel tenantId={tenantId} lancamentoId={lanc.id} />
        </CardContent>
      </Card>

      <FinanceSettlementDialog
        open={settleOpen}
        onOpenChange={setSettleOpen}
        tenantId={tenantId}
        lancamentoId={lanc.id}
        plannedAccountId={lanc.financeAccountId}
        plannedAccountName={plannedName}
        originalAmount={original}
        remainingBalance={remaining}
        accounts={accounts}
        paymentMethods={methods}
        onDone={() => void load()}
      />

      {feedback ? (
        <FeedbackModal open onOpenChange={() => setFeedback(null)} title={feedback.title} message={feedback.message} />
      ) : null}
    </div>
  );
}
