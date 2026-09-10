"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import type { LearningPracticeInteraction } from "@/lib/learning-player-types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LearningPracticeActivity } from "./LearningPracticeActivity";

function FeedbackBox({ isCorrect, message }: { isCorrect: boolean; message: string }) {
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

function FillBlankInteraction({
  item,
  onComplete,
}: {
  item: Extract<LearningPracticeInteraction, { type: "fill_blank" }>;
  onComplete: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const option = selected !== null ? item.options[selected] : null;
  const isCorrect = option?.correct ?? false;
  const parts = item.templateEn.split("___");

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-foreground">{item.promptPt}</p>
      <p className="text-lg font-semibold text-foreground">
        {parts[0]}
        <span className="mx-1 rounded bg-violet-500/15 px-2 py-0.5 text-violet-300">
          {revealed && option ? option.labelEn : "___"}
        </span>
        {parts[1] ?? ""}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {item.options.map((opt, idx) => (
          <button
            key={idx}
            type="button"
            disabled={revealed}
            onClick={() => setSelected(idx)}
            className={cn(
              "min-h-[44px] rounded-xl border px-4 py-3 text-left font-semibold transition-colors",
              selected === idx && !revealed && "border-violet-500/50 bg-violet-500/10",
              revealed && selected === idx && isCorrect && "border-emerald-500/50 bg-emerald-500/10",
              revealed && selected === idx && !isCorrect && "border-red-500/40 bg-red-500/10",
            )}
          >
            {opt.labelEn}
          </button>
        ))}
      </div>
      {revealed && option ? <FeedbackBox isCorrect={isCorrect} message={option.feedbackPt} /> : null}
      <ActionButtons
        revealed={revealed}
        isCorrect={isCorrect}
        canCheck={selected !== null}
        onCheck={() => setRevealed(true)}
        onComplete={onComplete}
        onRetry={() => {
          setSelected(null);
          setRevealed(false);
        }}
      />
    </div>
  );
}

function ReorderInteraction({
  item,
  onComplete,
}: {
  item: Extract<LearningPracticeInteraction, { type: "reorder" }>;
  onComplete: () => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const isCorrect = revealed && picked.join(" ") === item.correctOrder.join(" ");

  const toggleToken = (token: string) => {
    if (revealed) return;
    setPicked((p) => (p.includes(token) ? p.filter((x) => x !== token) : [...p, token]));
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-foreground">{item.promptPt}</p>
      <div className="min-h-[52px] rounded-xl border border-dashed border-violet-500/30 bg-violet-500/5 px-4 py-3">
        <p className="text-lg font-semibold text-foreground">{picked.join(" ") || "Toque nas palavras na ordem…"}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {item.tokens.map((token, idx) => {
          const inSentence = picked.includes(token);
          return (
            <button
              key={`${token}-${idx}`}
              type="button"
              disabled={revealed}
              onClick={() => toggleToken(token)}
              className={cn(
                "min-h-[44px] rounded-lg border px-3 py-2 text-sm font-semibold transition-colors",
                inSentence ? "border-violet-500/50 bg-violet-500/15 text-foreground" : "border-border/60 text-foreground",
              )}
            >
              {token}
            </button>
          );
        })}
      </div>
      {revealed ? (
        <FeedbackBox
          isCorrect={isCorrect}
          message={isCorrect ? item.feedbackCorrectPt : item.feedbackWrongPt}
        />
      ) : null}
      <ActionButtons
        revealed={revealed}
        isCorrect={isCorrect}
        canCheck={picked.length === item.tokens.length}
        onCheck={() => setRevealed(true)}
        onComplete={onComplete}
        onRetry={() => {
          setPicked([]);
          setRevealed(false);
        }}
      />
    </div>
  );
}

function ClassifyInteraction({
  item,
  onComplete,
}: {
  item: Extract<LearningPracticeInteraction, { type: "classify" }>;
  onComplete: () => void;
}) {
  const [choice, setChoice] = useState<"from" | "live" | null>(null);
  const [revealed, setRevealed] = useState(false);
  const isCorrect = revealed && choice === item.category;

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-foreground">{item.promptPt}</p>
      <p className="text-xl font-bold text-foreground">{item.sentenceEn}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {(["from", "live"] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            disabled={revealed}
            onClick={() => setChoice(cat)}
            className={cn(
              "min-h-[44px] rounded-xl border px-4 py-3 font-semibold uppercase tracking-wide transition-colors",
              choice === cat && !revealed && "border-violet-500/50 bg-violet-500/10",
              revealed && choice === cat && isCorrect && "border-emerald-500/50 bg-emerald-500/10",
              revealed && choice === cat && !isCorrect && "border-red-500/40 bg-red-500/10",
            )}
          >
            {cat === "from" ? "Origin · FROM" : "Home · LIVE IN"}
          </button>
        ))}
      </div>
      {revealed ? (
        <FeedbackBox isCorrect={isCorrect} message={isCorrect ? item.feedbackCorrectPt : item.feedbackWrongPt} />
      ) : null}
      <ActionButtons
        revealed={revealed}
        isCorrect={isCorrect}
        canCheck={choice !== null}
        onCheck={() => setRevealed(true)}
        onComplete={onComplete}
        onRetry={() => {
          setChoice(null);
          setRevealed(false);
        }}
      />
    </div>
  );
}

