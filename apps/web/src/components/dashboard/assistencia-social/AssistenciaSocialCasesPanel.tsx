"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Printer, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { NativeSelectField } from "@/components/ui/native-select";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import { getCategoryLabel } from "@/lib/fixture-categories";
import { printSchoolNotification, type NotificationReport } from "@/lib/assistencia-social-print";
import {
  SOCIAL_PEDAGOGY_TRIGGER_OPTIONS,
  SOCIAL_PEDAGOGY_STATUS_OPTIONS,
  statusLabel,
  triggerLabel,
  type SocialPedagogyCaseRow,
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

export function AssistenciaSocialCasesPanel({ tenantId, players }: Props) {
  const [rows, setRows] = useState<SocialPedagogyCaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [playerId, setPlayerId] = useState("");
  const [triggerType, setTriggerType] = useState("manual");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editCase, setEditCase] = useState<SocialPedagogyCaseRow | null>(null);
  const [notificationText, setNotificationText] = useState("");
  const [notificationChannel, setNotificationChannel] = useState("");
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
      if (statusFilter) params.set("status", statusFilter);
      const { data } = await api.get<SocialPedagogyCaseRow[]>(`/assistencia-social/cases?${params}`);
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!playerId) {
      setFeedback({ open: true, title: "Atenção", message: "Selecione o atleta." });
      return;
    }
    setSaving(true);
    try {
      await api.post("/assistencia-social/cases", {
        tenantId,
        playerId,
        triggerType,
        periodStart: periodStart || undefined,
        periodEnd: periodEnd || undefined,
        notes: notes.trim() || undefined,
      });
      setDialogOpen(false);
      setPlayerId("");
      setNotes("");
      await load();
      setFeedback({ open: true, title: "Caso aberto", message: "Fluxo iniciado com validação e agenda." });
    } catch (err) {
      setFeedback({
        open: true,
        title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível abrir o caso.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAdvance = async (id: string) => {
    try {
      await api.post(`/assistencia-social/cases/${id}/advance`);
      await load();
    } catch (err) {
      setFeedback({
        open: true,
        title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível avançar.",
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!editCase) return;
    setSaving(true);
    try {
      await api.patch(`/assistencia-social/cases/${editCase.id}`, {
        schoolNotificationText: notificationText,
        schoolNotificationChannel: notificationChannel || undefined,
        schoolNotificationSentAt: notificationChannel ? new Date().toISOString() : undefined,
        refreshAgenda: true,
        refreshContactValidation: true,
      });
      setEditCase(null);
      await load();
    } catch (err) {
      setFeedback({
        open: true,
        title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível salvar.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = async (caseId: string) => {
    try {
      const { data } = await api.get<NotificationReport>(`/assistencia-social/reports/notification/${caseId}`);
      printSchoolNotification(data);
    } catch (err) {
      setFeedback({
        open: true,
        title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível imprimir.",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/assistencia-social/cases/${deleteId}`);
      setDeleteId(null);
      await load();
    } catch (err) {
      setFeedback({
        open: true,
        title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível excluir.",
      });
    }
  };

  if (!tenantId) {
    return <p className="text-sm text-muted-foreground py-4">Selecione um clube/empresa.</p>;
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-4">
        <div className="grid gap-1 min-w-[200px]">
          <Label className="text-xs text-muted-foreground">Filtrar status</Label>
          <NativeSelectField
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            placeholder="Todos"
            options={[{ value: "", label: "Todos" }, ...SOCIAL_PEDAGOGY_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))]}
          />
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo caso
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Atleta</TableHead>
                <TableHead>Gatilho</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pendências</TableHead>
                <TableHead>Atualizado</TableHead>
                <TableHead className="w-[160px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    Nenhum caso registrado.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const issues = row.contactValidation?.issues ?? [];
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        {row.player?.name ?? "—"}
                        {row.player?.jerseyNumber != null ? ` #${row.player.jerseyNumber}` : ""}
                        {row.player?.category ? ` · ${getCategoryLabel(row.player.category, "pt")}` : ""}
                      </TableCell>
                      <TableCell>{triggerLabel(row.triggerType)}</TableCell>
                      <TableCell>{statusLabel(row.status)}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={issues.join("; ")}>
                        {issues.length === 0 ? "—" : issues.join("; ")}
                      </TableCell>
                      <TableCell>{formatDateDayMonYear(new Date(row.updatedAt))}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePrint(row.id)}>
                            <Printer className="h-4 w-4" />
                          </Button>
                          {row.status !== "concluido" ? (
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleAdvance(row.id)}>
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditCase(row);
                              setNotificationText(row.schoolNotificationText ?? "");
                              setNotificationChannel(row.schoolNotificationChannel ?? "");
                            }}
                          >
                            Editar
                          </Button>
                          {row.player?.id ? (
                            <Button type="button" variant="ghost" size="sm" asChild>
                              <Link href={`/dashboard/cadastros/jogadores/${row.player.id}/edit?tab=assistencia_social`}>
                                Ficha
                              </Link>
                            </Button>
                          ) : null}
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(row.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo caso — gestão escolar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-1">
              <Label>Atleta</Label>
              <NativeSelectField
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
                placeholder="Selecione…"
                options={players.map((p) => ({
                  value: p.id,
                  label: `${p.name}${p.jerseyNumber != null ? ` #${p.jerseyNumber}` : ""}`,
                }))}
              />
            </div>
            <div className="grid gap-1">
              <Label>Gatilho</Label>
              <NativeSelectField
                value={triggerType}
                onChange={(e) => setTriggerType(e.target.value)}
                options={SOCIAL_PEDAGOGY_TRIGGER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1">
                <Label>Período — início</Label>
                <Input type="date" className="text-foreground" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label>Período — fim</Label>
                <Input type="date" className="text-foreground" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-1">
              <Label>Observações</Label>
              <textarea
                className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Abrir caso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editCase} onOpenChange={(open) => !open && setEditCase(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Caso — {editCase?.player?.name ?? "Atleta"}</DialogTitle>
          </DialogHeader>
          {editCase ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {statusLabel(editCase.status)} · {triggerLabel(editCase.triggerType)}
              </p>
              {editCase.contactValidation && !editCase.contactValidation.ok ? (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                  Pendências: {editCase.contactValidation.issues.join("; ")}
                </div>
              ) : null}
              <div className="grid gap-1">
                <Label>Texto para a escola</Label>
                <textarea
                  className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  value={notificationText}
                  onChange={(e) => setNotificationText(e.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <Label>Canal de envio</Label>
                <Input
                  placeholder="E-mail, WhatsApp, protocolo…"
                  value={notificationChannel}
                  onChange={(e) => setNotificationChannel(e.target.value)}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter className="gap-2">
            {editCase ? (
              <Button type="button" variant="secondary" onClick={() => handlePrint(editCase.id)}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
            ) : null}
            <Button type="button" onClick={handleSaveEdit} disabled={saving}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir caso</AlertDialogTitle>
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
