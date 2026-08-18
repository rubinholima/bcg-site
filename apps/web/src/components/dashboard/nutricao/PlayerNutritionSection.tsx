"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Loader2, Plus, Printer, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { NutritionAnamnesisForm } from "@/components/dashboard/nutricao/NutritionAnamnesisForm";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import { getCategoryLabel } from "@/lib/fixture-categories";
import {
  emptyNutritionAnamnesis,
  nutritionAnamnesisLabel,
  type NutritionAnamnesisData,
} from "@/lib/nutricao-anamnesis";
import { printNutritionAnamnesis } from "@/lib/nutricao-anamnesis-print";
import type { NutritionAnamnesisRow, PlayerNutritionContext } from "@/lib/nutricao-types";

interface Props {
  playerId: string;
  tenantId: string;
  playerName: string;
  playerCategory?: string | null;
}

export function PlayerNutritionSection({ playerId, tenantId, playerName, playerCategory }: Props) {
  const [context, setContext] = useState<PlayerNutritionContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | "new">("new");
  const [assessedAt, setAssessedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<NutritionAnamnesisData>(emptyNutritionAnamnesis());
  const [notes, setNotes] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });

  const load = useCallback(async () => {
    if (!playerId) return;
    setLoading(true);
    try {
      const { data: res } = await api.get<PlayerNutritionContext>(`/players/${playerId}/nutrition-context`);
      setContext(res);
    } catch {
      setContext(null);
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    load();
  }, [load]);

  const anamneses = context?.anamneses ?? [];

  useEffect(() => {
    if (selectedId === "new") {
      setAssessedAt(new Date().toISOString().slice(0, 10));
      setData(emptyNutritionAnamnesis());
      setNotes("");
      return;
    }
    const row = anamneses.find((a) => a.id === selectedId);
    if (!row) return;
    setAssessedAt(row.assessedAt.slice(0, 10));
    setData(row.data ?? emptyNutritionAnamnesis());
    setNotes(row.notes ?? "");
  }, [selectedId, anamneses]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (selectedId === "new") {
        await api.post("/nutricao/nutrition-anamneses", {
          playerId,
          assessedAt,
          data,
          notes: notes.trim() || undefined,
        });
      } else {
        await api.patch(`/nutricao/nutrition-anamneses/${selectedId}`, {
          assessedAt,
          data,
          notes: notes.trim() || undefined,
        });
      }
      await load();
      setFeedback({ open: true, title: "Salvo", message: "Anamnese nutricional registrada." });
      if (selectedId === "new") setSelectedId("new");
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

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/nutricao/nutrition-anamneses/${deleteId}`);
      setDeleteId(null);
      setSelectedId("new");
      await load();
    } catch (err) {
      setFeedback({
        open: true,
        title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível excluir.",
      });
    }
  };

  const handlePrint = () => {
    const row: NutritionAnamnesisRow = {
      id: selectedId === "new" ? "draft" : selectedId,
      playerId,
      assessedAt: `${assessedAt}T12:00:00.000Z`,
      data,
      notes: notes.trim() || null,
      player: {
        id: playerId,
        name: playerName,
        jerseyNumber: null,
        category: playerCategory ?? null,
        tenantId,
      },
    };
    printNutritionAnamnesis(row);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const health = context?.healthLinks;

  return (
    <div className="space-y-6">
      {health &&
      (health.medicalAllergies.length > 0 ||
        health.psychFoodNotes.length > 0 ||
        health.physioSessions.length > 0) ? (
        <Card className="rounded-2xl border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Saúde — referências cruzadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {health.medicalAllergies.length > 0 ? (
              <div>
                <p className="font-medium text-amber-200/90">Médico — alergias / intolerâncias</p>
                <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                  {health.medicalAllergies.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {health.psychFoodNotes.length > 0 ? (
              <div>
                <p className="font-medium text-amber-200/90">Psicologia — alimentação</p>
                <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                  {health.psychFoodNotes.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {health.physioSessions.length > 0 ? (
              <div>
                <p className="font-medium text-amber-200/90">Fisioterapia — lesões recentes</p>
                <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                  {health.physioSessions.map((s) => (
                    <li key={s.id}>
                      {formatDateDayMonYear(new Date(s.startedAt))} — {s.status}
                      {s.diagnosisLabel ? ` · ${s.diagnosisLabel}` : ""}
                      {s.symptoms ? ` · ${s.symptoms}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {(context?.assessments?.length ?? 0) > 0 ? (
        <Card className="rounded-2xl border-border/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Avaliações antropométricas</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            {context!.assessments.slice(0, 3).map((a) => (
              <p key={a.id}>
                {formatDateDayMonYear(new Date(a.assessedAt))} — {a.weightKg} kg
                {a.bmi != null ? ` · IMC ${a.bmi}` : ""}
                {a.bodyFatPercent != null ? ` · ${a.bodyFatPercent}% gordura` : ""}
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {(context?.supplements?.length ?? 0) > 0 ? (
        <Card className="rounded-2xl border-border/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Suplementação vinculada</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {context!.supplements.map((g) => (
              <div key={g.id} className="rounded-lg border border-border/60 p-3">
                <p className="font-medium">{g.name}</p>
                {g.whenToTake ? <p className="text-muted-foreground text-xs mt-1">{g.whenToTake}</p> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-2xl border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Anamnese nutricional
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="grid gap-1 min-w-[200px] flex-1">
              <Label className="text-xs text-muted-foreground">Registro</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value as string | "new")}
              >
                <option value="new">Nova anamnese</option>
                {anamneses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {formatDateDayMonYear(new Date(a.assessedAt))} — {nutritionAnamnesisLabel(a.data ?? {})}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1 min-w-[160px]">
              <Label className="text-xs text-muted-foreground">Data da consulta</Label>
              <Input
                type="date"
                className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                value={assessedAt}
                onChange={(e) => setAssessedAt(e.target.value)}
              />
            </div>
            {playerCategory ? (
              <p className="text-sm text-muted-foreground pb-2">
                Categoria: {getCategoryLabel(playerCategory, "pt")}
              </p>
            ) : null}
          </div>

          <NutritionAnamnesisForm value={data} onChange={setData} />

          <div className="grid gap-1">
            <Label className="text-xs text-muted-foreground">Notas adicionais</Label>
            <textarea
              className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
            <Button type="button" variant="secondary" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            {selectedId !== "new" ? (
              <Button type="button" variant="destructive" onClick={() => setDeleteId(selectedId)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={() => setSelectedId("new")}>
              <Plus className="h-4 w-4 mr-2" />
              Nova
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir anamnese</AlertDialogTitle>
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
    </div>
  );
}
