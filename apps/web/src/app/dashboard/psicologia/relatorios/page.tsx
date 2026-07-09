"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ClipboardList,
  Eye,
  Loader2,
  Pencil,
  Printer,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FeedbackModal, type FeedbackVariant } from "@/components/ui/feedback-modal";
import {
  WeeklyPsychReportDocument,
  type WeeklyPsychReportData,
} from "@/components/dashboard/psychology/WeeklyPsychReportDocument";
import { WeeklyPsychReportEditLog } from "@/components/dashboard/psychology/WeeklyPsychReportEditLog";
import {
  WeeklyPsychReportEditForm,
  weeklyReportToFormState,
  type WeeklyPsychReportFormState,
} from "@/components/dashboard/psychology/WeeklyPsychReportEditForm";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatPersonFirstLastName } from "@/lib/consultation-display";
import { printWeeklyPsychReport } from "@/lib/print-weekly-psych-report";

function formatBrDate(d?: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return d;
  return `${day}/${m}/${y}`;
}

export default function PsicologiaRelatoriosPage() {
  const { canAccessModule, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<WeeklyPsychReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<WeeklyPsychReportData | null>(null);
  const [dialogMode, setDialogMode] = useState<"view" | "edit">("view");
  const [form, setForm] = useState<WeeklyPsychReportFormState | null>(null);
  const [editComment, setEditComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WeeklyPsychReportData | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: FeedbackVariant;
  }>({ open: false, title: "", message: "", variant: "info" });

  const canAccess = canAccessModule("saude");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<WeeklyPsychReportData[]>(
        "/psychology-sessions?sessionType=relatorio_semanal",
      );
      const list = Array.isArray(data) ? data : [];
      list.sort((a, b) => {
        const da = `${a.date ?? ""}${a.time ?? ""}`;
        const db = `${b.date ?? ""}${b.time ?? ""}`;
        return db.localeCompare(da);
      });
      setRows(list);
    } catch {
      setRows([]);
      setFeedback({
        open: true,
        title: "Erro",
        message: "Não foi possível carregar os relatórios.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !canAccess) return;
    void load();
  }, [authLoading, canAccess, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = [
        r.tenant?.name,
        r.categoriesLabel,
        r.psychologistName,
        r.estagiarioName,
        r.finalSummary,
        r.activities,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search]);

  const openReport = (report: WeeklyPsychReportData, mode: "view" | "edit" = "view") => {
    setSelected(report);
    setDialogMode(mode);
    setForm(weeklyReportToFormState(report));
    setEditComment("");
  };

  const closeDialog = () => {
    setSelected(null);
    setDialogMode("view");
    setForm(null);
    setEditComment("");
  };

  const handleSave = async () => {
    if (!selected?.id || !form) return;
    setSaving(true);
    try {
      const { data } = await api.patch<WeeklyPsychReportData>(
        `/psychology-sessions/${encodeURIComponent(selected.id)}`,
        {
          periodStart: form.periodStart?.trim() || undefined,
          periodEnd: form.periodEnd?.trim() || undefined,
          categoriesLabel: form.categoriesLabel?.trim() || undefined,
          activities: form.activities?.trim() || undefined,
          individualDemands: form.individualDemands?.trim() || undefined,
          weeklyDevelopment: form.weeklyDevelopment?.trim() || undefined,
          identifiedDemands: form.identifiedDemands?.trim() || undefined,
          nextWeekPlanning: form.nextWeekPlanning?.trim() || undefined,
          finalSummary: form.finalSummary?.trim() || undefined,
          generalNotes: form.generalNotes?.trim() || undefined,
          editComment: editComment.trim() || undefined,
        },
      );
      const updated = data ?? { ...selected, ...form, editLog: selected.editLog };
      setRows((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
      setSelected(updated);
      setForm(weeklyReportToFormState(updated));
      setEditComment("");
      setDialogMode("view");
      setFeedback({
        open: true,
        title: "Salvo",
        message: "Relatório atualizado. O histórico registrou quem editou e quando.",
        variant: "success",
      });
    } catch {
      setFeedback({
        open: true,
        title: "Erro",
        message: "Não foi possível salvar o relatório. Tente novamente.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    if (!selected) return;
    printWeeklyPsychReport(selected);
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    const id = deleteTarget.id;
    setDeletingId(id);
    try {
      await api.delete(`/psychology-sessions/${encodeURIComponent(id)}`);
      setRows((prev) => prev.filter((r) => r.id !== id));
      if (selected?.id === id) closeDialog();
      setDeleteTarget(null);
      setFeedback({
        open: true,
        title: "Apagado",
        message: "O relatório foi removido.",
        variant: "success",
      });
    } catch {
      setFeedback({
        open: true,
        title: "Erro",
        message: "Não foi possível apagar o relatório. Tente novamente.",
        variant: "error",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const deleteTargetLabel = deleteTarget
    ? [
        deleteTarget.categoriesLabel?.trim() || "Sem categoria",
        deleteTarget.periodStart || deleteTarget.periodEnd
          ? `${formatBrDate(deleteTarget.periodStart)} – ${formatBrDate(deleteTarget.periodEnd)}`
          : null,
        deleteTarget.tenant?.name,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  if (authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando…
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="space-y-4 p-4">
        <p className="text-sm text-muted-foreground">Sem acesso ao módulo de Saúde / Psicologia.</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard">Voltar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" className="-ml-2 mb-2 gap-1.5 px-2" asChild>
            <Link href="/dashboard/consultas">
              <ArrowLeft className="h-4 w-4" />
              Voltar às consultas
            </Link>
          </Button>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <ClipboardList className="h-6 w-6 text-violet-600 dark:text-violet-400" />
            Relatórios semanais
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Relatórios preenchidos na aba Relatório da agenda de atendimentos. Abra para visualizar, editar com histórico e imprimir em PDF.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Atualizar
          </Button>
          <Button size="sm" asChild>
            <Link href="/dashboard/consultas">Novo relatório</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Lista</CardTitle>
          <CardDescription>
            {filtered.length === 0
              ? "Nenhum relatório encontrado."
              : `${filtered.length} relatório(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="min-h-[44px] pl-9 text-foreground"
              placeholder="Buscar por clube, categoria, psicóloga…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando relatórios…
            </p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Ainda não há relatórios salvos. Preencha a aba Relatório em Consultas e clique em Salvar.
            </p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((r) => {
                const professional =
                  formatPersonFirstLastName(r.estagiarioName) ||
                  formatPersonFirstLastName(r.psychologistName);
                const category = r.categoriesLabel?.trim() || "Sem categoria";
                const period =
                  r.periodStart || r.periodEnd
                    ? `${formatBrDate(r.periodStart)} – ${formatBrDate(r.periodEnd)}`
                    : "Período não informado";
                const mainTitle = [category, period, professional || "—"].join(" · ");
                const secondaryLine = [
                  r.tenant?.name ?? "Clube",
                  `${formatBrDate(r.date)}${r.time ? ` ${r.time}` : ""}`,
                ].join(" · ");

                return (
                  <li key={r.id}>
                    <div className="flex w-full min-h-[56px] flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <button
                        type="button"
                        className="min-w-0 flex-1 space-y-0.5 text-left"
                        onClick={() => openReport(r, "view")}
                      >
                        <p className="font-semibold leading-snug text-foreground">{mainTitle}</p>
                        <p className="truncate text-xs text-muted-foreground">{secondaryLine}</p>
                      </button>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="min-h-[36px]"
                          onClick={() => openReport(r, "edit")}
                        >
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="min-h-[36px] text-violet-700 dark:text-violet-300"
                          onClick={() => openReport(r, "view")}
                        >
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          Ver
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                          title="Apagar relatório"
                          disabled={deletingId === r.id}
                          onClick={() => setDeleteTarget(r)}
                        >
                          {deletingId === r.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={selected != null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent
          showCloseButton
          className="!w-[min(56rem,calc(100vw-1.5rem))] !max-w-none max-h-[92vh] overflow-hidden p-0"
        >
          <div className="flex max-h-[92vh] flex-col">
            <DialogHeader className="shrink-0 border-b border-border/60 px-6 py-4">
              <DialogTitle>
                {dialogMode === "edit" ? "Editar relatório" : "Visualização do relatório"}
              </DialogTitle>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
              {selected && dialogMode === "view" ? (
                <div className="space-y-6">
                  <WeeklyPsychReportDocument report={selected} />
                  <WeeklyPsychReportEditLog entries={selected.editLog} />
                </div>
              ) : null}
              {selected && dialogMode === "edit" && form ? (
                <WeeklyPsychReportEditForm
                  value={form}
                  editComment={editComment}
                  onChange={setForm}
                  onEditCommentChange={setEditComment}
                />
              ) : null}
            </div>
            <DialogFooter className="shrink-0 gap-2 border-t border-border/60 px-6 py-4 sm:justify-end">
              {dialogMode === "view" ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="mr-auto text-destructive hover:text-destructive sm:mr-0"
                    onClick={() => selected && setDeleteTarget(selected)}
                    disabled={!selected?.id || deletingId === selected.id}
                  >
                    {deletingId === selected?.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Apagar
                  </Button>
                  <Button type="button" variant="outline" onClick={closeDialog}>
                    Fechar
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setDialogMode("edit")}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button type="button" onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir / PDF
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogMode("view");
                      setEditComment("");
                      if (selected) setForm(weeklyReportToFormState(selected));
                    }}
                    disabled={saving}
                  >
                    Cancelar
                  </Button>
                  <Button type="button" onClick={() => void handleSave()} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Salvar alterações
                  </Button>
                </>
              )}
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget != null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar relatório?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTargetLabel
                ? `Isso remove permanentemente: ${deleteTargetLabel}. Não dá para desfazer.`
                : "Isso remove o relatório permanentemente. Não dá para desfazer."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId != null}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              disabled={deletingId != null}
            >
              {deletingId ? "Apagando…" : "Apagar relatório"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((prev) => ({ ...prev, open }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.variant}
      />
    </div>
  );
}
