"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { FinancePrivateFileUpload } from "./finance-private-file-upload";
import { extractFinanceError } from "./finance-api-helpers";

type DocRow = {
  id: string;
  docType: string;
  fileName: string;
  status: string;
  uploadedAt: string;
  replacedByDocumentId: string | null;
};

const DOC_TYPES = [
  { value: "BOLETO", label: "Boleto" },
  { value: "NOTA_FISCAL", label: "Nota fiscal" },
  { value: "RECIBO", label: "Recibo" },
  { value: "COMPROVANTE", label: "Comprovante" },
  { value: "SUPPORTING_DOCUMENT", label: "Documento de suporte" },
  { value: "REPLACEMENT", label: "Substituição" },
  { value: "OTHER", label: "Outro" },
];

export function FinanceDocumentsPanel({
  tenantId,
  lancamentoId,
}: {
  tenantId: string;
  lancamentoId: string;
}) {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [docType, setDocType] = useState("BOLETO");
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);

  const load = useCallback(async () => {
    const { data } = await api.get<DocRow[]>(
      `/financeiro/lancamentos/${lancamentoId}/documentos?tenantId=${encodeURIComponent(tenantId)}`,
    );
    setDocs(Array.isArray(data) ? data : []);
  }, [tenantId, lancamentoId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function register(fileKey: string, fileName: string, mimeType?: string) {
    try {
      await api.post(`/financeiro/lancamentos/${lancamentoId}/documentos`, {
        tenantId,
        docType,
        fileKey,
        fileName,
        mimeType,
      });
      await load();
    } catch (e) {
      setFeedback({ title: "Erro", message: extractFinanceError(e) });
    }
  }

  async function download(id: string, fileName: string) {
    try {
      const base = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${base}/api/financeiro/documentos/${id}/download?tenantId=${encodeURIComponent(tenantId)}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Falha no download");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      setFeedback({ title: "Erro", message: "Não foi possível baixar o arquivo." });
    }
  }

  async function replaceBoleto(docId: string, file: File) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("tenantId", tenantId);
    try {
      await api.postForm(`/financeiro/documentos/${docId}/substituir`, fd);
      await load();
    } catch (e) {
      setFeedback({ title: "Erro", message: extractFinanceError(e) });
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Label>Tipo</Label>
          <NativeSelect value={docType} onChange={(e) => setDocType(e.target.value)}>
            {DOC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex items-end">
          <FinancePrivateFileUpload
            tenantId={tenantId}
            buttonLabel="Anexar"
            onUploaded={(f) => void register(f.fileKey, f.fileName, f.mimeType)}
            onError={(m) => setFeedback({ title: "Upload", message: m })}
          />
        </div>
      </div>
      <ul className="divide-y divide-border/50 rounded-md border border-border/50">
        {docs.length === 0 ? (
          <li className="px-3 py-2 text-sm text-muted-foreground">Nenhum documento.</li>
        ) : (
          docs.map((d) => (
            <li key={d.id} className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{d.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {d.docType}
                  {d.status !== "active" ? ` · ${d.status}` : ""} · {new Date(d.uploadedAt).toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => void download(d.id, d.fileName)}>
                  Baixar
                </Button>
                {d.docType === "BOLETO" && d.status === "active" ? (
                  <Input
                    type="file"
                    accept=".pdf,image/*"
                    className="max-w-[180px] text-xs"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void replaceBoleto(d.id, f);
                    }}
                  />
                ) : null}
              </div>
            </li>
          ))
        )}
      </ul>
      {feedback ? (
        <FeedbackModal open onOpenChange={() => setFeedback(null)} title={feedback.title} message={feedback.message} />
      ) : null}
    </div>
  );
}
