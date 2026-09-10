"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import type { LearningPracticeItem } from "@/lib/learning-player-types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LearningPracticeActivity({
  item,
  onComplete,
}: {
  item: LearningPracticeItem;
  onComplete: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const handleCheck = () => {
    if (selected === null) return;
    setRevealed(true);
  };

  const selectedOption = selected !== null ? item.options[selected] : null;
  const isCorrect = selectedOption?.correct ?? false;

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-foreground">{item.promptPt}</p>
      <div className="grid gap-2 sm:grid-cols-1">
        {item.options.map((opt, idx) => {
          const active = selected === idx;
          const showState = revealed && active;
          return (
            <button
              key={idx}
              type="button"
              disabled={revealed}
              onClick={() => setSelected(idx)}
              className={cn(
                "min-h-[44px] rounded-xl border px-4 py-3 text-left transition-colors",
                active && !revealed && "border-violet-500/50 bg-violet-500/10",
                !active && !revealed && "border-border/60 bg-card hover:border-violet-500/30 hover:bg-muted/20",
                showState && isCorrect && "border-emerald-500/50 bg-emerald-500/10",
                showState && !isCorrect && "border-red-500/40 bg-red-500/10",
              )}
            >
              <span className="text-base font-semibold text-foreground">{opt.labelEn}</span>
            </button>
          );
        })}
      </div>

      {revealed && selectedOption ? (
        <div
          className={cn(
            "flex gap-3 rounded-xl border px-4 py-3",
            isCorrect ? "border-emerald-500/40 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5",
          )}
        >
          {isCorrect ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
          ) : (
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          )}
          <div>
            <p className={cn("text-sm font-medium", isCorrect ? "text-emerald-400" : "text-red-400")}>
              {isCorrect ? "Correto" : "Ainda não"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{selectedOption.feedbackPt}</p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {!revealed ? (
          <Button type="button" onClick={handleCheck} disabled={selected === null} className="min-h-[44px]">
            Verificar
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={onComplete} className="min-h-[44px]">
            {isCorrect ? "Continuar" : "Tentar de novo"}
          </Button>
        )}
        {revealed && !isCorrect ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setSelected(null);
              setRevealed(false);
            }}
            className="min-h-[44px]"
          >
            Recomeçar
          </Button>
        ) : null}
      </div>
    </div>
  );
}
