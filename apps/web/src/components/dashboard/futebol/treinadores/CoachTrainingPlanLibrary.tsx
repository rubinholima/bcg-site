"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FeedbackModal } from "@/components/ui/feedback-modal";
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
import { api } from "@/lib/api";
import type { CoachTrainingPlanTemplate } from "@/lib/treinadores-types";
import { TreinadoresMediaPicker } from "./TreinadoresMediaPicker";

interface Props {
  tenantId: string;
  category?: string;
  onApplyTemplate: (template: CoachTrainingPlanTemplate) => void;
}

export function CoachTrainingPlanLibrary({ tenantId, category, onApplyTemplate }: Props) {
  const [templates, setTemplates] = useState<CoachTrainingPlanTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });

  const load = useCallback(() => {
    if (!tenantId) return;
    setLoading(true);
    const params = new URLSearchParams({ tenantId });
    if (category) params.set("category", category);
    api
      .get<CoachTrainingPlanTemplate[]>(`/futebol-treinadores/training-plan-templates?${params}`)
      .then(({ data }) => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, [tenantId, category]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!title.trim() || !fileUrl.trim()) {
      setFeedback({ open: true, title: "Atenção", message: "Informe título e arquivo do plano." });
      return;
    }
    setSaving(true);
    try {
      await api.post("/futebol-treinadores/training-plan-templates", {
        tenantId,
        category: category || null,
        title: title.trim(),
        fileUrl: fileUrl.trim(),
        notes: notes.trim() || null,
      });
      setTitle("");
      setFileUrl("");
      setNotes("");
      load();
      setFeedback({ open: true, title: "Salvo", message: "Plano adicionado à biblioteca." });
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível salvar.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const params = new URLSearchParams({ tenantId });
      await api.delete(`/futebol-treinadores/training-plan-templates/${deleteId}?${params}`);
      load();
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível excluir.",
      });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <>
      <Card className="border-border/60 bg-card/40">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-primary" />
            Biblioteca de planos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum plano salvo ainda.</p>
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.title}</p>
                    {t.notes ? <p className="truncate text-xs text-muted-foreground">{t.notes}</p> : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => onApplyTemplate(t)}>
                      Usar no treino
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setDeleteId(t.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-lg border border-dashed border-border/70 p-3 space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Novo plano</p>
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Treino tático 4-3-3" />
            </div>
            <TreinadoresMediaPicker
              label="Arquivo (PDF preferencial)"
              value={fileUrl}
              onChange={setFileUrl}
            />
            <div className="space-y-2">
              <Label>Observação</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Salvar na biblioteca
            </Button>
          </div>
        </CardContent>
      </Card>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.title === "Erro" ? "error" : feedback.title === "Atenção" ? "warning" : "success"}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir plano da biblioteca?</AlertDialogTitle>
            <AlertDialogDescription>Os treinos já registrados mantêm o histórico.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
