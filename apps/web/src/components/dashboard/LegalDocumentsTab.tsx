"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Trash2,
  Loader2,
  Upload,
  Send,
  RefreshCw,
  Download,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { api } from "@/lib/api";

const LEGAL_DOC_TYPES = [
  { value: "contrato_trabalho", label: "Contrato de trabalho" },
  { value: "contrato_imagem", label: "Contrato de imagem" },
  { value: "formacao", label: "Contrato de formação" },
  { value: "rescisao", label: "Termo de rescisão" },
  { value: "transferencia", label: "Termo de transferência" },
  { value: "aditivo", label: "Aditivo contratual" },
  { value: "procuração", label: "Procuração" },
  { value: "nda", label: "NDA / Confidencialidade" },
  { value: "outro", label: "Outro" },
] as const;

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  pending_signature: "Aguardando assinatura",
  signed: "Assinado",
  expired: "Expirado",
  cancelled: "Cancelado",
};

interface LegalDocumentEntry {
  id: string;
  type: string;
  name: string;
  status: string;
  signerEmail?: string | null;
  signerName?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  adobeAgreementId?: string | null;
  metadata?: { signingUrl?: string } | null;
  createdAt: string;
}

interface LegalDocumentsTabProps {
  playerId: string;
  playerName: string;
}

