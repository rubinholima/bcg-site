"use client";

import { cn } from "@/lib/utils";
import type { LearningDialogueLine } from "@/lib/learning-player-types";

export function LearningDialogue({
  lines,
  className,
}: {
  lines: LearningDialogueLine[];
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)} role="list">
      {lines.map((line, i) => {
        const isRight = i % 2 === 1;
        return (
          <div
            key={`${line.speaker}-${i}`}
            role="listitem"
            className={cn("flex gap-2", isRight ? "flex-row-reverse" : "flex-row")}
          >
            <span
              className={cn(
                "w-14 shrink-0 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
                isRight && "text-right",
              )}
            >
              {line.speaker}
            </span>
            <div
              className={cn(
                "min-w-0 max-w-[88%] rounded-lg border px-3 py-2 sm:max-w-[78%]",
                isRight
                  ? "rounded-tr-sm border-border/50 bg-muted/20"
                  : "rounded-tl-sm border-violet-500/20 bg-violet-500/8",
              )}
            >
              <p className="text-base sm:text-lg font-semibold leading-snug text-foreground">{line.textEn}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
