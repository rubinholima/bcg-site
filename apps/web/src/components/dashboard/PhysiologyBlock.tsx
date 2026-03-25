"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  normalizePhysiology,
  type PhysiologyEntry,
  type PhysiologyData,
} from "@/lib/physiology-types";

interface PhysiologyBlockProps {
  physiology: unknown;
  onUpdate: (patch: { physiology: PhysiologyData }) => void;
  /** Valores atuais do cadastro — pré-preenchem nova avaliação */
  cadastroWeight?: number | null;
  cadastroHeight?: number | null;
  cadastroBmi?: number | null;
  cadastroBodyFatPercent?: number | null;
  cadastroLeanMassKg?: number | null;
}

function numVal(v: number | undefined): string {
  if (v === undefined || v === null) return "";
  return String(v);
}

export function PhysiologyBlock({
  physiology,
  onUpdate,
  cadastroWeight,
  cadastroHeight,
  cadastroBmi,
  cadastroBodyFatPercent,
  cadastroLeanMassKg,
}: PhysiologyBlockProps) {
  const { records } = normalizePhysiology(physiology);

  const updateRecord = (idx: number, field: keyof PhysiologyEntry, value: string | number | undefined) => {
    const next = [...records];
    if (!next[idx]) next[idx] = {};
    (next[idx] as Record<string, unknown>)[field] = value === "" ? undefined : value;
    onUpdate({ physiology: { profile: {}, records: next } });
  };

  const removeRecord = (idx: number) => {
    const next = records.filter((_, i) => i !== idx);
    onUpdate({ physiology: { profile: {}, records: next } });
  };

  const addRecord = () => {
    const today = new Date().toISOString().slice(0, 10);
    const next: PhysiologyEntry = { date: today };
    if (cadastroWeight != null && cadastroWeight > 0) next.weight = cadastroWeight;
    if (cadastroHeight != null && cadastroHeight > 0) next.height = cadastroHeight;
    if (cadastroBmi != null && cadastroBmi > 0) next.bmi = cadastroBmi;
    if (cadastroBodyFatPercent != null && cadastroBodyFatPercent > 0) next.fatPercent = cadastroBodyFatPercent;
    if (cadastroLeanMassKg != null && cadastroLeanMassKg > 0) next.leanMass = cadastroLeanMassKg;
    onUpdate({ physiology: { profile: {}, records: [...records, next] } });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Avaliação física</CardTitle>
        <CardDescription>
          Composição corporal, VO2, testes de campo (Yo-Yo, sprint, RAST, CMJ, agilidade)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Avaliações</h3>
          {records.map((entry, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-border bg-muted/20 p-4 space-y-4 mb-4"
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
                  onClick={() => removeRecord(idx)}
                  aria-label="Remover avaliação"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs">Data</Label>
                  <Input
                    type="date"
                    className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                    value={entry.date ?? ""}
                    onChange={(e) => updateRecord(idx, "date", e.target.value || undefined)}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Responsável</Label>
                  <Input
                    placeholder="Nome do avaliador"
                    value={entry.evaluator ?? ""}
                    onChange={(e) => updateRecord(idx, "evaluator", e.target.value || undefined)}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground mb-2">Composição corporal</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Peso (kg)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="30"
                      max="150"
                      placeholder="—"
                      value={numVal(entry.weight)}
                      onChange={(e) =>
                        updateRecord(idx, "weight", e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Altura (cm)</Label>
                    <Input
                      type="number"
                      min="100"
                      max="220"
                      placeholder="—"
                      value={numVal(entry.height)}
                      onChange={(e) =>
                        updateRecord(idx, "height", e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">IMC</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="10"
                      max="50"
                      placeholder="—"
                      value={numVal(entry.bmi)}
                      onChange={(e) =>
                        updateRecord(idx, "bmi", e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">% Gordura</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="50"
                      placeholder="—"
                      value={numVal(entry.fatPercent)}
                      onChange={(e) =>
                        updateRecord(idx, "fatPercent", e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Massa magra (kg)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="—"
                      value={numVal(entry.leanMass)}
                      onChange={(e) =>
                        updateRecord(idx, "leanMass", e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground mb-2">Cardiorrespiratória</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs">VO2 máx (mL/kg/min)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="20"
                      max="80"
                      placeholder="—"
                      value={numVal(entry.vo2max)}
                      onChange={(e) =>
                        updateRecord(idx, "vo2max", e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">FC repouso (bpm)</Label>
                    <Input
                      type="number"
                      min="30"
                      max="120"
                      placeholder="—"
                      value={numVal(entry.hrRest)}
                      onChange={(e) =>
                        updateRecord(idx, "hrRest", e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">FC máx (bpm)</Label>
                    <Input
                      type="number"
                      min="150"
                      max="220"
                      placeholder="—"
                      value={numVal(entry.hrMax)}
                      onChange={(e) =>
                        updateRecord(idx, "hrMax", e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground mb-2">Testes de campo</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Yo-Yo (m)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Distância"
                      value={numVal(entry.yoyoDistance)}
                      onChange={(e) =>
                        updateRecord(idx, "yoyoDistance", e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Sprint 10m (s)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="—"
                      value={numVal(entry.sprint10m)}
                      onChange={(e) =>
                        updateRecord(idx, "sprint10m", e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Sprint 20m (s)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="—"
                      value={numVal(entry.sprint20m)}
                      onChange={(e) =>
                        updateRecord(idx, "sprint20m", e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">RAST potência (W)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="—"
                      value={numVal(entry.rastPower)}
                      onChange={(e) =>
                        updateRecord(idx, "rastPower", e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">CMJ (cm)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="Counter Movement Jump"
                      value={numVal(entry.cmjCm)}
                      onChange={(e) =>
                        updateRecord(idx, "cmjCm", e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Illinois (s)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Agilidade"
                      value={numVal(entry.illinoisSec)}
                      onChange={(e) =>
                        updateRecord(idx, "illinoisSec", e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">T-Test (s)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="—"
                      value={numVal(entry.tTestSec)}
                      onChange={(e) =>
                        updateRecord(idx, "tTestSec", e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1 pt-2 border-t border-border">
                <Label className="text-xs">Observações</Label>
                <textarea
                  className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  placeholder="Observações da avaliação"
                  value={entry.notes ?? ""}
                  onChange={(e) => updateRecord(idx, "notes", e.target.value || undefined)}
                />
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={addRecord}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar avaliação
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
