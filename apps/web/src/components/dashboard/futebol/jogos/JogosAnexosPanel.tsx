"use client";

import { useState } from "react";
import { ExternalLink, FileText, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelectField } from "@/components/ui/native-select";
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
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { getPublicImageUrl } from "@/lib/media-url";
import {
  COACH_ATTACHMENT_KIND_LABELS,
  encodeGameKey,
  MATCH_ATTACHMENT_KIND_LABELS,
  MATCH_ATTACHMENT_KIND_OPTIONS,
  type FutebolGameCoachReport,
  type FutebolMatchAttachment,
} from "@/lib/futebol-jogos.types";
import { JogosMediaPicker } from "./JogosMediaPicker";

interface Props {
  tenantId: string;
  gameKey: string;
  matchAttachments: FutebolMatchAttachment[];
  coachReport: FutebolGameCoachReport | null;
  onChanged: () => void;
}

function AttachmentLink({
  label,
  fileUrl,
  kind,
  kindLabels,
  onDelete,
}: {
  label: string;
  fileUrl: string;
  kind: string | null;
  kindLabels: Record<string, string>;
  onDelete?: () => void;
}) {
  return (
    <div className="flex min-h-[44px] flex-wrap items-center gap-2 rounded-lg border border-border/60 px-4 py-3 text-sm">
      <FileText className="h-4 w-4 text-[#C8102E]" />
      <a
        href={getPublicImageUrl(fileUrl)}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 flex-1 font-medium hover:text-primary"
      >
        {label}
      </a>
      {kind ? (
        <span className="rounded bg-secondary px-2 py-0.5 text-xs">{kindLabels[kind] ?? kind}</span>
      ) : null}
      <a href={getPublicImageUrl(fileUrl)} target="_blank" rel="noopener noreferrer" className="shrink-0">
        <ExternalLink className="h-4 w-4 text-muted-foreground" />
      </a>
      {onDelete ? (
        <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}

export function JogosAnexosPanel({
  tenantId,
  gameKey,
  matchAttachments,
  coachReport,
  onChanged,
}: Props) {
  const [openForm, setOpenForm] = useState(false);
  const [label, setLabel] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [kind, setKind] = useState("documento");
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });

  const handleSave = async () => {
    if (!fileUrl.trim()) {
      setFeedback({ open: true, title: "Arquivo obrigatório", message: "Envie ou selecione um arquivo." });
      return;
    }
    setSaving(true);
    try {
      await api.post(`/futebol-jogos/${encodeGameKey(gameKey)}/attachments?tenantId=${tenantId}`, {
        label: label.trim() || null,
        fileUrl: fileUrl.trim(),
        kind,
      });
      setOpenForm(false);
      setLabel("");
      setFileUrl("");
      setKind("documento");
      onChanged();
    } catch {
      setFeedback({ open: true, title: "Erro", message: "Não foi possível salvar o anexo." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      await api.delete(`/futebol-jogos/attachments/${deleteId}?tenantId=${tenantId}`);
      setDeleteId(null);
      onChanged();
    } catch {
      setFeedback({ open: true, title: "Erro", message: "Não foi possível apagar o anexo." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-medium">Documentos do jogo</h3>
          <Button type="button" size="sm" className="min-h-[44px]" onClick={() => setOpenForm((v) => !v)}>
            <Plus className="mr-2 h-4 w-4" />
            Anexar documento
          </Button>
        </div>

        {openForm ? (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">Novo anexo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Título (opcional)"
                className="text-foreground"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
              <div className="space-y-2">
                <Label>Tipo</Label>
                <NativeSelectField
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                  options={MATCH_ATTACHMENT_KIND_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                />
              </div>
              <JogosMediaPicker value={fileUrl} onChange={setFileUrl} />
              <div className="flex flex-wrap gap-2">
                <Button type="button" className="min-h-[44px]" disabled={saving} onClick={() => void handleSave()}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Salvar anexo
                </Button>
                <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => setOpenForm(false)}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {matchAttachments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum documento anexado ao jogo.</p>
        ) : (
          <ul className="space-y-2">
            {matchAttachments.map((att) => (
              <li key={att.id}>
                <AttachmentLink
                  label={att.label?.trim() || "Documento"}
                  fileUrl={att.fileUrl}
                  kind={att.kind}
                  kindLabels={MATCH_ATTACHMENT_KIND_LABELS}
                  onDelete={() => setDeleteId(att.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {coachReport?.attachments.length ? (
        <div>
          <h3 className="mb-3 font-medium">Anexos do relatório do treinador</h3>
          <ul className="space-y-2">
            {coachReport.attachments.map((att) => (
              <li key={att.id}>
                <AttachmentLink
                  label={att.label?.trim() || "Documento"}
                  fileUrl={att.fileUrl}
                  kind={att.kind}
                  kindLabels={COACH_ATTACHMENT_KIND_LABELS}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <AlertDialog open={deleteId != null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar anexo?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saving}
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((prev) => ({ ...prev, open }))}
        title={feedback.title}
        message={feedback.message}
        variant="error"
      />
    </div>
  );
}
