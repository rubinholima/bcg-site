"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import type { LearningMicroScreen } from "@/lib/learning-player-types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function FeedbackBox({
  isCorrect,
  message,
}: {
  isCorrect: boolean;
  message: string;
}) {
  return (
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
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

function DialogueChoiceScreen({
  screen,
  onResolved,
}: {
  screen: Extract<LearningMicroScreen, { type: "dialogue_choice" }>;
  onResolved: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const option = selected !== null ? screen.options[selected] : null;
  const isCorrect = option?.correct ?? false;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{screen.speaker}</p>
        <p className="mt-1 text-xl sm:text-2xl font-bold text-foreground">{screen.promptEn}</p>
        {screen.promptPt ? <p className="mt-2 text-sm text-muted-foreground">{screen.promptPt}</p> : null}
      </div>
      <div className="grid gap-2">
        {screen.options.map((opt, idx) => (
          <button
            key={idx}
            type="button"
            disabled={revealed}
            onClick={() => setSelected(idx)}
            className={cn(
              "min-h-[44px] rounded-xl border px-4 py-3 text-left transition-colors",
              selected === idx && !revealed && "border-violet-500/50 bg-violet-500/10",
              !revealed && selected !== idx && "border-border/60 hover:border-violet-500/30",
              revealed && selected === idx && isCorrect && "border-emerald-500/50 bg-emerald-500/10",
              revealed && selected === idx && !isCorrect && "border-red-500/40 bg-red-500/10",
            )}
          >
            <span className="text-base font-semibold text-foreground">{opt.labelEn}</span>
          </button>
        ))}
      </div>
      {revealed && option ? <FeedbackBox isCorrect={isCorrect} message={option.feedbackPt} /> : null}
      <div className="flex gap-2">
        {!revealed ? (
          <Button type="button" disabled={selected === null} onClick={() => setRevealed(true)} className="min-h-[44px]">
            Verificar
          </Button>
        ) : isCorrect ? (
          <Button type="button" onClick={onResolved} className="min-h-[44px]">
            Continuar
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSelected(null);
              setRevealed(false);
            }}
            className="min-h-[44px]"
          >
            Tentar de novo
          </Button>
        )}
      </div>
    </div>
  );
}

