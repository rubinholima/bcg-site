"use client";

import type { LearningPhraseItem } from "@/lib/learning-player-types";
import { cn } from "@/lib/utils";

export function LearningPhraseCard({ phrase, className }: { phrase: LearningPhraseItem; className?: string }) {
  return (
    <article
      className={cn(
        "rounded-xl border border-border/60 bg-gradient-to-br from-card to-muted/10 p-4 sm:p-5",
        className,
      )}
    >
      <p className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">{phrase.en}</p>
      <p className="mt-2 text-sm text-muted-foreground">{phrase.pt}</p>
      {phrase.note ? <p className="mt-2 text-xs text-muted-foreground/80">{phrase.note}</p> : null}
    </article>
  );
}

export function LearningLanguageTip({ text }: { text: string }) {
  return (
    <aside className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-amber-500/90">Language Tip</p>
      <p className="mt-1.5 text-sm text-foreground/90">{text}</p>
    </aside>
  );
}
