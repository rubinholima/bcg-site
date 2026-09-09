"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Plus, Trash2 } from "lucide-react";
import { authFetch } from "@/lib/authFetch";
import type { AnnouncementType, MasterAnnouncement } from "@/lib/master-ops-types";
import { formatDateTimeDayMonYear } from "@/lib/format-date";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
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
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<AnnouncementType, string> = {
  info: "Informativo",
  warning: "Aviso",
  success: "Sucesso",
  danger: "Crítico",
};

export function MasterAnnouncementsPanel() {
  const [items, setItems] = useState<MasterAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ title: string; message: string; variant?: "success" | "error" } | null>(null);
  const [users, setUsers] = useState<Array<{ id: string; name: string | null; username: string }>>([]);
  const [form, setForm] = useState({
    title: "",
    message: "",
    type: "info" as AnnouncementType,
    targetMode: "all" as "all" | "user",
    targetUserId: "",
    dismissible: true,
    startsAt: "",
    expiresAt: "",
  });

  const load = useCallback(async () => {
    const res = await authFetch("/api/master/announcements");
    if (res.ok) setItems((await res.json()) as MasterAnnouncement[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    void authFetch("/api/users").then(async (res) => {
      if (!res.ok) return;
      const list = (await res.json()) as Array<{ id: string; name: string | null; username: string }>;
      if (Array.isArray(list)) setUsers(list);
    });
  }, [load]);

  const resetForm = () => {
    setForm({
      title: "",
      message: "",
      type: "info",
      targetMode: "all",
      targetUserId: "",
      dismissible: true,
      startsAt: "",
      expiresAt: "",
    });
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      setFeedback({ title: "Campos obrigatórios", message: "Informe título e mensagem.", variant: "error" });
      return;
    }
    if (form.targetMode === "user" && !form.targetUserId) {
      setFeedback({ title: "Destinatário", message: "Selecione o usuário alvo.", variant: "error" });
      return;
    }
    const res = await authFetch("/api/master/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title.trim(),
        message: form.message.trim(),
        type: form.type,
        targetMode: form.targetMode,
        targetUserId: form.targetMode === "user" ? form.targetUserId : undefined,
        dismissible: form.dismissible,
        startsAt: form.startsAt || undefined,
        expiresAt: form.expiresAt || undefined,
      }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { message?: string } | null;
      setFeedback({
        title: "Erro ao enviar",
        message: err?.message ?? "Não foi possível publicar o aviso.",
        variant: "error",
      });
      return;
    }
    setDialogOpen(false);
    resetForm();
    setFeedback({ title: "Aviso publicado", message: "O aviso foi enviado aos destinatários.", variant: "success" });
    void load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await authFetch(`/api/master/announcements/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    if (!res.ok) {
      setFeedback({ title: "Erro", message: "Não foi possível remover o aviso.", variant: "error" });
      return;
    }
    void load();
  };

  return (
    <>
      <Card className="min-w-0 rounded-xl shadow-md overflow-hidden border-amber-500/20 bg-amber-500/5">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-500" />
            Avisos Master
          </CardTitle>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Novo aviso
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando avisos…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum aviso publicado.</p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "rounded-xl border p-3 sm:p-4",
                  item.active ? "border-border/70 bg-background/40" : "border-border/40 opacity-70",
                )}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{item.title}</p>
                      <span className="text-xs rounded-full px-2 py-0.5 bg-muted">{TYPE_LABEL[item.type]}</span>
                      {!item.active ? <span className="text-xs text-muted-foreground">Inativo</span> : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{item.message}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {item.targetMode === "all"
                        ? "Todos os usuários"
                        : `@${item.targetUser?.username ?? "usuário"}`}
                      {" · "}
                      {item.dismissible ? "Dispensável" : "Fixo"}
                      {" · "}
                      {item.receiptsCount} entrega(s)
                      {" · "}
                      {formatDateTimeDayMonYear(item.createdAt)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive hover:text-destructive"
                    aria-label="Excluir aviso"
                    onClick={() => setDeleteId(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo aviso in-app</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Título"
            />
            <Textarea
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              placeholder="Mensagem"
              rows={4}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <NativeSelect
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AnnouncementType }))}
              >
                <option value="info">Informativo</option>
                <option value="warning">Aviso</option>
                <option value="success">Sucesso</option>
                <option value="danger">Crítico</option>
              </NativeSelect>
              <NativeSelect
                value={form.targetMode}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    targetMode: e.target.value as "all" | "user",
                    targetUserId: e.target.value === "all" ? "" : f.targetUserId,
                  }))
                }
              >
                <option value="all">Todos os usuários</option>
                <option value="user">Usuário específico</option>
              </NativeSelect>
            </div>
            {form.targetMode === "user" ? (
              <NativeSelect
                value={form.targetUserId}
                onChange={(e) => setForm((f) => ({ ...f, targetUserId: e.target.value }))}
              >
                <option value="">Selecione o usuário…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.username} (@{u.username})
                  </option>
                ))}
              </NativeSelect>
            ) : null}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                type="datetime-local"
                className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                value={form.startsAt}
                onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                placeholder="Início"
              />
              <Input
                type="datetime-local"
                className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                value={form.expiresAt}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                placeholder="Expiração"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.dismissible}
                onChange={(e) => setForm((f) => ({ ...f, dismissible: e.target.checked }))}
              />
              Permitir dispensar o aviso
            </label>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => void handleCreate()}>Publicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir aviso?</AlertDialogTitle>
            <AlertDialogDescription>
              O aviso será removido para todos os destinatários.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FeedbackModal
        open={!!feedback}
        onOpenChange={(open) => !open && setFeedback(null)}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
        variant={feedback?.variant ?? "info"}
      />
    </>
  );
}