export function LearningMicroScreenView({
  screen,
  onInteractiveResolved,
}: {
  screen: LearningMicroScreen;
  onInteractiveResolved?: () => void;
}) {
  switch (screen.type) {
    case "intro":
      return (
        <div className="mx-auto max-w-2xl space-y-3">
          <h3 className="text-2xl sm:text-3xl font-bold text-foreground">{screen.titleEn}</h3>
          {screen.titlePt ? <p className="text-sm text-muted-foreground">{screen.titlePt}</p> : null}
          <p className="text-base leading-relaxed text-muted-foreground">{screen.bodyPt}</p>
        </div>
      );

    case "scenario":
      return (
        <div className="mx-auto max-w-2xl space-y-3">
          {screen.settingEn ? (
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">{screen.settingEn}</p>
          ) : null}
          <p className="text-base leading-relaxed text-muted-foreground">{screen.scenarioPt}</p>
        </div>
      );

    case "dialogue_choice":
      return <DialogueChoiceScreen screen={screen} onResolved={() => onInteractiveResolved?.()} />;

    case "phrase_examples":
      return (
        <div className="mx-auto max-w-3xl space-y-4">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-foreground">{screen.titleEn}</h3>
            <p className="text-sm text-muted-foreground">{screen.titlePt}</p>
            {screen.introPt ? <p className="mt-2 text-sm text-muted-foreground">{screen.introPt}</p> : null}
          </div>
          <ul className="divide-y divide-border/40 rounded-xl border border-border/60 bg-muted/5">
            {screen.examples.map((ex) => (
              <li key={ex.en} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between">
                <span className="text-lg font-semibold text-foreground">{ex.en}</span>
                {ex.pt ? <span className="text-sm text-muted-foreground">{ex.pt}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      );

    case "comparison":
      return (
        <div className="mx-auto max-w-4xl space-y-5">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-foreground">{screen.titleEn}</h3>
            <p className="text-sm text-muted-foreground">{screen.titlePt}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-sky-400">{screen.left.labelEn}</p>
              <p className="mt-3 text-xl font-bold text-foreground">{screen.left.exampleEn}</p>
              <p className="mt-2 text-sm text-muted-foreground">{screen.left.notePt}</p>
            </div>
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">{screen.right.labelEn}</p>
              <p className="mt-3 text-xl font-bold text-foreground">{screen.right.exampleEn}</p>
              <p className="mt-2 text-sm text-muted-foreground">{screen.right.notePt}</p>
            </div>
          </div>
          <div className="rounded-xl border border-violet-500/30 bg-violet-500/8 px-5 py-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">Modelo integrado</p>
            <p className="mt-2 text-lg sm:text-xl font-bold text-foreground">{screen.modelEn}</p>
            {screen.modelPt ? <p className="mt-1 text-sm text-muted-foreground">{screen.modelPt}</p> : null}
          </div>
        </div>
      );

    case "nationality":
      return (
        <div className="mx-auto max-w-3xl space-y-4">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-foreground">{screen.titleEn}</h3>
            <p className="text-sm text-muted-foreground">{screen.titlePt}</p>
            {screen.introPt ? <p className="mt-2 text-sm text-muted-foreground">{screen.introPt}</p> : null}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {screen.pairs.map((p) => (
              <div key={p.countryEn} className="rounded-xl border border-border/60 bg-card px-4 py-3">
                <p className="text-sm text-muted-foreground">{p.countryEn}</p>
                <p className="text-lg font-semibold text-foreground">{p.nationalityEn}</p>
                {p.notePt ? <p className="mt-1 text-xs text-muted-foreground">{p.notePt}</p> : null}
              </div>
            ))}
          </div>
        </div>
      );

    case "language_focus":
      return (
        <div className="mx-auto max-w-3xl space-y-4">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-foreground">{screen.titleEn}</h3>
            <p className="text-sm text-muted-foreground">{screen.titlePt}</p>
          </div>
          <ul className="space-y-3">
            {screen.items.map((item) => (
              <li key={item.formalEn} className="rounded-xl border border-border/60 bg-muted/5 px-4 py-3">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="text-sm text-muted-foreground line-through">{item.formalEn}</span>
                  <span className="text-lg font-bold text-foreground">{item.naturalEn}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{item.notePt}</p>
              </li>
            ))}
          </ul>
          {screen.tipPt ? (
            <p className="rounded-lg border border-violet-500/20 bg-violet-500/5 px-4 py-3 text-sm text-muted-foreground">
              {screen.tipPt}
            </p>
          ) : null}
        </div>
      );

    case "vocabulary":
      return (
        <div className="mx-auto max-w-3xl space-y-4">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-foreground">{screen.titleEn}</h3>
            <p className="text-sm text-muted-foreground">{screen.titlePt}</p>
          </div>
          <ul className="divide-y divide-border/40 rounded-xl border border-border/60">
            {screen.words.map((w) => (
              <li key={w.en} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-base font-bold text-foreground">{w.en}</span>
                  <span className="text-sm text-muted-foreground">— {w.pt}</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-foreground/90">{w.exampleEn}</p>
              </li>
            ))}
          </ul>
        </div>
      );

    case "mistake":
      return (
        <div className="mx-auto max-w-2xl space-y-4">
          <p className="text-sm font-medium text-amber-400">{screen.titlePt}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-4">
              <p className="text-xs uppercase tracking-wider text-red-400">Evite</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{screen.wrongEn}</p>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-4">
              <p className="text-xs uppercase tracking-wider text-emerald-400">Use</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{screen.rightEn}</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{screen.explanationPt}</p>
        </div>
      );

    case "review":
      return (
        <div className="mx-auto max-w-2xl space-y-4">
          <div>
            <h3 className="text-xl font-bold text-foreground">{screen.titleEn}</h3>
            <p className="text-sm text-muted-foreground">{screen.titlePt}</p>
          </div>
          <ul className="space-y-2">
            {screen.items.map((item) => (
              <li key={item.en} className="flex flex-col gap-0.5 rounded-lg border border-border/50 px-4 py-3 sm:flex-row sm:justify-between">
                <span className="font-semibold text-foreground">{item.en}</span>
                <span className="text-sm text-muted-foreground">{item.pt}</span>
              </li>
            ))}
          </ul>
        </div>
      );

    case "read_repeat":
      return (
        <div className="mx-auto max-w-2xl space-y-4">
          {screen.titleEn ? <h3 className="text-xl font-bold text-foreground">{screen.titleEn}</h3> : null}
          {screen.titlePt ? <p className="text-sm text-muted-foreground">{screen.titlePt}</p> : null}
          {screen.introPt ? <p className="text-sm text-muted-foreground">{screen.introPt}</p> : null}
          <ul className="divide-y divide-border/40 rounded-xl border border-border/60 bg-muted/5">
            {screen.phrases.map((p) => (
              <li key={p.en} className="px-4 py-3 text-lg font-semibold text-foreground">{p.en}</li>
            ))}
          </ul>
          {screen.dialogueEn ? (
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Diálogo completo</p>
              <p className="text-base sm:text-lg font-semibold leading-relaxed text-foreground">{screen.dialogueEn}</p>
            </div>
          ) : null}
        </div>
      );

    case "mission_intro":
      return (
        <div className="mx-auto max-w-2xl space-y-5">
          <div>
            <h3 className="text-2xl font-bold text-foreground">{screen.headlineEn}</h3>
            <p className="text-sm text-muted-foreground">{screen.headlinePt}</p>
            <p className="mt-4 text-base text-muted-foreground">{screen.bodyPt}</p>
          </div>
          <ul className="space-y-2">
            {screen.prompts.map((p) => (
              <li key={p.questionEn} className="rounded-lg border border-border/60 px-4 py-3">
                <span className="text-xs font-semibold uppercase text-muted-foreground">{p.speaker}</span>
                <p className="text-lg font-semibold text-foreground">{p.questionEn}</p>
              </li>
            ))}
          </ul>
        </div>
      );

    default:
      return null;
  }
}

export function isInteractiveMicroScreen(screen: LearningMicroScreen): boolean {
  return screen.type === "dialogue_choice";
}
