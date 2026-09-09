"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Megaphone, Plus, Trash2 } from "lucide-react";
import { authFetch } from "@/lib/authFetch";
import type { AnnouncementType, MasterAnnouncement } from "@/lib/master-ops-types";
import { formatDateTimeDayMonYear } from "@/lib/format-date";
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
import { cup360 } from "@/lib/cup360-design-tokens";
import { OpsSection } from "./master-ops-ui";

const TYPE_LABEL: Record<AnnouncementType, string> = {
  info: "Informativo",
  warning: "Aviso",
  success: "Sucesso",
  danger: "Crítico",
};

const TYPE_BADGE: Record<AnnouncementType, string> = {
  info: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  danger: "bg-red-500/10 text-red-600 dark:text-red-400",
};

const DEPLOY_PRESET = {
  title: "Publicação em andamento",
  message: "Uma nova versão será publicada em alguns minutos.",
  type: "warning" as AnnouncementType,
};

const EMPTY_FORM = {
  title: "",
  message: "",
  type: "info" as AnnouncementType,
  targetMode: "all" as "all" | "user",
  targetUserId: "",
  dismissible: true,
  startsAt: "",
  expiresAt: "",
};

export function MasterAnnouncementsPanel() {
  const [items, setItems] = useState<MasterAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ title: string; message: string; variant?: "success" | "error" } | null>(null);
  const [users, setUsers] = useState<Array<{ id: string; name: string | null; username: string }>>([]);
  const [form, setForm] = useState(EMPTY_FORM);

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

  const openDialog = (preset?: typeof DEPLOY_PRESET) => {
    if (preset) {
      setForm({ ...EMPTY_FORM, ...preset });
    } else {
      setForm(EMPTY_FORM);
    }
    setDialogOpen(true);
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
    setForm(EMPTY_FORM);
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

  const activeCount = items.filter((i) => i.active).length;

  return (
    <>
      <OpsSection
        title="Comunicação Master"
        description="Avisos in-app para usuários da plataforma — entregas e leitura em tempo real"
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => openDialog(DEPLOY_PRESET)}
            >
              <Megaphone className="mr-1.5 h-3.5 w-3.5" />
              Aviso de deploy
            </Button>
            <Button type="button" size="sm" className="h-8" onClick={() => openDialog()}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Novo aviso
            </Button>
          </div>
        }
      >
        {loading ? (
          <p className={cup360.type.caption}>Carregando avisos…</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border/70 bg-muted/10 p-5">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Nenhum aviso publicado</p>
              <p className={cup360.type.caption}>
                Use &quot;Aviso de deploy&quot; para alertar sobre uma nova versão.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className={cup360.type.caption}>
              {activeCount} ativo(s) · {items.length} total · entregas = usuários que receberam o aviso
            </p>
            <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
              {items.map((item) => (
                <article
                  key={item.id}
                  className={cn(
                    "rounded-lg border p-4",
                    item.active ? "border-border/70 bg-muted/10" : "border-border/40 opacity-75",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-sm">{item.title}</h3>
                        <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide", TYPE_BADGE[item.type])}>
                          {TYPE_LABEL[item.type]}
                        </span>
                        {!item.active ? (
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Inativo</span>
                        ) : null}
                      </div>
                      <p className="mt-1.5 text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                        {item.message}
                      </p>
                      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
                        <div>
                          <dt className="uppercase tracking-wide text-[10px]">Destino</dt>
                          <dd className="text-foreground">
                            {item.targetMode === "all"
                              ? "Todos"
                              : `@${item.targetUser?.username ?? "usuário"}`}
                          </dd>
                        </div>
                        <div>
                          <dt className="uppercase tracking-wide text-[10px]">Entregas</dt>
                          <dd className="tabular-nums text-foreground">{item.receiptsCount}</dd>
                        </div>
                        <div>
                          <dt className="uppercase tracking-wide text-[10px]">Dispensável</dt>
                          <dd className="text-foreground">{item.dismissible ? "Sim" : "Não"}</dd>
                        </div>
                        <div>
                          <dt className="uppercase tracking-wide text-[10px]">Publicado</dt>
                          <dd>{formatDateTimeDayMonYear(item.createdAt)}</dd>
                        </div>
                      </dl>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label="Excluir aviso"
                      onClick={() => setDeleteId(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </OpsSection>

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
              />
              <Input
                type="datetime-local"
                className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                value={form.expiresAt}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
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
