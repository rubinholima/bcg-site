"use client";

import { Plus, Trash2, Activity, Star, BarChart3, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  STATUS_OPTIONS,
  normalizeEvaluations,
  normalizeAnalysisMetrics,
  type EvaluationEntry,
  type AnalysisMetrics,
} from "@/lib/analysis-types";

interface AnalysisBlockProps {
  status: string | null | undefined;
  statusDetails: string | null | undefined;
  statusUntil: string | null | undefined;
  evaluations: unknown;
  analysisMetrics: unknown;
  performanceAnalysis: string | null | undefined;
  onUpdate: (patch: {
    status?: string | null;
    statusDetails?: string | null;
    statusUntil?: string | null;
    evaluations?: EvaluationEntry[];
    analysisMetrics?: AnalysisMetrics;
    performanceAnalysis?: string | null;
  }) => void;
}

function numVal(v: number | undefined): string {
  if (v === undefined || v === null) return "";
  return String(v);
}

export function AnalysisBlock({
  status,
  statusDetails,
  statusUntil,
  evaluations,
  analysisMetrics,
  performanceAnalysis,
  onUpdate,
}: AnalysisBlockProps) {
  const evalList = normalizeEvaluations(evaluations);
  const metrics = normalizeAnalysisMetrics(analysisMetrics);

  const statusUntilStr =
    typeof statusUntil === "string"
      ? statusUntil.slice(0, 10)
      : "";

  return (
    <div className="space-y-6">
      {/* Status atual */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-500" />
            <div>
              <CardTitle>Status atual</CardTitle>
              <CardDescription>Aptidão para jogar: lesão, suspensão, ausência</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status ?? "available"}
                onValueChange={(v) => onUpdate({ status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Válido até</Label>
              <Input
                type="date"
                className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                value={statusUntilStr}
                onChange={(e) =>
                  onUpdate({ statusUntil: e.target.value || null })
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Detalhes (lesão, suspensão, observação)</Label>
            <textarea
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              placeholder="Ex: Lesão no joelho direito, retorno previsto em 3 semanas"
              value={statusDetails ?? ""}
              onChange={(e) =>
                onUpdate({ statusDetails: e.target.value || null })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Avaliações */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            <div>
              <CardTitle>Avaliações</CardTitle>
              <CardDescription>
                Notas da comissão/diretoria — geral e por dimensão (técnico, tático, físico, mental)
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
                  {entry.date
                    ? ` — ${entry.date.split("-").reverse().join("/")}`
                    : ""}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const next = evalList.filter((_, i) => i !== idx);
                    onUpdate({ evaluations: next });
                  }}
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
                    onChange={(e) => {
                      const next = [...evalList];
                      (next[idx] as EvaluationEntry).date =
                        e.target.value || undefined;
                      onUpdate({ evaluations: next });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Avaliador</Label>
                  <Input
                    placeholder="Nome"
                    value={entry.evaluator ?? ""}
                    onChange={(e) => {
                      const next = [...evalList];
                      (next[idx] as EvaluationEntry).evaluator =
                        e.target.value || undefined;
                      onUpdate({ evaluations: next });
                    }}
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
                    onChange={(e) => {
                      const next = [...evalList];
                      (next[idx] as EvaluationEntry).rating = e.target.value
                        ? Number(e.target.value)
                        : undefined;
                      onUpdate({ evaluations: next });
                    }}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-2 border-t border-border">
                <div className="space-y-1">
                  <Label className="text-xs">Técnico (0–10)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    placeholder="—"
                    value={numVal(entry.technical)}
                    onChange={(e) => {
                      const next = [...evalList];
                      (next[idx] as EvaluationEntry).technical = e.target.value
                        ? Number(e.target.value)
                        : undefined;
                      onUpdate({ evaluations: next });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tático (0–10)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    placeholder="—"
                    value={numVal(entry.tactical)}
                    onChange={(e) => {
                      const next = [...evalList];
                      (next[idx] as EvaluationEntry).tactical = e.target.value
                        ? Number(e.target.value)
                        : undefined;
                      onUpdate({ evaluations: next });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Físico (0–10)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    placeholder="—"
                    value={numVal(entry.physical)}
                    onChange={(e) => {
                      const next = [...evalList];
                      (next[idx] as EvaluationEntry).physical = e.target.value
                        ? Number(e.target.value)
                        : undefined;
                      onUpdate({ evaluations: next });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Mental (0–10)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    placeholder="—"
                    value={numVal(entry.mental)}
                    onChange={(e) => {
                      const next = [...evalList];
                      (next[idx] as EvaluationEntry).mental = e.target.value
                        ? Number(e.target.value)
                        : undefined;
                      onUpdate({ evaluations: next });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Comportamento (0–10)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    placeholder="Ética, comprometimento, disciplina"
                    value={numVal(entry.behavior)}
                    onChange={(e) => {
                      const next = [...evalList];
                      (next[idx] as EvaluationEntry).behavior = e.target.value
                        ? Number(e.target.value)
                        : undefined;
                      onUpdate({ evaluations: next });
                    }}
                  />
                </div>
              </div>
              <div className="space-y-1 pt-2 border-t border-border">
                <Label className="text-xs">Observações</Label>
                <textarea
                  className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  placeholder="Comentários da avaliação"
                  value={entry.notes ?? ""}
                  onChange={(e) => {
                    const next = [...evalList];
                    (next[idx] as EvaluationEntry).notes =
                      e.target.value || undefined;
                    onUpdate({ evaluations: next });
                  }}
                />
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() => onUpdate({ evaluations: [...evalList, {}] })}
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar avaliação
          </Button>
        </CardContent>
      </Card>

      {/* Métricas de desempenho (scout) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-sky-500" />
            <div>
              <CardTitle>Métricas de desempenho</CardTitle>
              <CardDescription>
                Dados de scout: gols, assistências, xG, xA, passes-chave, duelos (totais ou por 90)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs">Temporada</Label>
              <Input
                placeholder="Ex: 2025/2026"
                value={metrics.season ?? ""}
                onChange={(e) =>
                  onUpdate({
                    analysisMetrics: {
                      ...metrics,
                      season: e.target.value || undefined,
                    },
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Jogos</Label>
              <Input
                type="number"
                min={0}
                placeholder="—"
                value={numVal(metrics.matchesPlayed)}
                onChange={(e) =>
                  onUpdate({
                    analysisMetrics: {
                      ...metrics,
                      matchesPlayed: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    },
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Minutos</Label>
              <Input
                type="number"
                min={0}
                placeholder="—"
                value={numVal(metrics.minutesPlayed)}
                onChange={(e) =>
                  onUpdate({
                    analysisMetrics: {
                      ...metrics,
                      minutesPlayed: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    },
                  })
                }
              />
            </div>
          </div>
          <div className="pt-3 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Ataque
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { key: "goals", label: "Gols" },
                { key: "assists", label: "Assistências" },
                { key: "xG", label: "xG" },
                { key: "xA", label: "xA" },
                { key: "shots", label: "Finalizações" },
                { key: "shotsOnTarget", label: "Finalizações no alvo" },
                { key: "keyPasses", label: "Passes-chave" },
                { key: "bigChancesCreated", label: "Grandes chances criadas" },
                { key: "dribblesSuccess", label: "Dribles certos" },
              ].map(({ key, label }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  <Input
                    type="number"
                    step={key === "xG" || key === "xA" ? 0.01 : 1}
                    min={0}
                    placeholder="—"
                    value={numVal(
                      metrics[key as keyof AnalysisMetrics] as number | undefined
                    )}
                    onChange={(e) =>
                      onUpdate({
                        analysisMetrics: {
                          ...metrics,
                          [key]: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        },
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="pt-3 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Posse / Defesa
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { key: "passes", label: "Passes" },
                { key: "passAccuracy", label: "Precisão passes (%)" },
                { key: "progressivePasses", label: "Passes progressivos" },
                { key: "tackles", label: "Desarmes" },
                { key: "interceptions", label: "Interceptações" },
                { key: "duelsWon", label: "Duelos ganhos" },
                { key: "recoveries", label: "Recuperações" },
              ].map(({ key, label }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="—"
                    value={numVal(
                      metrics[key as keyof AnalysisMetrics] as number | undefined
                    )}
                    onChange={(e) =>
                      onUpdate({
                        analysisMetrics: {
                          ...metrics,
                          [key]: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        },
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="pt-3 border-t border-border grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs">Faltas cometidas</Label>
              <Input
                type="number"
                min={0}
                placeholder="—"
                value={numVal(metrics.foulsCommitted)}
                onChange={(e) =>
                  onUpdate({
                    analysisMetrics: {
                      ...metrics,
                      foulsCommitted: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    },
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Faltas sofridas</Label>
              <Input
                type="number"
                min={0}
                placeholder="—"
                value={numVal(metrics.foulsDrawn)}
                onChange={(e) =>
                  onUpdate({
                    analysisMetrics: {
                      ...metrics,
                      foulsDrawn: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    },
                  })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Relatório de análise */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-violet-500" />
            <div>
              <CardTitle>Relatório de análise</CardTitle>
              <CardDescription>
                Texto livre: conclusões do scout, pontos fortes/fracos, recomendação
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <textarea
            className="w-full min-h-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            placeholder="Descreva a análise geral do jogador: pontos fortes, fraquezas, adequação tática, comparação com referências, recomendação de uso..."
            value={performanceAnalysis ?? ""}
            onChange={(e) =>
              onUpdate({ performanceAnalysis: e.target.value || null })
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
