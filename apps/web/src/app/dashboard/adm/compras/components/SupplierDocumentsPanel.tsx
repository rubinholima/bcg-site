"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { api } from "@/lib/api";
import { MediaPicker } from "@/components/dashboard/MediaPicker";
import { getPublicImageUrl } from "@/lib/media-url";
import { FeedbackModal } from "@/components/ui/feedback-modal";

const DOC_TYPES = [
  { value: "w9", label: "W-9" },
  { value: "w8", label: "W-8" },
  { value: "insurance", label: "Seguro" },
  { value: "contract", label: "Contrato" },
  { value: "bank", label: "Dados bancários / pagamento" },
  { value: "certificate", label: "Certificado" },
  { value: "other", label: "Outro" },
];

type DocRow = {
  id: string;
  label: string;
  docType?: string | null;
  mediaKey?: string | null;
  fileUrl?: string | null;
  createdAt: string;
};

export function SupplierDocumentsPanel({
  supplierId,
  canManage,
}: {
  supplierId: string;
  canManage: boolean;
}) {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [docType, setDocType] = useState("other");
  const [mediaKey, setMediaKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ open: false, title: "", message: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{ documents: DocRow[] }>(`/compras/suppliers/${supplierId}`);
      setDocs(Array.isArray(data.documents) ? data.documents : []);
    } catch {
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    void load();
  }, [load]);

  const docUrl = (d: DocRow) => {
    if (d.mediaKey) return getPublicImageUrl(d.mediaKey);
    return d.fileUrl ?? "#";
  };

  const addDoc = async () => {
    if (!label.trim() || !mediaKey) return;
    setSaving(true);
    try {
      await api.post(`/compras/suppliers/${supplierId}/documents`, {
        label: label.trim(),
        docType,
        mediaKey,
      });
      setLabel("");
      setMediaKey("");
      await load();
    } catch (err) {
      setFeedback({
        open: true,
        title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível anexar.",
      });
    } finally {
      setSaving(false);
    }
  };

  const removeDoc = async (documentId: string) => {
    setSaving(true);
    try {
      await api.delete(`/compras/suppliers/${supplierId}/documents/${documentId}`);
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <p className="flex justify-center py-4 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum documento anexado.</p>
      ) : (
        <ul className="space-y-2">
          {docs.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
            >
              <span>
                <span className="font-medium">{d.label}</span>
                {d.docType ? (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {DOC_TYPES.find((t) => t.value === d.docType)?.label ?? d.docType}
                  </span>
                ) : null}
              </span>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" asChild>
                  <a href={docUrl(d)} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1 h-4 w-4" />
                    Abrir
                  </a>
                </Button>
                {canManage ? (
                  <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={() => void removeDoc(d.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <div className="space-y-3 rounded-md border border-dashed border-border p-3">
          <p className="text-sm font-medium">Novo documento</p>
          <div className="grid gap-2">
            <Label>Descrição</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Tipo</Label>
            <NativeSelect value={docType} onChange={(e) => setDocType(e.target.value)}>
              {DOC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <MediaPicker
            sizeKey="section_bg"
            allowAllFolders
            value={mediaKey}
            onChange={(k) => setMediaKey(k ?? "")}
          />
          <Button type="button" size="sm" disabled={saving || !label.trim() || !mediaKey} onClick={() => void addDoc()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Anexar
          </Button>
        </div>
      ) : null}

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(o) => setFeedback((f) => ({ ...f, open: o }))}
        title={feedback.title}
        message={feedback.message}
      />
    </div>
  );
}
