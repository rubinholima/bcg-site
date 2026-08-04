"use client";

import { formatDateDayMonYear } from "@/lib/format-date";

import { useCallback, useEffect, useState } from "react";
import { Download, Eye, FileText, Loader2, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
  type EmploymentContractRow,
} from "@/lib/contract-templates";
import { FIXTURE_CATEGORIES } from "@/lib/fixture-categories";

const DOC_TYPE_LABELS: Record<string, string> = {
  contrato_trabalho: "Contrato de trabalho",
  contrato_imagem: "Contrato de imagem",
  formacao: "Contrato de formação",
  rescisao: "Termo de rescisão",
  transferencia: "Termo de transferência",
  aditivo: "Aditivo contratual",
  procuração: "Procuração",
  nda: "NDA / Confidencialidade",
  outro: "Outro",
};

const DOC_STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  pending_signature: "Aguardando assinatura",
  signed: "Assinado",
  expired: "Expirado",
  cancelled: "Cancelado",
};

interface LegalDocWithPlayer {
  id: string;
  playerId: string;
  type: string;
  name: string;
  status: string;
  signerEmail?: string | null;
  signerName?: string | null;
  createdAt: string;
  player: {
    id: string;
    name: string;
    category?: string | null;
    tenant?: { name: string } | null;
  };
}

type UnifiedRow =
  | { kind: "player"; doc: LegalDocWithPlayer }
  | { kind: "employment"; doc: EmploymentContractRow };

interface JuridicoAllContractsCardProps {
  tenantId?: string;
  category?: string;
  docType?: string;
  docStatus?: string;
  onSelectPlayer?: (playerId: string) => void;
}

function categoryLabel(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  const found = FIXTURE_CATEGORIES.find((c) => c.value === value);
  return found?.labelPT ?? value;
}

async function openPdfBlob(url: string): Promise<void> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("Não foi possível abrir o PDF.");
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000);
}

