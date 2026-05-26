"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, FileText, Loader2, Plus, RefreshCw, Send, Trash2 } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import {
  CONTRACT_TEMPLATE_TYPE_LABELS,
  EMPLOYMENT_CONTRACT_STATUS_LABELS,
  filterTemplatesForEmployment,
  type ContractTemplateRow,
  type EmploymentContractRow,
} from "@/lib/contract-templates";
import { type EmploymentRow } from "@/app/dashboard/adm/rh/components/EmploymentFormDialog";

const selectClassName =
  "w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground";

interface EmploymentContractsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employment: EmploymentRow | null;
}

export function EmploymentContractsDialog({
  open,
  onOpenChange,
  employment,
}: EmploymentContractsDialogProps) {
  const [contracts, setContracts] = useState<EmploymentContractRow[]>([]);
  const [templates, setTemplates] = useState<ContractTemplateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sendOpen, setSendOpen] = useState<EmploymentContractRow | null>(null);
  const [signerEmail, setSignerEmail] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signaturePage, setSignaturePage] = useState("1");
  const [sending, setSending] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!employment?.id) return;
    setLoading(true);
    try {
      const tenantQs = employment.tenantId
        ? `?tenantId=${encodeURIComponent(employment.tenantId)}&contractType=${encodeURIComponent(employment.contractType)}`
        : `?contractType=${encodeURIComponent(employment.contractType)}`;
      const [contractsRes, templatesRes] = await Promise.all([
        api.get<EmploymentContractRow[]>(`/rh/employments/${employment.id}/contracts`),
        api.get<ContractTemplateRow[]>(`/rh/contract-templates${tenantQs}`),
      ]);
      setContracts(Array.isArray(contractsRes.data) ? contractsRes.data : []);
      setTemplates(Array.isArray(templatesRes.data) ? templatesRes.data : []);
    } catch {
      setContracts([]);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [employment?.id, employment?.tenantId, employment?.contractType]);

  useEffect(() => {
    if (!open || !employment) return;
    setTemplateId("");
    load();
  }, [open, employment, load]);

  const handleGenerate = async () => {
    if (!employment?.id || !templateId) return;
    setGenerating(true);
    try {
      await api.post(`/rh/employments/${employment.id}/contracts/generate`, {
        templateId,
      });
      setTemplateId("");
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao gerar contrato");
    } finally {
      setGenerating(false);
    }
  };

  const openSend = (row: EmploymentContractRow) => {
    setSendOpen(row);
    setSignerEmail(row.signerEmail ?? "");
    setSignerName(row.signerName ?? employment?.employee?.name ?? "");
    setSignaturePage(String(row.template?.signaturePage ?? 1));
  };

  const handleSend = async () => {
    if (!employment?.id || !sendOpen || !signerEmail.trim()) return;
    setSending(true);
    try {
      await api.post(
        `/rh/employments/${employment.id}/contracts/${sendOpen.id}/send-for-signature`,
        {
          signerEmail: signerEmail.trim(),
          signerName: signerName.trim() || undefined,
          signaturePage: parseInt(signaturePage, 10) || 1,
        },
      );
      setSendOpen(null);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao enviar para assinatura");
    } finally {
      setSending(false);
    }
  };

  const handleSync = async (contractId: string) => {
    if (!employment?.id) return;
    setSyncingId(contractId);
    try {
      await api.post(`/rh/employments/${employment.id}/contracts/${contractId}/sync`);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao sincronizar");
    } finally {
      setSyncingId(null);
    }
  };

  const handleDownload = (contractId: string, signed = false) => {
    if (!employment?.id) return;
    const qs = signed ? "?signed=true" : "";
    window.open(`/api/rh/employments/${employment.id}/contracts/${contractId}/download${qs}`, "_blank");
  };

  const handleDelete = async (contractId: string) => {
    if (!employment?.id) return;
    if (!confirm("Excluir este contrato gerado?")) return;
    try {
      await api.delete(`/rh/employments/${employment.id}/contracts/${contractId}`);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao excluir");
    }
  };

  const employeeLabel = employment?.employee?.name ?? "—";
  const jobLabel = employment?.jobRole?.name ?? "—";
  const contractTypeLabel = employment?.contractType?.toUpperCase() ?? "—";
  const visibleTemplates = employment
    ? filterTemplatesForEmployment(templates, employment.contractType)
    : templates;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full min-w-0 max-h-[min(90vh,calc(100dvh-2rem))] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Contratos do vínculo</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {employeeLabel} — {jobLabel} · Vínculo <strong>{contractTypeLabel}</strong>
            </p>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
              <p className="text-sm font-medium">Gerar a partir de modelo (Jurídico)</p>
              <p className="text-xs text-muted-foreground">
                Mostrando modelos compatíveis com vínculo {contractTypeLabel}. Cada tipo de contrato (CLT, PJ, estágio, atleta…) pode ter PDF e campos próprios no Jurídico.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="grid flex-1 gap-2 min-w-0">
                  <Label htmlFor="gen-template">Modelo</Label>
                  <select
                    id="gen-template"
                    className={selectClassName}
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                  >
                    <option value="">Selecione o contrato base</option>
                    {visibleTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({CONTRACT_TEMPLATE_TYPE_LABELS[t.type] ?? t.type})
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="button" disabled={!templateId || generating} onClick={handleGenerate}>
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Gerar PDF
                    </>
                  )}
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando contratos…
              </div>
            ) : contracts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum contrato gerado para este vínculo.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-40">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{c.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.template?.name ?? "—"} ·{" "}
                            {new Date(c.createdAt).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {EMPLOYMENT_CONTRACT_STATUS_LABELS[c.status] ?? c.status}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Baixar PDF"
                            onClick={() => handleDownload(c.id, false)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {c.status === "signed" && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Baixar assinado"
                              onClick={() => handleDownload(c.id, true)}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          )}
                          {(c.status === "draft" || c.status === "cancelled") && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Enviar para assinatura"
                              onClick={() => openSend(c)}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                          {c.status === "pending_signature" && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Buscar status / PDF assinado"
                              disabled={syncingId === c.id}
                              onClick={() => handleSync(c.id)}
                            >
                              {syncingId === c.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {c.status === "draft" && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDelete(c.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!sendOpen} onOpenChange={(o) => !o && setSendOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar para assinatura</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="sign-email">E-mail do signatário *</Label>
              <Input
                id="sign-email"
                type="email"
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sign-name">Nome do signatário</Label>
              <Input id="sign-name" value={signerName} onChange={(e) => setSignerName(e.target.value.toUpperCase())} className="uppercase" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sign-page">Página da assinatura</Label>
              <Input id="sign-page" type="number" min={1} value={signaturePage} onChange={(e) => setSignaturePage(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSendOpen(null)}>
              Cancelar
            </Button>
            <Button type="button" disabled={sending || !signerEmail.trim()} onClick={handleSend}>
              {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
