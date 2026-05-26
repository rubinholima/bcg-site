"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, FileText, Loader2, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

interface JuridicoPersonContractsPanelProps {
  employeeId: string;
  employeeName: string;
  tenantId?: string;
}

export function JuridicoPersonContractsPanel({
  employeeId,
  employeeName,
  tenantId,
}: JuridicoPersonContractsPanelProps) {
  const [contracts, setContracts] = useState<EmploymentContractRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendOpen, setSendOpen] = useState<EmploymentContractRow | null>(null);
  const [signerEmail, setSignerEmail] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signaturePage, setSignaturePage] = useState("1");
  const [sending, setSending] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("employeeId", employeeId);
      if (tenantId) params.set("tenantId", tenantId);
      const { data } = await api.get<EmploymentContractRow[]>(
        `/employment-contracts?${params.toString()}`,
      );
      setContracts(Array.isArray(data) ? data : []);
    } catch {
      setContracts([]);
    } finally {
      setLoading(false);
    }
  }, [employeeId, tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  const openSend = (row: EmploymentContractRow) => {
    setSendOpen(row);
    setSignerEmail(row.signerEmail ?? row.employment?.employee?.email ?? "");
    setSignerName(row.signerName ?? row.employment?.employee?.name ?? employeeName);
    setSignaturePage(String(row.template?.signaturePage ?? 1));
  };

  const handleSend = async () => {
    if (!sendOpen || !signerEmail.trim()) return;
    setSending(true);
    try {
      await api.post(
        `/employment-contracts/${sendOpen.employmentId}/${sendOpen.id}/send-for-signature`,
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

  const handleSync = async (row: EmploymentContractRow) => {
    setSyncingId(row.id);
    try {
      await api.post(`/employment-contracts/${row.employmentId}/${row.id}/sync`);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao sincronizar");
    } finally {
      setSyncingId(null);
    }
  };

  const handleDownload = (row: EmploymentContractRow, signed = false) => {
    const qs = signed ? "?signed=true" : "";
    window.open(
      `/api/employment-contracts/${row.employmentId}/${row.id}/download${qs}`,
      "_blank",
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Contratos RH</CardTitle>
          <CardDescription>
            Contratos gerados a partir dos vínculos de {employeeName} (dados do RH).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando contratos…
            </div>
          ) : contracts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Nenhum contrato RH gerado para esta pessoa.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-28">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(c.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {CONTRACT_TEMPLATE_TYPE_LABELS[c.template?.type ?? ""] ??
                          c.template?.type ??
                          "—"}
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
                            onClick={() => handleDownload(c)}
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
                              onClick={() => handleDownload(c, true)}
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
                              title="Buscar status"
                              disabled={syncingId === c.id}
                              onClick={() => handleSync(c)}
                            >
                              {syncingId === c.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!sendOpen} onOpenChange={(o) => !o && setSendOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar para assinatura</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="person-sign-email">E-mail do signatário *</Label>
              <Input
                id="person-sign-email"
                type="email"
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="person-sign-name">Nome do signatário</Label>
              <Input
                id="person-sign-name"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value.toUpperCase())}
                className="uppercase"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="person-sign-page">Página da assinatura</Label>
              <Input
                id="person-sign-page"
                type="number"
                min={1}
                value={signaturePage}
                onChange={(e) => setSignaturePage(e.target.value)}
              />
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
