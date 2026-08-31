"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExpandableSection, FormGrid } from "@/components/dashboard/players/ExpandableSection";
import { FeedbackModal, type FeedbackVariant } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { formatBrlAmount, maskBrlInput, parseBrlAmount } from "@/lib/format-money-brl";
import { formatDateDayMonYear } from "@/lib/format-date";

type CompensationItem = {
  id: string;
  kind: string;
  amount: string | number;
  effectiveFrom: string;
  effectiveTo: string | null;
  notes: string | null;
  legalDocumentId: string | null;
};

type SalaryRevision = {
  id: string;
  amount: string | number;
  effectiveFrom: string;
  effectiveTo: string | null;
};

export type BankData = {
  bank?: string;
  agency?: string;
  account?: string;
  accountType?: string;
  operation?: string;
  pix?: string;
  pixKeyType?: string;
  holderName?: string;
  holderCpf?: string;
};

const KIND_CONFIG = [
  { kind: "TRANSPORT", label: "Vale Transporte" },
  { kind: "MEAL", label: "Alimentação" },
  { kind: "COST_ALLOWANCE", label: "Ajuda de Custo" },
  { kind: "IMAGE_RIGHTS", label: "Direito de Imagem" },
] as const;

function amountNumber(value: string | number): number {
  if (typeof value === "number") return value;
  return Number(value);
}

function isActiveItem(item: CompensationItem): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const from = new Date(item.effectiveFrom);
  from.setHours(0, 0, 0, 0);
  if (from > today) return false;
  if (!item.effectiveTo) return true;
  const to = new Date(item.effectiveTo);
  to.setHours(0, 0, 0, 0);
  return to >= today;
}

type Props = {
  employmentId: string | null;
  bankData: BankData;
  onBankDataChange: (next: BankData) => void;
};

