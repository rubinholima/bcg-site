"use client";

import { Gauge, Headphones, Mic, Turtle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Props = {
  textEn: string;
  audioUrl?: string;
  size?: "md" | "lg";
  align?: "start" | "end" | "center";
  className?: string;
};

export function LearningAudioPhrase({
  textEn,
  audioUrl,
  size = "md",
  align = "start",
  className,
}: Props) {
  const hasAudio = Boolean(audioUrl);
  const textClass =
    size === "lg" ? "text-xl sm:text-2xl font-semibold tracking-tight" : "text-base sm:text-lg font-semibold";

  return (
    <div
      className={cn(
        align === "end" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      <p className={cn(textClass, "text-foreground leading-snug")}>{textEn}</p>
      {hasAudio ? (
        <div
          className={cn(
            "mt-2 flex flex-wrap gap-2",
            align === "end" && "justify-end",
            align === "center" && "justify-center",
          )}
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 min-w-[44px] border-violet-500/30"
            title="Ouvir"
          >
            <Headphones className="h-4 w-4" />
            Ouvir
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-9 gap-1.5 min-w-[44px]">
            <Turtle className="h-4 w-4" />
            Devagar
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-9 gap-1.5 min-w-[44px]">
            <Gauge className="h-4 w-4" />
            Natural
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-9 gap-1.5 min-w-[44px]">
            <Mic className="h-4 w-4" />
            Repetir
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function LearningAudioUnavailableNote({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs text-muted-foreground/80", className)}>
      Prática de escuta ainda não disponível nesta lição — repita em voz alta por enquanto.
    </p>
  );
}

export function playerExperienceHasAudio(player: {
  imitate: { phrases: { audioUrl?: string }[]; dialogueAudioUrl?: string };
}): boolean {
  if (player.imitate.dialogueAudioUrl) return true;
  return player.imitate.phrases.some((p) => Boolean(p.audioUrl));
}
