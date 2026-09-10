"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type QuizData = {
  passingScore: number;
  questions: { id: string; question: string; options: string[] }[];
};

type SubmitResult = {
  score: number;
  passed: boolean;
  passingScore: number;
};

export function LearningQuizFlow({
  quiz,
  onSubmit,
}: {
  quiz: QuizData;
  onSubmit: (answers: Record<string, number>) => Promise<SubmitResult>;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const questions = quiz.questions;
  const current = questions[index];
  const isLast = index >= questions.length - 1;
  const selected = current ? answers[current.id] : undefined;

  const progressPct = useMemo(
    () => Math.round(((result ? questions.length : index + (selected !== undefined ? 1 : 0)) / questions.length) * 100),
    [index, questions.length, result, selected],
  );

  const handleNext = async () => {
    if (selected === undefined || !current) return;
    if (!isLast) {
      setIndex((i) => i + 1);
      return;
    }
    setSubmitting(true);
    try {
      const res = await onSubmit(answers);
      setResult(res);
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="space-y-6">
        <div
          className={cn(
            "rounded-2xl border px-6 py-8 text-center",
            result.passed ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5",
          )}
        >
          {result.passed ? (
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          ) : (
            <XCircle className="mx-auto h-12 w-12 text-amber-500" />
          )}
          <p className="mt-4 text-3xl font-bold tabular-nums">{result.score}%</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Mínimo para aprovação: {result.passingScore}%
          </p>
          <p className="mt-3 text-base font-medium">
            {result.passed ? "Verify concluído — você pode seguir para a missão." : "Revise o conteúdo e tente novamente."}
          </p>
        </div>
        {!result.passed ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px] w-full sm:w-auto"
            onClick={() => {
              setResult(null);
              setIndex(0);
              setAnswers({});
            }}
          >
            Refazer quiz
          </Button>
        ) : null}
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          Questão {index + 1} de {questions.length}
        </span>
        <span>{progressPct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted/40">
        <div
          className="h-full rounded-full bg-violet-500 transition-all duration-300"
          style={{ width: `${((index + 1) / questions.length) * 100}%` }}
        />
      </div>

      <p className="text-base font-medium leading-relaxed text-foreground">{current.question}</p>

      <div className="grid gap-2">
        {current.options.map((opt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setAnswers((s) => ({ ...s, [current.id]: idx }))}
            className={cn(
              "min-h-[44px] rounded-xl border px-4 py-3 text-left text-base font-semibold transition-colors",
              selected === idx
                ? "border-violet-500/50 bg-violet-500/10 text-foreground"
                : "border-border/60 bg-card text-foreground hover:border-violet-500/30",
            )}
          >
            {opt}
          </button>
        ))}
      </div>

      <Button
        type="button"
        disabled={selected === undefined || submitting}
        onClick={() => void handleNext()}
        className="min-h-[44px] w-full sm:w-auto"
      >
        {submitting ? "Enviando…" : isLast ? "Enviar quiz" : "Próxima questão"}
      </Button>
    </div>
  );
}