export function EmploymentRhFinancialSections({ employmentId, bankData, onBankDataChange }: Props) {
  const [items, setItems] = useState<CompensationItem[]>([]);
  const [revisions, setRevisions] = useState<SalaryRevision[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingKind, setSavingKind] = useState<string | null>(null);
  const [newRevisionAmount, setNewRevisionAmount] = useState("");
  const [newRevisionDate, setNewRevisionDate] = useState("");
  const [compDialog, setCompDialog] = useState<{ kind: string; label: string } | null>(null);
  const [compAmount, setCompAmount] = useState("");
  const [compFrom, setCompFrom] = useState("");
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: FeedbackVariant;
  }>({ open: false, title: "", message: "", variant: "info" });

  const loadFinancial = useCallback(async () => {
    if (!employmentId) return;
    setLoading(true);
    try {
      const [itemsRes, revRes] = await Promise.all([
        api.get<CompensationItem[]>(`/rh/employment-compensation/by-employment/${employmentId}`),
        api.get<SalaryRevision[]>(`/rh/employment-salary-revisions/by-employment/${employmentId}`),
      ]);
      setItems(Array.isArray(itemsRes.data) ? itemsRes.data : []);
      setRevisions(Array.isArray(revRes.data) ? revRes.data : []);
    } catch {
      setItems([]);
      setRevisions([]);
    } finally {
      setLoading(false);
    }
  }, [employmentId]);

  useEffect(() => {
    void loadFinancial();
  }, [loadFinancial]);

  const openCompDialog = (kind: string, label: string) => {
    setCompDialog({ kind, label });
    setCompAmount("");
    setCompFrom(new Date().toISOString().slice(0, 10));
  };

  const submitCompensation = async () => {
    if (!employmentId || !compDialog) return;
    const amount = parseBrlAmount(compAmount);
    if (amount == null || amount <= 0 || !compFrom.trim()) {
      setFeedback({
        open: true,
        title: "Dados incompletos",
        message: "Informe valor e data de vigência.",
        variant: "warning",
      });
      return;
    }
    setSavingKind(compDialog.kind);
    try {
      await api.post(`/rh/employment-compensation/by-employment/${employmentId}`, {
        kind: compDialog.kind,
        amount,
        effectiveFrom: `${compFrom.trim().slice(0, 10)}T12:00:00.000Z`,
      });
      setCompDialog(null);
      await loadFinancial();
    } catch (err) {
      setFeedback({
        open: true,
        title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível salvar o benefício.",
        variant: "error",
      });
    } finally {
      setSavingKind(null);
    }
  };

  const addSalaryRevision = async () => {
    if (!employmentId) return;
    const amount = parseBrlAmount(newRevisionAmount);
    if (amount == null || amount <= 0 || !newRevisionDate.trim()) {
      setFeedback({
        open: true,
        title: "Dados incompletos",
        message: "Informe valor e data de vigência do reajuste.",
        variant: "warning",
      });
      return;
    }
    try {
      await api.post(`/rh/employment-salary-revisions/by-employment/${employmentId}`, {
        amount,
        effectiveFrom: `${newRevisionDate.trim()}T12:00:00.000Z`,
      });
      setNewRevisionAmount("");
      setNewRevisionDate("");
      await loadFinancial();
    } catch (err) {
      setFeedback({
        open: true,
        title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível registrar o reajuste.",
        variant: "error",
      });
    }
  };

  const patchBank = (key: keyof BankData, value: string) => {
    onBankDataChange({ ...bankData, [key]: value });
  };

  return (
    <>
      <ExpandableSection title="Dados bancários" description="Fonte administrativa do vínculo RH">
        <FormGrid cols={2}>
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="bank-name">Banco</Label>
            <Input id="bank-name" value={bankData.bank ?? ""} onChange={(e) => patchBank("bank", e.target.value)} />
          </div>
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="bank-agency">Agência</Label>
            <Input id="bank-agency" value={bankData.agency ?? ""} onChange={(e) => patchBank("agency", e.target.value)} />
          </div>
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="bank-account">Conta</Label>
            <Input id="bank-account" value={bankData.account ?? ""} onChange={(e) => patchBank("account", e.target.value)} />
          </div>
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="bank-type">Tipo de conta</Label>
            <Input id="bank-type" value={bankData.accountType ?? ""} onChange={(e) => patchBank("accountType", e.target.value)} />
          </div>
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="bank-operation">Operação</Label>
            <Input id="bank-operation" value={bankData.operation ?? ""} onChange={(e) => patchBank("operation", e.target.value)} />
          </div>
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="bank-pix">PIX</Label>
            <Input id="bank-pix" value={bankData.pix ?? ""} onChange={(e) => patchBank("pix", e.target.value)} />
          </div>
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="bank-pix-type">Tipo PIX</Label>
            <Input id="bank-pix-type" value={bankData.pixKeyType ?? ""} onChange={(e) => patchBank("pixKeyType", e.target.value)} />
          </div>
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="bank-holder">Titular da conta</Label>
            <Input id="bank-holder" value={bankData.holderName ?? ""} onChange={(e) => patchBank("holderName", e.target.value)} />
          </div>
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="bank-holder-cpf">CPF do titular</Label>
            <Input id="bank-holder-cpf" value={bankData.holderCpf ?? ""} onChange={(e) => patchBank("holderCpf", e.target.value)} />
          </div>
        </FormGrid>
      </ExpandableSection>

      {employmentId ? (
        <>
          <ExpandableSection title="Histórico salarial">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando…
              </div>
            ) : (
              <div className="space-y-3">
                {revisions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum reajuste registrado.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {revisions.map((rev) => (
                      <li key={rev.id} className="flex flex-wrap gap-x-2">
                        <span>{formatDateDayMonYear(rev.effectiveFrom.slice(0, 10))}</span>
                        <span>—</span>
                        <span>{rev.effectiveTo ? formatDateDayMonYear(rev.effectiveTo.slice(0, 10)) : "atual"}</span>
                        <span className="font-medium tabular-nums">
                          R$ {formatBrlAmount(amountNumber(rev.amount))}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <FormGrid cols={2}>
                  <div className="grid min-w-0 gap-2">
                    <Label>Novo salário (R$)</Label>
                    <Input
                      inputMode="numeric"
                      className="tabular-nums"
                      value={newRevisionAmount}
                      onChange={(e) => setNewRevisionAmount(maskBrlInput(e.target.value))}
                    />
                  </div>
                  <div className="grid min-w-0 gap-2">
                    <Label>Vigência a partir de</Label>
                    <Input
                      type="date"
                      className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                      value={newRevisionDate}
                      onChange={(e) => setNewRevisionDate(e.target.value)}
                    />
                  </div>
                </FormGrid>
                <Button type="button" variant="secondary" size="sm" onClick={() => void addSalaryRevision()}>
                  Registrar reajuste
                </Button>
              </div>
            )}
          </ExpandableSection>

          <ExpandableSection title="Remuneração variável">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando…
              </div>
            ) : (
              <div className="space-y-4">
                {KIND_CONFIG.map(({ kind, label }) => {
                  const kindItems = items.filter((i) => i.kind === kind);
                  const current = kindItems.find(isActiveItem);
                  return (
                    <div key={kind} className="rounded-lg border border-border p-3 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">{label}</p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={savingKind === kind}
                          onClick={() => openCompDialog(kind, label)}
                        >
                          {savingKind === kind ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="mr-1 h-4 w-4" />
                          )}
                          Alterar
                        </Button>
                      </div>
                      {current ? (
                        <p className="text-sm text-muted-foreground">
                          Atual: R$ {formatBrlAmount(amountNumber(current.amount))} · desde{" "}
                          {formatDateDayMonYear(current.effectiveFrom.slice(0, 10))}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Sem valor ativo.</p>
                      )}
                      {kindItems.length > 0 ? (
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {kindItems.map((item) => (
                            <li key={item.id}>
                              {formatDateDayMonYear(item.effectiveFrom.slice(0, 10))} —{" "}
                              {item.effectiveTo
                                ? formatDateDayMonYear(item.effectiveTo.slice(0, 10))
                                : "atual"}{" "}
                              · R$ {formatBrlAmount(amountNumber(item.amount))}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </ExpandableSection>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Salve o vínculo para registrar benefícios, ajuda de custo, direito de imagem e histórico salarial.
        </p>
      )}

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.variant}
      />

      <Dialog open={compDialog != null} onOpenChange={(open) => !open && setCompDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{compDialog ? `Novo valor — ${compDialog.label}` : "Benefício"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label>Valor mensal (R$)</Label>
              <Input
                inputMode="numeric"
                className="tabular-nums"
                value={compAmount}
                onChange={(e) => setCompAmount(maskBrlInput(e.target.value))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Vigência a partir de</Label>
              <Input
                type="date"
                className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                value={compFrom}
                onChange={(e) => setCompFrom(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCompDialog(null)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void submitCompensation()} disabled={savingKind != null}>
              {savingKind ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