export function JuridicoAllContractsCard({
  tenantId,
  category,
  docType,
  docStatus,
  onSelectPlayer,
}: JuridicoAllContractsCardProps) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<UnifiedRow[]>([]);
  const [sendTarget, setSendTarget] = useState<UnifiedRow | null>(null);
  const [signerEmail, setSignerEmail] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signaturePage, setSignaturePage] = useState("1");
  const [sending, setSending] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [openingPdfId, setOpeningPdfId] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const legalParams = new URLSearchParams();
      if (tenantId) legalParams.set("tenantId", tenantId);
      if (category) legalParams.set("category", category);
      if (docType) legalParams.set("type", docType);
      if (docStatus) legalParams.set("status", docStatus);

      const rhParams = new URLSearchParams();
      if (tenantId) rhParams.set("tenantId", tenantId);
      if (docType) rhParams.set("type", docType);
      if (docStatus) rhParams.set("status", docStatus);

      const [legalRes, rhRes] = await Promise.all([
        api.get<LegalDocWithPlayer[]>(`/legal-documents?${legalParams.toString()}`),
        api.get<EmploymentContractRow[]>(`/employment-contracts?${rhParams.toString()}`),
      ]);

      const legalRows: UnifiedRow[] = (Array.isArray(legalRes.data) ? legalRes.data : []).map(
        (doc) => ({ kind: "player" as const, doc }),
      );
      const rhRows: UnifiedRow[] = category
        ? []
        : (Array.isArray(rhRes.data) ? rhRes.data : []).map((doc) => ({
            kind: "employment" as const,
            doc,
          }));

      const merged = [...legalRows, ...rhRows].sort(
        (a, b) => new Date(b.doc.createdAt).getTime() - new Date(a.doc.createdAt).getTime(),
      );
      setRows(merged);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, category, docType, docStatus]);

  useEffect(() => {
    load();
  }, [load]);

  const openSend = (row: UnifiedRow) => {
    setSendTarget(row);
    if (row.kind === "player") {
      setSignerEmail(row.doc.signerEmail ?? "");
      setSignerName(row.doc.signerName ?? row.doc.player.name ?? "");
      setSignaturePage("1");
    } else {
      setSignerEmail(row.doc.signerEmail ?? row.doc.employment?.employee?.email ?? "");
      setSignerName(
        row.doc.signerName ?? row.doc.employment?.employee?.name ?? "",
      );
      setSignaturePage(String(row.doc.template?.signaturePage ?? 1));
    }
  };

  const handleSend = async () => {
    if (!sendTarget || !signerEmail.trim()) return;
    setSending(true);
    try {
      const page = parseInt(signaturePage, 10) || 1;
      if (sendTarget.kind === "player") {
        await api.post(
          `/players/${sendTarget.doc.playerId}/legal-documents/${sendTarget.doc.id}/send-for-signature`,
          {
            signerEmail: signerEmail.trim(),
            signerName: signerName.trim() || undefined,
            signaturePage: page,
          },
        );
      } else {
        await api.post(
          `/employment-contracts/${sendTarget.doc.employmentId}/${sendTarget.doc.id}/send-for-signature`,
          {
            signerEmail: signerEmail.trim(),
            signerName: signerName.trim() || undefined,
            signaturePage: page,
          },
        );
      }
      setSendTarget(null);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao enviar para assinatura");
    } finally {
      setSending(false);
    }
  };

  const handleSync = async (row: UnifiedRow) => {
    setSyncingId(row.doc.id);
    try {
      if (row.kind === "player") {
        await api.post(`/players/${row.doc.playerId}/legal-documents/${row.doc.id}/sync`);
      } else {
        await api.post(
          `/employment-contracts/${row.doc.employmentId}/${row.doc.id}/sync`,
        );
      }
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao sincronizar");
    } finally {
      setSyncingId(null);
    }
  };

  const handleView = async (row: UnifiedRow) => {
    setOpeningPdfId(row.doc.id);
    setPdfError(null);
    try {
      if (row.kind === "player") {
        await openPdfBlob(
          `/api/players/${row.doc.playerId}/contract-documents/${row.doc.id}/file`,
        );
      } else {
        await openPdfBlob(
          `/api/employment-contracts/${row.doc.employmentId}/${row.doc.id}/download`,
        );
      }
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "Erro ao abrir PDF.");
    } finally {
      setOpeningPdfId(null);
    }
  };

  const handleDownload = async (row: UnifiedRow, signed = false) => {
    try {
      if (row.kind === "player") {
        await openPdfBlob(
          `/api/players/${row.doc.playerId}/legal-documents/${row.doc.id}/download`,
        );
        return;
      }
      const qs = signed ? "?signed=true" : "";
      await openPdfBlob(
        `/api/employment-contracts/${row.doc.employmentId}/${row.doc.id}/download${qs}`,
      );
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "Erro ao baixar PDF.");
    }
  };

  const statusClass = (status: string) =>
    status === "signed"
      ? "text-green-600 dark:text-green-400 font-medium"
      : status === "pending_signature"
        ? "text-amber-600 dark:text-amber-400"
        : "text-muted-foreground";

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Todos os contratos
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Atletas (Jurídico) e vínculos RH. Filtre por clube, categoria ou tipo de documento.
          </p>
          {pdfError && (
            <p className="text-sm text-destructive mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2">
              {pdfError}
            </p>
          )}
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Carregando contratos...
            </div>
          ) : rows.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground text-center">
              Nenhum contrato encontrado com os filtros selecionados.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Origem</TableHead>
                    <TableHead>Pessoa</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Clube</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-36">Ações</TableHead>
                    <TableHead className="text-right">Criado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const id = row.doc.id;
                    const status = row.doc.status;
                    const canSend = status === "draft" || status === "cancelled";
                    const canSync = status === "pending_signature";
                    const isSigned = status === "signed";

                    if (row.kind === "player") {
                      const doc = row.doc;
                      return (
                        <TableRow
                          key={`p-${doc.id}`}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => onSelectPlayer?.(doc.playerId)}
                        >
                          <TableCell className="text-xs uppercase text-muted-foreground">
                            Atleta
                          </TableCell>
                          <TableCell className="font-medium">{doc.player.name}</TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {categoryLabel(doc.player.category)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {doc.player.tenant?.name ?? "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {DOC_TYPE_LABELS[doc.type] ?? doc.type}
                          </TableCell>
                          <TableCell>{doc.name}</TableCell>
                          <TableCell>
                            <span className={statusClass(status)}>
                              {DOC_STATUS_LABELS[status] ?? status}
                            </span>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-wrap gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Visualizar PDF"
                                disabled={openingPdfId === id}
                                onClick={() => void handleView(row)}
                              >
                                {openingPdfId === id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Baixar PDF"
                                onClick={() => void handleDownload(row)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              {canSend && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="Enviar para assinatura"
                                  onClick={() => openSend(row)}
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              )}
                              {canSync && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="Buscar status"
                                  disabled={syncingId === id}
                                  onClick={() => handleSync(row)}
                                >
                                  {syncingId === id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <RefreshCw className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground text-sm">
                            {formatDateDayMonYear(doc.createdAt)}
                          </TableCell>
                        </TableRow>
                      );
                    }

                    const doc = row.doc;
                    const person = doc.employment?.employee?.name ?? "—";
                    const club = doc.tenant?.name ?? "—";
                    const typeLabel =
                      CONTRACT_TEMPLATE_TYPE_LABELS[doc.template?.type ?? ""] ??
                      doc.template?.type ??
                      doc.employment?.contractType?.toUpperCase() ??
                      "—";

                    return (
                      <TableRow key={`e-${doc.id}`} className="hover:bg-muted/50">
                        <TableCell className="text-xs uppercase text-muted-foreground">RH</TableCell>
                        <TableCell className="font-medium">{person}</TableCell>
                        <TableCell className="text-muted-foreground">—</TableCell>
                        <TableCell className="text-muted-foreground">{club}</TableCell>
                        <TableCell className="text-muted-foreground">{typeLabel}</TableCell>
                        <TableCell>{doc.name}</TableCell>
                        <TableCell>
                          <span className={statusClass(status)}>
                            {EMPLOYMENT_CONTRACT_STATUS_LABELS[status] ?? status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Visualizar PDF"
                              disabled={openingPdfId === id}
                              onClick={() => void handleView(row)}
                            >
                              {openingPdfId === id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Baixar PDF"
                              onClick={() => void handleDownload(row)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {isSigned && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Baixar assinado"
                                onClick={() => handleDownload(row, true)}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            )}
                            {canSend && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Enviar para assinatura"
                                onClick={() => openSend(row)}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                            {canSync && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Buscar status"
                                disabled={syncingId === id}
                                onClick={() => handleSync(row)}
                              >
                                {syncingId === id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm">
                          {formatDateDayMonYear(doc.createdAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!sendTarget} onOpenChange={(o) => !o && setSendTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar para assinatura</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="jur-sign-email">E-mail do signatário *</Label>
              <Input
                id="jur-sign-email"
                type="email"
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="jur-sign-name">Nome do signatário</Label>
              <Input
                id="jur-sign-name"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value.toUpperCase())}
                className="uppercase"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="jur-sign-page">Página da assinatura</Label>
              <Input
                id="jur-sign-page"
                type="number"
                min={1}
                value={signaturePage}
                onChange={(e) => setSignaturePage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSendTarget(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={sending || !signerEmail.trim()}
              onClick={handleSend}
            >
              {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