function DialogueCompleteInteraction({
  item,
  onComplete,
}: {
  item: Extract<LearningPracticeInteraction, { type: "dialogue_complete" }>;
  onComplete: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const option = selected !== null ? item.options[selected] : null;
  const isCorrect = option?.correct ?? false;

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-foreground">{item.promptPt}</p>
      <div className="rounded-xl border border-border/60 bg-muted/10 px-4 py-4">
        <p className="text-xs font-semibold uppercase text-muted-foreground">{item.speaker}</p>
        <p className="mt-1 text-base text-muted-foreground">{item.contextEn}</p>
      </div>
      <div className="grid gap-2">
        {item.options.map((opt, idx) => (
          <button
            key={idx}
            type="button"
            disabled={revealed}
            onClick={() => setSelected(idx)}
            className={cn(
              "min-h-[44px] rounded-xl border px-4 py-3 text-left font-semibold transition-colors",
              selected === idx && !revealed && "border-violet-500/50 bg-violet-500/10",
              revealed && selected === idx && isCorrect && "border-emerald-500/50 bg-emerald-500/10",
              revealed && selected === idx && !isCorrect && "border-red-500/40 bg-red-500/10",
            )}
          >
            {opt.labelEn}
          </button>
        ))}
      </div>
      {revealed && option ? <FeedbackBox isCorrect={isCorrect} message={option.feedbackPt} /> : null}
      <ActionButtons
        revealed={revealed}
        isCorrect={isCorrect}
        canCheck={selected !== null}
        onCheck={() => setRevealed(true)}
        onComplete={onComplete}
        onRetry={() => {
          setSelected(null);
          setRevealed(false);
        }}
      />
    </div>
  );
}

function ActionButtons({
  revealed,
  isCorrect,
  canCheck,
  onCheck,
  onComplete,
  onRetry,
}: {
  revealed: boolean;
  isCorrect: boolean;
  canCheck: boolean;
  onCheck: () => void;
  onComplete: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {!revealed ? (
        <Button type="button" disabled={!canCheck} onClick={onCheck} className="min-h-[44px]">
          Verificar
        </Button>
      ) : isCorrect ? (
        <Button type="button" variant="outline" onClick={onComplete} className="min-h-[44px]">
          Continuar
        </Button>
      ) : (
        <Button type="button" variant="outline" onClick={onRetry} className="min-h-[44px]">
          Tentar de novo
        </Button>
      )}
    </div>
  );
}

export function LearningPracticeInteractionView({
  item,
  onComplete,
}: {
  item: LearningPracticeInteraction;
  onComplete: () => void;
}) {
  switch (item.type) {
    case "choice":
      return <LearningPracticeActivity item={item} onComplete={onComplete} />;
    case "fill_blank":
      return <FillBlankInteraction item={item} onComplete={onComplete} />;
    case "reorder":
      return <ReorderInteraction item={item} onComplete={onComplete} />;
    case "classify":
      return <ClassifyInteraction item={item} onComplete={onComplete} />;
    case "dialogue_complete":
      return <DialogueCompleteInteraction item={item} onComplete={onComplete} />;
    default:
      return null;
  }
}
