"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectField } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import {
  FINANCE_LINK_STATUS,
  FINANCE_LINK_TYPES,
  type AthleteFinanceLinkRow,
  type AthleteFinancialSummary,
  financeLinkTypeLabel,
  financeiroLancamentoHref,
} from "@/lib/athlete-contract-finance";
import { FeedbackModal } from "@/components/ui/feedback-modal";

type ContractOpt = { id: string; label: string };
type FederativeOpt = { id: string; label: string };

type Props = {
  playerId: string;
  tenantId: string;
  canViewFinancial: boolean;
  canManage: boolean;
  financeLinks: AthleteFinanceLinkRow[];
  financialSummary: AthleteFinancialSummary | null;
  contracts: ContractOpt[];
  federativeId: string | null;
  onReload: () => Promise<void>;
};

const emptyForm = {
  linkType: "federation_fee",
  description: "",
  amount: "",
  status: "pendente",
  contractId: "",
  federativeProcessId: "",
  financeiroLancamentoId: "",
  omieReference: "",
};

export function PlayerAthleteContractFinanceSection({
  playerId,
  tenantId,
  canViewFinancial,
  canManage,
  financeLinks,
  financialSummary,
  contracts,
  federativeId,
  onReload,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  if (!canViewFinancial) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Financeiro relacionado</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Resumo restrito ao perfil financeiro. Consulte a equipe Financeiro para detalhes de obrigações vinculadas.
          </p>
        </CardContent>
      </Card>
    );
  }

  function openCreate() {
    setEditId(null);
    setForm({
      ...emptyForm,
      federativeProcessId: federativeId ?? "",
    });
    setDialogOpen(true);
  }

  function openEdit(row: AthleteFinanceLinkRow) {
    setEditId(row.id);
    setForm({
      linkType: row.linkType,
      description: row.description ?? "",
      amount: row.amount != null ? String(row.amount) : "",
      status: row.status ?? "pendente",
      contractId: row.contractId ?? "",
      federativeProcessId: row.federativeProcessId ?? federativeId ?? "",
      financeiroLancamentoId: row.financeiroLancamentoId ?? "",
      omieReference: row.omieReference ?? "",
    });
    setDialogOpen(true);
  }

  async function save() {
    setSaving(true);
    try {
      const payload = {
        linkType: form.linkType,
        description: form.description.trim() || undefined,
        amount: form.amount.trim() ? Number(form.amount) : undefined,
        status: form.status,
        contractId: form.contractId || undefined,
        federativeProcessId: form.federativeProcessId || federativeId || undefined,
        financeiroLancamentoId: form.financeiroLancamentoId.trim() || undefined,
        omieReference: form.omieReference.trim() || undefined,
      };
      if (editId) {
        await api.patch(`/players/${playerId}/athlete-contract-finance-links/${editId}`, payload);
      } else {
        await api.post(`/players/${playerId}/athlete-contract-finance-links`, payload);
      }
      setDialogOpen(false);
      await onReload();
      setFeedback({ title: "Financeiro", message: editId ? "Vínculo atualizado." : "Vínculo criado." });
    } catch (e) {
      setFeedback({
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível salvar o vínculo.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      await api.delete(`/players/${playerId}/athlete-contract-finance-links/${deleteId}`);
      setDeleteId(null);
      await onReload();
      setFeedback({ title: "Financeiro", message: "Vínculo removido." });
    } catch (e) {
      setFeedback({
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível remover.",
      });
    }
  }

  const summary = financialSummary;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Financeiro relacionado</CardTitle>
          {canManage ? (
            <Button type="button" size="sm" onClick={openCreate}>
              Adicionar vínculo
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {summary ? (
            <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <span className="text-muted-foreground">Vínculos: </span>
                <span className="font-medium">{summary.totalLinks}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Pendentes: </span>
                <span className="font-medium text-amber-600 dark:text-amber-400">{summary.pendingCount}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Quitados: </span>
                <span className="font-medium">{summary.paidCount}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Taxas fed./transf.: </span>
                <span className="font-medium">
                  {summary.federationFees} / {summary.transferFees}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Ajuda de custo: </span>
                <span className="font-medium">{summary.allowances}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Ref. salário / contratual: </span>
                <span className="font-medium">
                  {summary.salaryReferences} / {summary.contractualPayments}
                </span>
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Financeiro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {financeLinks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                      Nenhum vínculo financeiro.
                    </TableCell>
                  </TableRow>
                ) : (
                  financeLinks.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{financeLinkTypeLabel(row.linkType)}</TableCell>
                      <TableCell>{row.description ?? "—"}</TableCell>
                      <TableCell>
                        {row.amount != null ? `${row.amount} ${row.currency ?? "BRL"}` : "—"}
                      </TableCell>
                      <TableCell>{row.status ?? "—"}</TableCell>
                      <TableCell>
                        {row.financeiroLancamentoId ? (
                          <Link
                            href={financeiroLancamentoHref(tenantId, row.financeiroLancamentoId)}
                            className="text-primary underline underline-offset-2"
                          >
                            Abrir lançamento
                          </Link>
                        ) : row.omieReference ? (
                          <span className="text-xs text-muted-foreground">Omie: {row.omieReference}</span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        {canManage ? (
                          <>
                            <Button type="button" size="sm" variant="ghost" onClick={() => openEdit(row)}>
                              Editar
                            </Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => setDeleteId(row.id)}>
                              Remover
                            </Button>
                          </>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar vínculo financeiro" : "Adicionar vínculo financeiro"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <NativeSelect
              className="sm:col-span-2"
              value={form.linkType}
              onChange={(e) => setForm((f) => ({ ...f, linkType: e.target.value }))}
            >
              {FINANCE_LINK_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </NativeSelect>
            <NativeSelectField
              className="sm:col-span-2"
              value={form.contractId}
              onChange={(e) => setForm((f) => ({ ...f, contractId: e.target.value }))}
              placeholder="Contrato relacionado (opcional)"
              options={contracts.map((c) => ({ value: c.id, label: c.label }))}
            />
            {federativeId ? (
              <p className="sm:col-span-2 text-xs text-muted-foreground">
                Processo federativo atual vinculável no cadastro da federação.
              </p>
            ) : null}
            <Input
              className="sm:col-span-2"
              value={form.financeiroLancamentoId}
              onChange={(e) => setForm((f) => ({ ...f, financeiroLancamentoId: e.target.value }))}
              placeholder="ID lançamento Financeiro (opcional)"
            />
            <Input
              value={form.omieReference}
              onChange={(e) => setForm((f) => ({ ...f, omieReference: e.target.value }))}
              placeholder="Referência Omie"
            />
            <Input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="Valor"
            />
            <NativeSelect value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              {FINANCE_LINK_STATUS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </NativeSelect>
            <Textarea
              className="sm:col-span-2"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Observações"
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover vínculo financeiro?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não apaga lançamentos no Financeiro.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FeedbackModal
        open={!!feedback}
        onOpenChange={() => setFeedback(null)}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
      />
    </>
  );
}
