"use client";

import { cn } from "@/lib/utils";
import type { LearningDialogueLine } from "@/lib/learning-player-types";
import { LearningAudioPhrase } from "./LearningAudioPhrase";

export function LearningDialogue({
  lines,
  className,
}: {
  lines: LearningDialogueLine[];
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {lines.map((line, i) => {
        const isLeft = i % 2 === 0;
        return (
          <div
            key={`${line.speaker}-${i}`}
            className={cn("flex flex-col gap-1", isLeft ? "items-start" : "items-end")}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
              {line.speaker}
            </span>
            <div
              className={cn(
                "max-w-[92%] rounded-2xl border px-4 py-3 sm:max-w-[85%]",
                isLeft
                  ? "rounded-tl-sm border-violet-500/25 bg-violet-500/10"
                  : "rounded-tr-sm border-border/60 bg-card",
              )}
            >
              <LearningAudioPhrase
                textEn={line.textEn}
                audioKey={line.audioKey}
                size="lg"
                align={isLeft ? "start" : "end"}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
