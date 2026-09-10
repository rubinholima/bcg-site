"use client";

import { useMemo, useState } from "react";
import { Rocket, Sparkles } from "lucide-react";
import type { LearningMissionProduction, LearningPlayerExperience } from "@/lib/learning-player-types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LearningMissionProduction({
  mission,
  production,
  lessonCompleted,
}: {
  mission: LearningPlayerExperience["mission"];
  production: LearningMissionProduction;
  lessonCompleted: boolean;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [built, setBuilt] = useState(false);

  const preview = useMemo(() => {
    const name = values.name?.trim() || "…";
    const from = values.from?.trim() || "…";
    const live = values.live?.trim() || "…";
    return `Hi! I'm ${name}.\nI'm from ${from}.\nI live in ${live}.`;
  }, [values]);

  const allFilled = production.fields.every((f) => (values[f.id]?.trim() ?? "").length > 0);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-950/40 via-card to-background px-6 py-8 sm:px-10">
        <Sparkles className="absolute right-6 top-6 h-6 w-6 text-violet-400/40" />
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">Execute · Missão</p>
        <h3 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{mission.headlineEn}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{production.introPt}</p>
        <ul className="mt-5 space-y-2">
          {production.prompts.map((p) => (
            <li key={p.questionEn} className="rounded-lg border border-border/50 bg-card/50 px-4 py-3">
              <span className="text-xs font-semibold uppercase text-muted-foreground">{p.speaker}</span>
              <p className="text-lg font-semibold text-foreground">{p.questionEn}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
        <p className="text-sm font-medium text-foreground">Monte sua apresentação pessoal:</p>
        {production.fields.map((field) => (
          <div key={field.id} className="space-y-1.5">
            <label htmlFor={`mission-${field.id}`} className="text-xs text-muted-foreground">
              {field.labelPt}
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="shrink-0 text-base font-semibold text-foreground">{field.prefixEn}</span>
              <Input
                id={`mission-${field.id}`}
                value={values[field.id] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.value }))}
                placeholder={field.placeholderEn}
                className="min-h-[44px] text-foreground"
              />
            </div>
          </div>
        ))}
        <Button
          type="button"
          disabled={!allFilled}
          onClick={() => setBuilt(true)}
          className="min-h-[44px]"
        >
          Ver minha frase
        </Button>
      </div>

      {built ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Sua produção</p>
          <pre className="mt-3 whitespace-pre-wrap font-sans text-lg font-semibold leading-relaxed text-foreground">
            {preview}
          </pre>
          <p className="mt-4 text-sm text-muted-foreground">
            Exemplo modelo: <span className="text-foreground/90">{production.exampleEn}</span>
          </p>
        </div>
      ) : null}

      <div className="rounded-xl border border-border/60 bg-card p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agora você consegue</p>
        <ul className="mt-4 space-y-3">
          {mission.canDo.map((phrase) => (
            <li key={phrase} className="flex items-start gap-3">
              <Rocket className="mt-1 h-4 w-4 shrink-0 text-violet-400" />
              <span className="text-lg font-semibold text-foreground">{phrase}</span>
            </li>
          ))}
        </ul>
      </div>

      {lessonCompleted ? (
        <p className={cn("text-sm text-emerald-400")}>Lição registrada como concluída no seu progresso.</p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Conclua o Verify (quiz) para registrar progresso no curso.
        </p>
      )}
    </div>
  );
}
