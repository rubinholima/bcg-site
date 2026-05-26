"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Eye, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { getPublicImageUrl } from "@/lib/media-url";
import { getPlayerDocumentTypeLabel } from "@/lib/player-registration-profile";

interface PendingRow {
  id: string;
  subjectType: string;
  submittedAt: string | null;
  submittedPayload: Record<string, unknown> | null;
  submittedDocuments: unknown;
  tenant: { id: string; name: string };
  player: { id: string; name: string } | null;
  employee: { id: string; name: string } | null;
}

interface RegistrationApprovalsPanelProps {
  tenantId: string;
}

function subjectLabel(row: PendingRow): string {
  if (row.subjectType === "player") return row.player?.name ?? "Atleta";
  return row.employee?.name ?? "Colaborador";
}

function subjectKind(row: PendingRow): string {
  return row.subjectType === "player" ? "Atleta" : "Colaborador";
}

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function payloadSummary(payload: Record<string, unknown> | null): string[] {
  if (!payload) return [];
  const lines: string[] = [];
  const add = (label: string, key: string) => {
    const v = payload[key];
    if (typeof v === "string" && v.trim()) lines.push(`${label}: ${v.trim()}`);
  };
  add("E-mail", "contactEmail");
  add("E-mail", "email");
  add("Telefone", "contactPhone");
  add("Telefone", "phone");
  add("CPF", "cpf");
  add("RG", "rg");
  add("PIS", "pisNumber");
  add("Título de eleitor", "voterTitle");
  add("CTPS (URL)", "ctpsUrl");
  add("PIX", "pixKey");
  add("Foto (URL)", "photoUrl");
  add("Nascimento", "birthDate");
  add("Exame admissional", "admissionMedicalExamDate");
  add("Link exame admissional", "admissionMedicalExamFileUrl");
  add("Exame demissional", "dismissalMedicalExamDate");
  add("Link exame demissional", "dismissalMedicalExamFileUrl");
  add("Observações", "notes");
  if (payload.hasMinorChildren === true) {
    const deps = payload.dependents;
    if (Array.isArray(deps) && deps.length > 0) {
      lines.push(`Filhos menores: ${deps.length}`);
    } else {
      lines.push("Filhos menores: sim");
    }
  }
  return lines;
}

function parseDocs(raw: unknown): Array<{ name: string; documentType: string; fileUrl: string }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((d) => d && typeof d === "object" && typeof (d as { fileUrl?: string }).fileUrl === "string")
    .map((d) => {
      const doc = d as { name?: string; documentType?: string; fileUrl: string };
      return {
        name: doc.name ?? "Documento",
        documentType: doc.documentType ?? "outro",
        fileUrl: doc.fileUrl,
      };
    });
}

export function RegistrationApprovalsPanel({ tenantId }: RegistrationApprovalsPanelProps) {
  const [rows, setRows] = useState<PendingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PendingRow | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectTarget, setRejectTarget] = useState<PendingRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
      const { data } = await api.get<PendingRow[]>(`/registration-invites/pending${q}`);
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (row: PendingRow) => {
    if (!confirm(`Aprovar cadastro de ${subjectLabel(row)}? Os dados serão gravados no sistema.`)) return;
    setActingId(row.id);
    try {
      await api.post(`/registration-invites/pending/${encodeURIComponent(row.id)}/approve`);
      await load();
      if (detail?.id === row.id) setDetail(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao aprovar");
    } finally {
      setActingId(null);
    }
  };

  const openReject = (row: PendingRow) => {
    setRejectTarget(row);
    setRejectReason("");
    setRejectOpen(true);
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setActingId(rejectTarget.id);
    try {
      await api.post(`/registration-invites/pending/${encodeURIComponent(rejectTarget.id)}/reject`, {
        reason: rejectReason.trim() || undefined,
      });
      setRejectOpen(false);
      setRejectTarget(null);
      await load();
      if (detail?.id === rejectTarget.id) setDetail(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao recusar");
    } finally {
      setActingId(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Cadastros pendentes</CardTitle>
          <CardDescription>
            Formulários enviados por atletas/colaboradores via link público — aprove para gravar no cadastro ou recuse para permitir correção.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
              <Loader2 className="h-5 w-5 animate-spin" />
              Carregando…
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhum cadastro aguardando aprovação.</p>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Enviado em</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap text-sm">{formatWhen(row.submittedAt)}</TableCell>
                      <TableCell>{row.tenant.name}</TableCell>
                      <TableCell>{subjectKind(row)}</TableCell>
                      <TableCell className="font-medium">{subjectLabel(row)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="min-h-9"
                            onClick={() => setDetail(row)}
                          >
                            <Eye className="mr-1 h-4 w-4" />
                            Ver
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="min-h-9"
                            disabled={actingId === row.id}
                            onClick={() => handleApprove(row)}
                          >
                            {actingId === row.id ? (
                              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="mr-1 h-4 w-4" />
                            )}
                            Aprovar
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="min-h-9"
                            disabled={actingId === row.id}
                            onClick={() => openReject(row)}
                          >
                            <X className="mr-1 h-4 w-4" />
                            Recusar
                          </Button>
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

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[min(90vh,100dvh-2rem)] overflow-y-auto w-[min(40rem,calc(100vw-1.5rem))]">
          {detail ? (
            <>
              <DialogHeader>
                <DialogTitle>{subjectLabel(detail)}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <p>
                  <span className="text-muted-foreground">Empresa:</span> {detail.tenant.name}
                </p>
                <p>
                  <span className="text-muted-foreground">Tipo:</span> {subjectKind(detail)}
                </p>
                <p>
                  <span className="text-muted-foreground">Enviado:</span> {formatWhen(detail.submittedAt)}
                </p>
                <div>
                  <p className="font-medium mb-2">Dados informados</p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    {payloadSummary(detail.submittedPayload).map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                    {payloadSummary(detail.submittedPayload).length === 0 ? (
                      <li>Ver payload completo no cadastro após aprovar.</li>
                    ) : null}
                  </ul>
                </div>
                <div>
                  <p className="font-medium mb-2">Documentos</p>
                  {parseDocs(detail.submittedDocuments).length === 0 ? (
                    <p className="text-muted-foreground">Nenhum documento anexado.</p>
                  ) : (
                    <ul className="space-y-2">
                      {parseDocs(detail.submittedDocuments).map((doc) => (
                        <li key={doc.fileUrl}>
                          <a
                            href={getPublicImageUrl(doc.fileUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-400 hover:underline"
                          >
                            {doc.name} ({getPlayerDocumentTypeLabel(doc.documentType)})
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <DialogFooter className="flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => setDetail(null)}>
                  Fechar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={actingId === detail.id}
                  onClick={() => openReject(detail)}
                >
                  Recusar
                </Button>
                <Button
                  type="button"
                  disabled={actingId === detail.id}
                  onClick={() => handleApprove(detail)}
                >
                  Aprovar cadastro
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="w-[min(28rem,calc(100vw-1.5rem))]">
          <DialogHeader>
            <DialogTitle>Recusar cadastro</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="reject-reason">Motivo (opcional — aparece para a pessoa no link)</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="Ex.: CPF ilegível no documento. Envie novamente com foto nítida."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRejectOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" disabled={actingId !== null} onClick={handleReject}>
              Confirmar recusa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
