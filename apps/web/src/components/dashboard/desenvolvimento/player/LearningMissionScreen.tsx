"use client";

import { Rocket, Sparkles } from "lucide-react";
import type { LearningPlayerExperience } from "@/lib/learning-player-types";
import { Button } from "@/components/ui/button";

export function LearningMissionScreen({
  mission,
  lessonCompleted,
  onFinish,
}: {
  mission: LearningPlayerExperience["mission"];
  lessonCompleted: boolean;
  onFinish?: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-950/40 via-card to-background px-6 py-10 sm:px-10 sm:py-12">
        <Sparkles className="absolute right-6 top-6 h-6 w-6 text-violet-400/40" />
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">Execute · Missão</p>
        <h3 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{mission.headlineEn}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{mission.headlinePt}</p>
        <p className="mt-6 text-base leading-relaxed text-foreground/90">{mission.bodyPt}</p>
      </div>

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
        <p className="text-sm text-emerald-400">Lição registrada como concluída no seu progresso.</p>
      ) : null}

      {onFinish ? (
        <Button type="button" onClick={onFinish} className="min-h-[44px]">
          Voltar ao curso
        </Button>
      ) : null}
    </div>
  );
}
