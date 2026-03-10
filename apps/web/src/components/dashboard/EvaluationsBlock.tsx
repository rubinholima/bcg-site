"use client";

import { Plus, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  normalizeEvaluations,
  type EvaluationEntry,
} from "@/lib/analysis-types";

interface EvaluationsBlockProps {
  evaluations: unknown;
  onUpdate: (evaluations: EvaluationEntry[]) => void;
}

function numVal(v: number | undefined): string {
  if (v === undefined || v === null) return "";
  return String(v);
}

export function EvaluationsBlock({ evaluations, onUpdate }: EvaluationsBlockProps) {
  const evalList = normalizeEvaluations(evaluations);

  const updateEntry = (idx: number, field: keyof EvaluationEntry, value: string | number | undefined) => {
    const next = [...evalList];
    if (!next[idx]) next[idx] = {};
    (next[idx] as Record<string, unknown>)[field] = value === "" ? undefined : value;
    onUpdate(next);
  };

  const removeEntry = (idx: number) => {
    onUpdate(evalList.filter((_, i) => i !== idx));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-500" />
          <div>
            <CardTitle>Avaliações</CardTitle>
            <CardDescription>
              Notas da comissão técnica — geral e por dimensão (técnico, tático, físico, mental, comportamento). Escala 0–10.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {evalList.map((entry, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-border bg-muted/20 p-4 space-y-3"
          >
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">
                Avaliação {idx + 1}
                {entry.date ? ` — ${entry.date.split("-").reverse().join("/")}` : ""}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeEntry(idx)}
                aria-label="Remover avaliação"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-xs">Data</Label>
                <Input
                  type="date"
                  className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  value={entry.date ?? ""}
                  onChange={(e) => updateEntry(idx, "date", e.target.value || undefined)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Avaliador</Label>
                <Input
                  placeholder="Nome da comissão"
                  value={entry.evaluator ?? ""}
                  onChange={(e) => updateEntry(idx, "evaluator", e.target.value || undefined)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nota geral (0–10)</Label>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  step={0.5}
                  placeholder="—"
                  value={numVal(entry.rating)}
                  onChange={(e) =>
                    updateEntry(idx, "rating", e.target.value ? Number(e.target.value) : undefined)
                  }
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 pt-2 border-t border-border">
              {[
                { key: "technical" as const, label: "Técnico" },
                { key: "tactical" as const, label: "Tático" },
                { key: "physical" as const, label: "Físico" },
                { key: "mental" as const, label: "Mental" },
                { key: "behavior" as const, label: "Comportamento" },
              ].map(({ key, label }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">{label} (0–10)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    placeholder="—"
                    value={numVal(entry[key])}
                    onChange={(e) =>
                      updateEntry(idx, key, e.target.value ? Number(e.target.value) : undefined)
                    }
                  />
                </div>
              ))}
            </div>
            <div className="space-y-1 pt-2 border-t border-border">
              <Label className="text-xs">Observações</Label>
              <textarea
                className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                placeholder="Pontos fortes, a melhorar, recomendação..."
                value={entry.notes ?? ""}
                onChange={(e) => updateEntry(idx, "notes", e.target.value || undefined)}
              />
            </div>
          </div>
        ))}
        <Button
          variant="outline"
          onClick={() => onUpdate([...evalList, {}])}
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar avaliação
        </Button>
      </CardContent>
    </Card>
  );
}
