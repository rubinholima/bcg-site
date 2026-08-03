"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
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
import {
  invalidateAgendaConfigCache,
  type AgendaAreaRow,
  type AgendaEventCategoryRow,
} from "@/lib/agenda-config";
import { DashboardDeptHeader } from "@/components/dashboard/DashboardDeptHeader";
import { Settings2 } from "lucide-react";

type Tab = "areas" | "categories";

export function AgendaConfigAdmin() {
  const router = useRouter();
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("categories");
  const [areas, setAreas] = useState<AgendaAreaRow[]>([]);
  const [categories, setCategories] = useState<AgendaEventCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: Tab; id: string } | null>(null);
  const [feedback, setFeedback] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, c] = await Promise.all([
        api.get<AgendaAreaRow[]>("/agenda-config/admin/areas"),
        api.get<AgendaEventCategoryRow[]>("/agenda-config/admin/categories"),
      ]);
      setAreas(Array.isArray(a.data) ? a.data : []);
      setCategories(Array.isArray(c.data) ? c.data : []);
    } catch (err) {
      setFeedback({
        open: true,
        title: "Erro ao carregar",
        message: err instanceof Error ? err.message : "Falha ao carregar cadastros",
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
  }, [authLoading, isSuperAdmin, load, router]);

  const patchArea = async (id: string, patch: Partial<AgendaAreaRow>) => {
    setSaving(true);
    try {
      await api.patch(`/agenda-config/admin/areas/${id}`, patch);
      invalidateAgendaConfigCache();
      await load();
    } catch (err) {
      setFeedback({
        open: true,
        title: "Não foi possível salvar",
        message: err instanceof Error ? err.message : "Erro ao salvar área",
      });
    } finally {
      setSaving(false);
    }
  };

  const patchCategory = async (id: string, patch: Partial<AgendaEventCategoryRow>) => {
    setSaving(true);
    try {
      await api.patch(`/agenda-config/admin/categories/${id}`, patch);
      invalidateAgendaConfigCache();
      await load();
    } catch (err) {
      setFeedback({
        open: true,
        title: "Não foi possível salvar",
        message: err instanceof Error ? err.message : "Erro ao salvar categoria",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await api.delete(`/agenda-config/admin/${deleteTarget.kind}/${deleteTarget.id}`);
      invalidateAgendaConfigCache();
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setFeedback({
        open: true,
        title: "Não foi possível excluir",
        message: err instanceof Error ? err.message : "Erro ao excluir",
      });
    } finally {
      setSaving(false);
    }
  };

  const addCategory = async () => {
    setSaving(true);
    try {
      await api.post("/agenda-config/admin/categories", {
        slug: `categoria-${Date.now()}`,
        label: "Nova categoria",
        bgColor: "#52525b",
        textColor: "#ffffff",
        borderColor: "#a1a1aa",
      });
      invalidateAgendaConfigCache();
      await load();
    } catch (err) {
      setFeedback({
        open: true,
        title: "Não foi possível criar",
        message: err instanceof Error ? err.message : "Erro ao criar categoria",
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardDeptHeader
        section="Agenda"
        sectionIcon={Settings2}
        title="Categorias e áreas"
        description="Cores fixas por tipo de compromisso e visibilidade das áreas na agenda geral. Somente super admin."
        toolbar={
          <Button variant="outline" size="sm" className="min-h-[40px]" asChild>
            <Link href="/dashboard/agenda">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Voltar à agenda
            </Link>
          </Button>
        }
      />

      <div className="inline-flex rounded-xl border border-border/80 bg-muted/30 p-1">
        <button
          type="button"
          onClick={() => setTab("categories")}
          className={`min-h-[40px] rounded-lg px-4 text-sm font-semibold ${
            tab === "categories" ? "bg-background shadow-sm" : "text-muted-foreground"
          }`}
        >
          Categorias (cores)
        </button>
        <button
          type="button"
          onClick={() => setTab("areas")}
          className={`min-h-[40px] rounded-lg px-4 text-sm font-semibold ${
            tab === "areas" ? "bg-background shadow-sm" : "text-muted-foreground"
          }`}
        >
          Áreas
        </button>
      </div>

      {tab === "categories" ? (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Categorias de evento</CardTitle>
              <CardDescription>
                Cor por <strong>tipo de compromisso</strong> (aniversário, jogo em casa, treino…). A
                categoria do elenco (Sub-17 etc.) não muda a cor — ela aparece no texto do calendário.
                Somente super admin.
              </CardDescription>
            </div>
            <Button type="button" size="sm" className="min-h-[44px]" disabled={saving} onClick={() => void addCategory()}>
              <Plus className="mr-1 h-4 w-4" />
              Nova categoria
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="grid gap-3 rounded-xl border border-border/70 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_repeat(3,minmax(0,120px))_auto]"
              >
                <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                  <Label>Nome</Label>
                  <Input
                    value={cat.label}
                    disabled={saving}
                    onChange={(e) =>
                      setCategories((prev) =>
                        prev.map((c) => (c.id === cat.id ? { ...c, label: e.target.value } : c)),
                      )
                    }
                    onBlur={() => void patchCategory(cat.id, { label: cat.label })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Slug: {cat.slug}
                    {cat.eventType ? ` · tipo ${cat.eventType}` : ""}
                    {cat.matchSide ? ` · ${cat.matchSide}` : ""}
                    {cat.areaSlug ? ` · área ${cat.areaSlug}` : ""}
                  </p>
                </div>
                {(["bgColor", "textColor", "borderColor"] as const).map((field) => (
                  <div key={field} className="space-y-2">
                    <Label>
                      {field === "bgColor" ? "Fundo" : field === "textColor" ? "Texto" : "Borda"}
                    </Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={cat[field]}
                        disabled={saving}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCategories((prev) =>
                            prev.map((c) => (c.id === cat.id ? { ...c, [field]: v } : c)),
                          );
                        }}
                        onBlur={() => void patchCategory(cat.id, { [field]: cat[field] })}
                        className="h-11 w-11 cursor-pointer rounded border border-border bg-transparent"
                        aria-label={`Cor ${field}`}
                      />
                      <Input
                        value={cat[field]}
                        disabled={saving}
                        className="min-h-[44px] font-mono text-xs"
                        onChange={(e) =>
                          setCategories((prev) =>
                            prev.map((c) => (c.id === cat.id ? { ...c, [field]: e.target.value } : c)),
                          )
                        }
                        onBlur={() => void patchCategory(cat.id, { [field]: cat[field] })}
                      />
                    </div>
                  </div>
                ))}
                <div className="flex items-end justify-end">
                  <span
                    className="rounded-md border px-3 py-1.5 text-sm font-semibold"
                    style={{
                      backgroundColor: cat.bgColor,
                      color: cat.textColor,
                      borderColor: cat.borderColor,
                    }}
                  >
                    Prévia
                  </span>
                  {!cat.isSystem ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="ml-2"
                      aria-label="Excluir"
                      onClick={() => setDeleteTarget({ kind: "categories", id: cat.id })}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Áreas da agenda</CardTitle>
            <CardDescription>
              Futebol, Psicologia, Boston City Hall, etc. Público = visível para todos com acesso ao hub;
              privado exige o módulo indicado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {areas.map((area) => (
              <div key={area.id} className="grid gap-3 rounded-xl border border-border/70 p-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={area.label}
                    disabled={saving}
                    onChange={(e) =>
                      setAreas((prev) =>
                        prev.map((a) => (a.id === area.id ? { ...a, label: e.target.value } : a)),
                      )
                    }
                    onBlur={() => void patchArea(area.id, { label: area.label })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Visibilidade</Label>
                  <NativeSelect
                    value={area.isPublic ? "public" : "restricted"}
                    disabled={saving}
                    onChange={(e) => {
                      const isPublic = e.target.value === "public";
                      setAreas((prev) =>
                        prev.map((a) => (a.id === area.id ? { ...a, isPublic } : a)),
                      );
                      void patchArea(area.id, { isPublic });
                    }}
                  >
                    <option value="restricted">Somente quem tem acesso ao módulo</option>
                    <option value="public">Público (todos no hub da agenda)</option>
                  </NativeSelect>
                </div>
                <div className="space-y-2">
                  <Label>Módulo necessário</Label>
                  <Input
                    value={area.moduleSlug ?? ""}
                    placeholder="Ex.: psicologia, futebol_logistica"
                    disabled={saving || area.isPublic}
                    onChange={(e) =>
                      setAreas((prev) =>
                        prev.map((a) =>
                          a.id === area.id ? { ...a, moduleSlug: e.target.value || null } : a,
                        ),
                      )
                    }
                    onBlur={() => void patchArea(area.id, { moduleSlug: area.moduleSlug })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fonte de dados</Label>
                  <Input value={area.dataSource} disabled className="bg-muted/40" />
                  <p className="text-xs text-muted-foreground">Slug: {area.slug}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={saving} onClick={() => void handleDelete()}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        variant="error"
        title={feedback.title}
        message={feedback.message}
      />
    </div>
  );
}
