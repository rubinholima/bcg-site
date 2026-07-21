"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Shield, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/authFetch";
import {
  type PlatformRole,
  slugifyRoleInput,
  FALLBACK_ROLE_LABELS,
  formatRoleLabel,
} from "@/lib/platform-roles";

const EMPTY_FORM = {
  slug: "",
  label: "",
  canAccessDashboard: true,
  includeInMatrix: true,
};

export default function ConfiguracoesPerfisPage() {
  const router = useRouter();
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<PlatformRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editSlug, setEditSlug] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteSlug, setDeleteSlug] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/settings/roles?includeInactive=1");
      if (!res.ok) throw new Error("Erro ao carregar perfis");
      const data = (await res.json()) as { roles?: PlatformRole[] };
      setRows(data.roles ?? []);
    } catch (err) {
      setFeedback({
        type: "err",
        msg: err instanceof Error ? err.message : "Erro ao carregar perfis",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isSuperAdmin) {
      router.replace("/403");
      return;
    }
    void load();
  }, [authLoading, isSuperAdmin, router, load]);

  const editing = useMemo(
    () => (editSlug ? rows.find((r) => r.slug === editSlug) : null),
    [editSlug, rows],
  );

  const openCreate = () => {
    setEditSlug(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = (row: PlatformRole) => {
    setEditSlug(row.slug);
    setForm({
      slug: row.slug,
      label: row.label,
      canAccessDashboard: row.canAccessDashboard,
      includeInMatrix: row.includeInMatrix,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    const label = form.label.trim();
    if (!label) {
      setFeedback({ type: "err", msg: "Informe o nome do perfil." });
      return;
    }

    setSaving(true);
    try {
      if (editSlug) {
        const res = await authFetch(`/api/settings/roles/${encodeURIComponent(editSlug)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label,
            canAccessDashboard: form.canAccessDashboard,
            includeInMatrix: form.includeInMatrix,
          }),
        });
        if (!res.ok) throw new Error(await res.text().catch(() => "Erro ao salvar"));
      } else {
        const slug = slugifyRoleInput(form.slug || label);
        if (!slug || slug.length < 2) {
          throw new Error("Slug inválido — use letras minúsculas e underscore");
        }
        const res = await authFetch("/api/settings/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug,
            label,
            canAccessDashboard: form.canAccessDashboard,
            includeInMatrix: form.includeInMatrix,
          }),
        });
        if (!res.ok) throw new Error(await res.text().catch(() => "Erro ao criar perfil"));
      }
      setOpen(false);
      setFeedback({ type: "ok", msg: editSlug ? "Perfil atualizado." : "Perfil criado." });
      await load();
    } catch (err) {
      setFeedback({
        type: "err",
        msg: err instanceof Error ? err.message : "Erro ao salvar perfil",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteSlug) return;
    setSaving(true);
    try {
      const res = await authFetch(`/api/settings/roles/${encodeURIComponent(deleteSlug)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "Erro ao excluir"));
      setDeleteSlug(null);
      setFeedback({ type: "ok", msg: "Perfil excluído." });
      await load();
    } catch (err) {
      setFeedback({
        type: "err",
        msg: err instanceof Error ? err.message : "Erro ao excluir perfil",
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !isSuperAdmin) return null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Button type="button" variant="ghost" size="icon" className="shrink-0 mt-0.5" asChild>
            <Link href="/dashboard/configuracoes/modulos" aria-label="Voltar aos acessos">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Configurações
            </p>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Shield className="h-6 w-6 text-primary" />
              Perfis de acesso
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Cadastre os perfis (roles) dos clubes e empresas. Depois configure os módulos em{" "}
              <Link href="/dashboard/configuracoes/modulos" className="text-primary hover:underline">
                Acessos
              </Link>
              .
            </p>
          </div>
        </div>
        <Button type="button" className="min-h-[44px] shrink-0" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Novo perfil
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Slug</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Dashboard</TableHead>
                <TableHead>Matriz Acessos</TableHead>
                <TableHead>Usuários</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.slug} className={!row.isActive ? "opacity-60" : undefined}>
                  <TableCell className="font-mono text-xs">{row.slug}</TableCell>
                  <TableCell className="font-medium uppercase">{formatRoleLabel(row.label)}</TableCell>
                  <TableCell>{row.canAccessDashboard ? "Sim" : "Não"}</TableCell>
                  <TableCell>{row.includeInMatrix ? "Sim" : "Não"}</TableCell>
                  <TableCell>{row.userCount}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => openEdit(row)}>
                        Editar
                      </Button>
                      {!row.isSystem ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="text-destructive"
                          onClick={() => setDeleteSlug(row.slug)}
                          disabled={row.userCount > 0}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editSlug ? "Editar perfil" : "Novo perfil"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {!editSlug ? (
              <div className="space-y-1.5">
                <Label htmlFor="role-slug">Slug (identificador)</Label>
                <Input
                  id="role-slug"
                  className="font-mono text-foreground"
                  placeholder="ex.: coordenador_base"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Minúsculas e underscore. Se vazio, gera a partir do nome.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Slug</Label>
                <p className="rounded-md border border-input bg-muted/30 px-3 py-2 font-mono text-sm">
                  {editSlug}
                </p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="role-label">Nome exibido</Label>
              <Input
                id="role-label"
                className="text-foreground uppercase"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Acesso ao dashboard</p>
                <p className="text-xs text-muted-foreground">Pode fazer login no Cup360</p>
              </div>
              <Checkbox
                checked={form.canAccessDashboard}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, canAccessDashboard: v === true }))
                }
                disabled={editSlug === "super_admin" || editSlug === "user"}
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Aparece na matriz de Acessos</p>
                <p className="text-xs text-muted-foreground">Coluna em Configurações → Acessos</p>
              </div>
              <Checkbox
                checked={form.includeInMatrix}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, includeInMatrix: v === true }))
                }
                disabled={editSlug === "super_admin" || editSlug === "user"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={saving} onClick={() => void handleSave()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteSlug)} onOpenChange={(v) => !v && setDeleteSlug(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir perfil?</AlertDialogTitle>
            <AlertDialogDescription>
              O perfil{" "}
              <strong>{deleteSlug ? formatRoleLabel(FALLBACK_ROLE_LABELS[deleteSlug] ?? deleteSlug) : ""}</strong>{" "}
              será removido. Só é possível se nenhum usuário estiver vinculado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleDelete()}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FeedbackModal
        open={Boolean(feedback)}
        onOpenChange={() => setFeedback(null)}
        variant={feedback?.type === "ok" ? "success" : "error"}
        title={feedback?.type === "ok" ? "Pronto" : "Erro"}
        message={feedback?.msg ?? ""}
      />
    </div>
  );
}
