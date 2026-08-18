"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Plus, Trash2 } from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NativeSelectField } from "@/components/ui/native-select";
import { MediaPicker } from "@/components/dashboard/MediaPicker";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import { getPublicImageUrl } from "@/lib/media-url";
import {
  SOCIAL_PEDAGOGY_DOCUMENT_TYPES,
  documentTypeLabel,
  type SocialPedagogyDocumentRow,
} from "@/lib/assistencia-social-types";

interface PlayerOption {
  id: string;
  name: string;
  jerseyNumber: number | null;
  category?: string | null;
}

interface Props {
  tenantId: string;
  players: PlayerOption[];
}

export function AssistenciaSocialDocumentsPanel({ tenantId, players }: Props) {
  const [rows, setRows] = useState<SocialPedagogyDocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPlayerId, setFilterPlayerId] = useState("");
  const [filterType, setFilterType] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [docType, setDocType] = useState("matricula");
  const [docName, setDocName] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [feedback, setFeedback] = useState({ open: false, title: "", message: "" });

  const load = useCallback(async () => {
    if (!tenantId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ tenantId });
      if (filterPlayerId) params.set("playerId", filterPlayerId);
      if (filterType) params.set("documentType", filterType);
      const { data } = await api.get<SocialPedagogyDocumentRow[]>(
        `/assistencia-social/documents?${params}`,
      );
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, filterPlayerId, filterType]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAdd = async () => {
    if (!playerId || !docName.trim() || !docUrl.trim()) return;
    setSaving(true);
    try {
      await api.post("/assistencia-social/documents", {
        playerId,
        documentType: docType,
        name: docName.trim(),
        fileUrl: docUrl.trim(),
      });
      setDialogOpen(false);
      setPlayerId("");
      setDocName("");
      setDocUrl("");
      await load();
    } catch (err) {
      setFeedback({
        open: true,
        title: "Erro",
        message: err instanceof Error ? err.message : "Erro ao salvar documento.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/assistencia-social/documents/${deleteId}`);
      setDeleteId(null);
      await load();
    } catch (err) {
      setFeedback({
        open: true,
        title: "Erro",
        message: err instanceof Error ? err.message : "Erro ao excluir.",
      });
    }
  };

  if (!tenantId) {
    return <p className="text-sm text-muted-foreground py-4">Selecione um clube/empresa.</p>;
  }

  const playerOptions = [...players].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap mb-4">
        <div className="grid gap-1 min-w-[200px] flex-1 sm:max-w-xs">
          <Label className="text-xs text-muted-foreground">Atleta</Label>
          <NativeSelectField
            value={filterPlayerId}
            onChange={(e) => setFilterPlayerId(e.target.value)}
            placeholder="Todos"
            options={[
              { value: "", label: "Todos" },
              ...playerOptions.map((p) => ({
                value: p.id,
                label: p.jerseyNumber != null ? `${p.jerseyNumber} · ${p.name}` : p.name,
              })),
            ]}
          />
        </div>
        <div className="grid gap-1 min-w-[180px] flex-1 sm:max-w-xs">
          <Label className="text-xs text-muted-foreground">Tipo</Label>
          <NativeSelectField
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            placeholder="Todos"
            options={[
              { value: "", label: "Todos" },
              ...SOCIAL_PEDAGOGY_DOCUMENT_TYPES.map((o) => ({ value: o.value, label: o.label })),
            ]}
          />
        </div>
        <Button type="button" onClick={() => setDialogOpen(true)} disabled={players.length === 0}>
          <Plus className="h-4 w-4 mr-1" />
          Anexar documento
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">Nenhum documento arquivado.</p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Atleta</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Recebido</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((d) => {
                const url = getPublicImageUrl(d.fileUrl) || d.fileUrl;
                const athleteName = d.player?.name ?? "—";
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{athleteName}</TableCell>
                    <TableCell>{documentTypeLabel(d.documentType)}</TableCell>
                    <TableCell>{d.name}</TableCell>
                    <TableCell>
                      {d.receivedAt ? formatDateDayMonYear(new Date(d.receivedAt)) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 flex-wrap">
                        {url ? (
                          <Button type="button" variant="ghost" size="sm" asChild>
                            <a href={url} target="_blank" rel="noopener noreferrer">
                              Abrir
                            </a>
                          </Button>
                        ) : null}
                        <Button type="button" variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/cadastros/jogadores/${d.playerId}/edit?tab=assistencia_social`}>
                            Ficha
                            <ExternalLink className="h-3.5 w-3.5 ml-1" />
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDeleteId(d.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Documento escolar</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-1">
              <Label>Atleta</Label>
              <NativeSelectField
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
                placeholder="Selecione…"
                options={playerOptions.map((p) => ({
                  value: p.id,
                  label: p.jerseyNumber != null ? `${p.jerseyNumber} · ${p.name}` : p.name,
                }))}
              />
            </div>
            <div className="grid gap-1">
              <Label>Tipo</Label>
              <NativeSelectField
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                options={SOCIAL_PEDAGOGY_DOCUMENT_TYPES.map((o) => ({
                  value: o.value,
                  label: o.label,
                }))}
              />
            </div>
            <div className="grid gap-1">
              <Label>Nome</Label>
              <Input value={docName} onChange={(e) => setDocName(e.target.value)} />
            </div>
            <MediaPicker
              sizeKey="rh_documentos"
              allowAllFolders
              value={docUrl}
              onChange={setDocUrl}
              placeholder="PDF ou imagem"
            />
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleAdd} disabled={saving || !playerId || !docName.trim() || !docUrl.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
      />
    </>
  );
}