export function LegalDocumentsTab({ playerId, playerName }: LegalDocumentsTabProps) {
  const [docs, setDocs] = useState<LegalDocumentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [modalNovo, setModalNovo] = useState(false);
  const [sendModalDoc, setSendModalDoc] = useState<LegalDocumentEntry | null>(null);
  const [deleteModalDoc, setDeleteModalDoc] = useState<LegalDocumentEntry | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state (novo documento)
  const [formType, setFormType] = useState<string>("contrato_trabalho");
  const [formName, setFormName] = useState("");
  const [formSignerEmail, setFormSignerEmail] = useState("");
  const [formSignerName, setFormSignerName] = useState("");
  const [formValidFrom, setFormValidFrom] = useState("");
  const [formValidUntil, setFormValidUntil] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Form state (enviar para assinatura)
  const [sendEmail, setSendEmail] = useState("");
  const [sendName, setSendName] = useState("");
  const [sendPage, setSendPage] = useState("1");

  const loadDocs = async () => {
    try {
      setError(null);
      const { data } = await api.get<LegalDocumentEntry[]>(
        `/players/${playerId}/legal-documents`
      );
      setDocs(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar documentos");
      setDocs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocs();
  }, [playerId]);

  const resetForm = () => {
    setFormType("contrato_trabalho");
    setFormName("");
    setFormSignerEmail("");
    setFormSignerName("");
    setFormValidFrom("");
    setFormValidUntil("");
    setFormNotes("");
    setModalNovo(false);
    fileInputRef.current?.value && (fileInputRef.current.value = "");
  };

  const openSendModal = (doc: LegalDocumentEntry) => {
    setSendEmail(doc.signerEmail ?? "");
    setSendName(doc.signerName ?? "");
    setSendPage("1");
    setSendModalDoc(doc);
    setError(null);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !formType.trim() || !formName.trim()) {
      setError("Preencha o tipo e o nome do documento.");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Apenas arquivos PDF são aceitos.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", formType.trim());
      formData.append("name", formName.trim());
      if (formSignerEmail.trim()) formData.append("signerEmail", formSignerEmail.trim());
      if (formSignerName.trim()) formData.append("signerName", formSignerName.trim());
      if (formValidFrom) formData.append("validFrom", formValidFrom);
      if (formValidUntil) formData.append("validUntil", formValidUntil);
      if (formNotes.trim()) formData.append("notes", formNotes.trim());

      await api.postForm<LegalDocumentEntry>(
        `/players/${playerId}/legal-documents`,
        formData
      );
      await loadDocs();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar documento");
    } finally {
      setUploading(false);
    }
  };

  const handleSendForSignature = async () => {
    const doc = sendModalDoc;
    if (!doc) return;
    const email = sendEmail.trim();
    if (!email) {
      setError("E-mail do signatário é obrigatório.");
      return;
    }
    const signaturePage = sendPage ? parseInt(sendPage, 10) : 1;
    setActionId(doc.id);
    setError(null);
    try {
      await api.post(`/players/${playerId}/legal-documents/${doc.id}/send-for-signature`, {
        signerEmail: email,
        signerName: sendName.trim() || undefined,
        signaturePage: Number.isNaN(signaturePage) || signaturePage < 1 ? 1 : signaturePage,
      });
      await loadDocs();
      setSendModalDoc(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao enviar para assinatura";
      setError(typeof msg === "string" ? msg : String(msg));
    } finally {
      setActionId(null);
    }
  };

  const handleSync = async (doc: LegalDocumentEntry) => {
    setActionId(doc.id);
    setError(null);
    try {
      await api.post(`/players/${playerId}/legal-documents/${doc.id}/sync`);
      await loadDocs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao sincronizar");
    } finally {
      setActionId(null);
    }
  };

  const handleDownload = async (doc: LegalDocumentEntry) => {
    try {
      const url = `/api/players/${playerId}/legal-documents/${doc.id}/download`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Falha ao baixar");
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? (doc.name.endsWith(".pdf") ? doc.name : `${doc.name}.pdf`);
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao baixar");
    }
  };

  const executeDelete = async () => {
    const doc = deleteModalDoc;
    if (!doc) return;
    setActionId(doc.id);
    setError(null);
    try {
      await api.delete(`/players/${playerId}/legal-documents/${doc.id}`);
      await loadDocs();
      setDeleteModalDoc(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir");
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          Carregando documentos...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Controle Jurídico</CardTitle>
            <CardDescription>
              Contratos e documentos legais. Upload de PDF e envio para assinatura eletrônica.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="default"
            onClick={() => setModalNovo(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo documento
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <Dialog open={modalNovo} onOpenChange={(o) => !o && resetForm()}>
          <DialogContent className="overflow-hidden" showCloseButton={!uploading}>
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400" />
            <DialogHeader className="space-y-3 pt-1">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-600/10 ring-1 ring-emerald-500/30">
                  <Upload className="h-6 w-6 text-emerald-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-xl">Novo documento</DialogTitle>
                  <DialogDescription className="mt-2">
                    Upload de PDF. O documento ficará como rascunho até enviar para assinatura.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tipo do documento *</Label>
                  <Select value={formType} onValueChange={setFormType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEGAL_DOC_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nome do documento *</Label>
                  <Input
                    placeholder="Ex: Contrato 2025"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>E-mail do signatário</Label>
                  <Input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={formSignerEmail}
                    onChange={(e) => setFormSignerEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome do signatário</Label>
                  <Input
                    placeholder="Nome completo"
                    value={formSignerName}
                    onChange={(e) => setFormSignerName(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Válido de</Label>
                  <Input
                    type="date"
                    value={formValidFrom}
                    onChange={(e) => setFormValidFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Válido até</Label>
                  <Input
                    type="date"
                    value={formValidUntil}
                    onChange={(e) => setFormValidUntil(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Input
                  placeholder="Observações opcionais"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={handleUpload}
              />
            </div>
            <DialogFooter className="border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => resetForm()}
                disabled={uploading}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || !formType || !formName.trim()}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {uploading ? "Enviando..." : "Selecionar PDF e enviar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div>
          <h3 className="text-sm font-semibold mb-2">Documentos</h3>
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Nenhum documento. Clique em &quot;Novo documento&quot; para fazer upload de um PDF.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Tipo</th>
                    <th className="text-left p-3 font-medium">Nome</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Signatário</th>
                    <th className="text-right p-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((doc) => {
                    const typeLabel =
                      LEGAL_DOC_TYPES.find((t) => t.value === doc.type)?.label ?? doc.type;
                    const isLoading = actionId === doc.id;
                    const canSend =
                      doc.status === "draft" || doc.status === "cancelled";
                    return (
                      <tr key={doc.id} className="border-b last:border-0">
                        <td className="p-3">{typeLabel}</td>
                        <td className="p-3 font-medium">{doc.name}</td>
                        <td className="p-3">
                          <span
                            className={
                              doc.status === "signed"
                                ? "text-green-600"
                                : doc.status === "pending_signature"
                                  ? "text-amber-600"
                                  : "text-muted-foreground"
                            }
                          >
                            {STATUS_LABELS[doc.status] ?? doc.status}
                          </span>
                        </td>
                        <td className="p-3">
                          {doc.signerEmail ? (
                            <span className="text-muted-foreground">
                              {doc.signerName ? `${doc.signerName} ` : ""}
                              &lt;{doc.signerEmail}&gt;
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {doc.metadata?.signingUrl && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Abrir link de assinatura"
                                onClick={() =>
                                  window.open(doc.metadata!.signingUrl!, "_blank")
                                }
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Baixar PDF"
                              onClick={() => handleDownload(doc)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {canSend && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Enviar para assinatura (HelloSign)"
                                disabled={isLoading}
                                onClick={() => openSendModal(doc)}
                              >
                                {isLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            {doc.adobeAgreementId && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Sincronizar status do HelloSign"
                                disabled={isLoading}
                                onClick={() => handleSync(doc)}
                              >
                                <RefreshCw
                                  className={cn(
                                    "h-4 w-4",
                                    isLoading && "animate-spin"
                                  )}
                                />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Excluir"
                              className="text-destructive hover:text-destructive"
                              disabled={isLoading}
                              onClick={() => setDeleteModalDoc(doc)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Dialog open={!!sendModalDoc} onOpenChange={(o) => !o && setSendModalDoc(null)}>
          <DialogContent className="overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300" />
            <DialogHeader className="space-y-3 pt-1">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-600/10 ring-1 ring-amber-500/30">
                  <Send className="h-6 w-6 text-amber-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-xl">Enviar para assinatura</DialogTitle>
                  {sendModalDoc && (
                    <p className="mt-1.5 rounded-md bg-muted/50 px-2.5 py-1.5 text-sm font-medium text-foreground">
                      {sendModalDoc.name}
                    </p>
                  )}
                  <DialogDescription className="mt-2">
                    O signatário receberá um e-mail para assinar eletronicamente.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="send-email">E-mail do signatário *</Label>
                  <Input
                    id="send-email"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={sendEmail}
                    onChange={(e) => setSendEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="send-name">Nome</Label>
                  <Input
                    id="send-name"
                    placeholder="Nome completo"
                    value={sendName}
                    onChange={(e) => setSendName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="send-page">Página da assinatura</Label>
                  <Select value={sendPage} onValueChange={setSendPage}>
                    <SelectTrigger id="send-page">
                      <SelectValue placeholder="Página 1" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((p) => (
                        <SelectItem key={p} value={String(p)}>
                          Página {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter className="border-t border-border pt-4">
              <Button variant="outline" onClick={() => setSendModalDoc(null)}>
                Cancelar
              </Button>
              <Button
                onClick={() => void handleSendForSignature()}
                disabled={!sendEmail.trim() || actionId === sendModalDoc?.id}
              >
                {actionId === sendModalDoc?.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Enviar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteModalDoc} onOpenChange={(o) => !o && setDeleteModalDoc(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteModalDoc && (
                  <>
                    Excluir &quot;{deleteModalDoc.name}&quot;?
                    <br />
                    Esta ação não pode ser desfeita.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => void executeDelete()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
