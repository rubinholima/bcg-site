"use client";

import { cn } from "@/lib/utils";
import { CAPTACAO_MOBILE_STEPS, type CaptacaoMobileStepId } from "@/lib/captacao-mobile-flow";

export function CaptacaoProgressSteps({
  currentStep,
  className,
}: {
  currentStep: CaptacaoMobileStepId;
  className?: string;
}) {
  const currentIndex = CAPTACAO_MOBILE_STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div
      className={cn(
        "flex gap-1 overflow-x-auto pb-1 md:gap-2 md:overflow-visible md:pb-0 lg:gap-3",
        className,
      )}
    >
      {CAPTACAO_MOBILE_STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <div
            key={step.id}
            className={cn(
              "flex min-w-[4.25rem] flex-1 flex-col items-center gap-1 md:min-w-0",
              index <= currentIndex ? "opacity-100" : "opacity-40",
            )}
          >
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold md:h-8 md:w-8",
                done && "border-emerald-500/50 bg-emerald-500/20 text-emerald-300",
                active && !done && "border-primary bg-primary/20 text-primary",
                !active && !done && "border-border text-muted-foreground",
              )}
            >
              {done ? "✓" : index + 1}
            </div>
            <span className="text-center text-[10px] leading-tight text-muted-foreground md:text-xs lg:text-sm">
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
