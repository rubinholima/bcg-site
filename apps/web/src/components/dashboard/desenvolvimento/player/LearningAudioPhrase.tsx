"use client";

import { Gauge, Headphones, Mic, Turtle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Props = {
  textEn: string;
  audioKey?: string;
  audioUrl?: string;
  size?: "md" | "lg";
  align?: "start" | "end" | "center";
  className?: string;
};

export function LearningAudioPhrase({
  textEn,
  audioKey,
  audioUrl,
  size = "md",
  align = "start",
  className,
}: Props) {
  const hasAudio = Boolean(audioUrl);
  const textClass = size === "lg" ? "text-xl sm:text-2xl font-semibold tracking-tight" : "text-lg font-semibold";

  return (
    <div className={cn("space-y-3", align === "end" && "text-right", align === "center" && "text-center", className)}>
      <p className={cn(textClass, "text-foreground leading-snug")}>{textEn}</p>
      <div
        className={cn(
          "flex flex-wrap gap-2",
          align === "end" && "justify-end",
          align === "center" && "justify-center",
        )}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!hasAudio}
          className="h-9 gap-1.5 min-w-[44px] border-violet-500/30"
          title={hasAudio ? "Ouvir" : "Áudio em breve"}
        >
          <Headphones className="h-4 w-4" />
          Ouvir
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled className="h-9 gap-1.5 min-w-[44px] opacity-50">
          <Turtle className="h-4 w-4" />
          Devagar
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled className="h-9 gap-1.5 min-w-[44px] opacity-50">
          <Gauge className="h-4 w-4" />
          Natural
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled className="h-9 gap-1.5 min-w-[44px] opacity-50">
          <Mic className="h-4 w-4" />
          Repetir
        </Button>
      </div>
      {!hasAudio && audioKey ? (
        <p className="text-[11px] text-muted-foreground/70">Reprodução de áudio disponível em breve.</p>
      ) : null}
    </div>
  );
}
