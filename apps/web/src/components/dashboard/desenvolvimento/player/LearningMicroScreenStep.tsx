"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { LearningMicroScreen } from "@/lib/learning-player-types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isInteractiveMicroScreen, LearningMicroScreenView } from "./LearningMicroScreenView";

export function LearningMicroScreenStep({
  screens,
  onComplete,
}: {
  screens: LearningMicroScreen[];
  onComplete: () => void;
}) {
  const [screenIndex, setScreenIndex] = useState(0);
  const [interactiveDone, setInteractiveDone] = useState<Record<string, boolean>>({});

  const screen = screens[screenIndex];
  const isLast = screenIndex >= screens.length - 1;
  const progressPct = Math.round(((screenIndex + 1) / screens.length) * 100);

  const canAdvanceMicro = useMemo(() => {
    if (!screen) return false;
    if (isInteractiveMicroScreen(screen)) return Boolean(interactiveDone[screen.id]);
    return true;
  }, [screen, interactiveDone]);

  const goNext = useCallback(() => {
    if (!canAdvanceMicro) return;
    if (isLast) {
      onComplete();
      return;
    }
    setScreenIndex((i) => i + 1);
  }, [canAdvanceMicro, isLast, onComplete]);

  const goPrev = () => setScreenIndex((i) => Math.max(0, i - 1));

  if (!screen) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          Tela {screenIndex + 1} de {screens.length}
        </span>
        <span>{progressPct}%</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-muted/40">
        <div className="h-full rounded-full bg-violet-500/80 transition-all" style={{ width: `${progressPct}%` }} />
      </div>

      <LearningMicroScreenView
        key={screen.id}
        screen={screen}
        onInteractiveResolved={() => setInteractiveDone((s) => ({ ...s, [screen.id]: true }))}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={screenIndex === 0}
          onClick={goPrev}
          className="min-h-[44px]"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!canAdvanceMicro}
          onClick={goNext}
          className={cn("min-h-[44px]", !canAdvanceMicro && "opacity-50")}
        >
          {isLast ? "Concluir etapa" : "Continuar"}
          {!isLast ? <ChevronRight className="h-4 w-4" /> : null}
        </Button>
      </div>
    </div>
  );
}
