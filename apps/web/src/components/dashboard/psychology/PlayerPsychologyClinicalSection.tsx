"use client";

import { FileText, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PsychAnamnesisForm } from "@/components/dashboard/psychology/PsychAnamnesisForm";
import type { PsychologicalAssessmentEntry } from "@/components/dashboard/player-module-types";
import { emptyPsychAnamnesis, psychEntryLabel } from "@/lib/psych-anamnesis";

type Props = {
  entries: PsychologicalAssessmentEntry[];
  onChange: (next: PsychologicalAssessmentEntry[]) => void;
  /** Resumo de consultas (somente leitura) */
  consultations?: Array<{
    date?: string;
    time?: string;
    status?: string;
    psychologist?: string;
    notes?: string;
    link?: string;
    type?: string;
  }>;
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendada",
  completed: "Realizada",
  cancelled: "Cancelada",
};

export function PlayerPsychologyClinicalSection({ entries, onChange, consultations = [] }: Props) {
  const updateEntry = (idx: number, field: keyof PsychologicalAssessmentEntry, value: string | undefined) => {
    onChange(
      entries.map((entry, i) =>
        i === idx ? ({ ...entry, [field]: value || undefined } as PsychologicalAssessmentEntry) : entry,
      ),
    );
  };

  const removeEntry = (idx: number) => {
    onChange(entries.filter((_, i) => i !== idx));
  };

  const patchEntry = (idx: number, patch: Partial<PsychologicalAssessmentEntry>) => {
    onChange(entries.map((entry, i) => (i === idx ? { ...entry, ...patch } : entry)));
  };

  return (
    <div className="space-y-6">
      {consultations.length > 0 ? (
        <Card className="rounded-2xl border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Consultas</CardTitle>
            <CardDescription>Histórico registrado na ficha do atleta.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {consultations.map((c, idx) => {
                const dateStr = c.date
                  ? `${c.date.slice(8, 10)}/${c.date.slice(5, 7)}/${c.date.slice(0, 4)}`
                  : "—";
                return (
                  <div key={idx} className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{dateStr}</span>
                      {c.time ? <span className="text-muted-foreground">{c.time}</span> : null}
                      <span className="rounded px-2 py-0.5 text-xs bg-muted text-muted-foreground">
                        {STATUS_LABEL[c.status ?? "scheduled"] ?? c.status}
                      </span>
                      {c.psychologist ? (
                        <span className="text-muted-foreground">• {c.psychologist}</span>
                      ) : null}
                    </div>
                    {c.notes ? (
                      <p className="mt-2 text-muted-foreground whitespace-pre-wrap text-xs">{c.notes}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-2xl border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Anamnese e registros psicológicos
          </CardTitle>
          <CardDescription>
            Modelo Boston City — preenchimento por psicólogos e estagiários do Depto Saúde.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma anamnese cadastrada ainda.</p>
          ) : null}
          {entries.map((entry, idx) => {
            const kind = entry.kind ?? (entry.dadosPessoais ? "anamnese" : "anamnese");
            if (kind !== "anamnese" && entry.kind) {
              return (
                <div
                  key={idx}
                  className="rounded-lg border border-border/80 bg-muted/20 p-4 text-sm space-y-2"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="font-semibold text-foreground">{psychEntryLabel(entry.kind)}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEntry(idx)}
                      aria-label="Remover registro"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <p className="text-muted-foreground">
                    {entry.date}
                    {entry.time ? ` · ${entry.time}` : ""}
                    {entry.category ? ` · ${entry.category}` : ""}
                  </p>
                  {entry.present !== undefined ? (
                    <p>Presença: {entry.present ? "Presente" : "Ausente"}</p>
                  ) : null}
                  {entry.groupSummary ? (
                    <p className="whitespace-pre-wrap">{entry.groupSummary}</p>
                  ) : null}
                  {entry.individualNotes ? (
                    <p className="whitespace-pre-wrap text-foreground">{entry.individualNotes}</p>
                  ) : null}
                  {entry.observacaoGeral ? (
                    <p className="whitespace-pre-wrap">{entry.observacaoGeral}</p>
                  ) : null}
                </div>
              );
            }
            return (
              <div key={idx} className="rounded-lg border p-4 space-y-4 bg-muted/20">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div className="flex flex-wrap gap-2">
                    <Input
                      type="date"
                      className="w-[165px] text-foreground"
                      value={entry.date ?? ""}
                      onChange={(e) => updateEntry(idx, "date", e.target.value || undefined)}
                    />
                    <Input
                      className="w-[180px] text-foreground"
                      placeholder="Avaliador"
                      value={entry.evaluator ?? ""}
                      onChange={(e) => updateEntry(idx, "evaluator", e.target.value || undefined)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeEntry(idx)}
                    aria-label="Remover anamnese"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <PsychAnamnesisForm
                  value={{ ...emptyPsychAnamnesis(), ...entry }}
                  onChange={(data) => patchEntry(idx, { ...data, kind: "anamnese" })}
                />
              </div>
            );
          })}
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px]"
            onClick={() =>
              onChange([
                ...entries,
                {
                  kind: "anamnese",
                  date: new Date().toISOString().slice(0, 10),
                  ...emptyPsychAnamnesis(),
                },
              ])
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova anamnese
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
