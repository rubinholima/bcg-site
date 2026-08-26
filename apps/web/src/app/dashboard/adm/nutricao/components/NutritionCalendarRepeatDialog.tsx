"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
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
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { FIXTURE_CATEGORIES, getCategoryLabel } from "@/lib/fixture-categories";
import type { NutritionCategoryRow } from "./NutritionCategoryFormDialog";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  categories: NutritionCategoryRow[];
  onSuccess: () => void;
}

export function NutritionCalendarRepeatDialog({
  open,
  onOpenChange,
  tenantId,
  categories,
  onSuccess,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [sourceDate, setSourceDate] = useState("");
  const [untilDate, setUntilDate] = useState("");
  const [weekdays, setWeekdays] = useState<Set<number>>(() => new Set());
  const [categoryId, setCategoryId] = useState("");
  const [feedback, setFeedback] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });

  const tenantCategories = categories.filter((c) => c.tenant.id === tenantId);
  const categoryOptions = FIXTURE_CATEGORIES.map((cat) => {
    const c = tenantCategories.find((tc) => tc.code === cat.value);
    return c ? { value: c.id, label: getCategoryLabel(cat.value, "pt") } : null;
  }).filter((x): x is { value: string; label: string } => x != null);

  useEffect(() => {
    if (!open) return;
    setSourceDate("");
    setUntilDate("");
    setWeekdays(new Set());
    setCategoryId("");
  }, [open]);

  const toggleWeekday = (idx: number) => {
    setWeekdays((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!tenantId || !sourceDate || !untilDate || weekdays.size === 0) {
      setFeedback({
        open: true,
        title: "Campos obrigatórios",
        message: "Informe a data base, a data limite e ao menos um dia da semana.",
      });
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post<{
        created: number;
        sourceCount: number;
        targetDays: number;
      }>("/nutricao/nutrition-calendar/repeat-week", {
        tenantId,
        sourceDate: `${sourceDate}T12:00:00.000Z`,
        untilDate: `${untilDate}T12:00:00.000Z`,
        weekdays: [...weekdays].sort((a, b) => a - b),
        categoryId: categoryId || undefined,
      });
      onSuccess();
      onOpenChange(false);
      setFeedback({
        open: true,
        title: "Cardápio replicado",
        message: `${data.created} entrada(s) criada(s) a partir de ${data.sourceCount} no dia base · ${data.targetDays} dia(s) alvo.`,
      });
    } catch (err) {
      setFeedback({
        open: true,
        title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível replicar.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Repetir cardápio da semana</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">Dia base *</Label>
                <Input
                  type="date"
                  className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  value={sourceDate}
                  onChange={(e) => setSourceDate(e.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">Repetir até *</Label>
                <Input
                  type="date"
                  className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  value={untilDate}
                  onChange={(e) => setUntilDate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Categoria (opcional)</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">Todas do dia base</option>
                {categoryOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Repetir nos dias *</Label>
              <div className="flex flex-wrap gap-2">
                {WEEKDAY_LABELS.map((label, idx) => {
                  const active = weekdays.has(idx);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleWeekday(idx)}
                      className={cn(
                        "inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="button" onClick={() => void handleSubmit()} disabled={saving} className="min-h-[44px]">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Replicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
      />
    </>
  );
}
